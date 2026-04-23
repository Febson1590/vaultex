/**
 * End-to-end verification of the copy-trade split-balance + End Trade
 * flow. Mirrors what happens in production:
 *
 *   1. User deposits $1,000
 *   2. User starts copying a trader with $500
 *   3. Tick engine runs (catch-up) — profits should NOT land in wallet
 *   4. Admin ends the copy trade — principal + max(profit, 0) released
 *   5. Transaction history should contain a row for the release
 *
 * Cleans up after itself.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function biasedRand(min: number, max: number) {
  if (max <= min) return min;
  const t = Math.random() * Math.random();
  return min + t * (max - min);
}

// Mirrors lib/engine/investment-tick.ts#runCopyTradeTick.
async function runCopyTradeTick(tradeId: string, now: Date) {
  const trade = await prisma.userCopyTrade.findUnique({ where: { id: tradeId } });
  if (!trade) return null;
  if (trade.status !== "ACTIVE") return null;
  if (!trade.nextProfitAt || trade.nextProfitAt > now) return null;

  const minRatioPct = Number(trade.minLossRatio ?? 0);
  const maxRatioPct = Number(trade.maxLossRatio ?? 0);
  const currentRatioPct = maxRatioPct > minRatioPct
    ? minRatioPct + Math.random() * (maxRatioPct - minRatioPct)
    : minRatioPct;
  const lossProb = Math.max(0, Math.min(1, currentRatioPct / 100));

  const streakCap = 2;
  const streakAtCap = (trade.consecutiveLosses ?? 0) >= streakCap;
  const isLoss = !streakAtCap && lossProb > 0 && Math.random() < lossProb;

  let delta = 0;
  if (isLoss) {
    const pct = biasedRand(Number(trade.minLoss ?? 0), Number(trade.maxLoss ?? 0));
    delta = -Math.round(Number(trade.amount) * (pct / 100) * 100) / 100;
  } else {
    const pct = biasedRand(Number(trade.minProfit), Number(trade.maxProfit));
    delta = Math.round(Number(trade.amount) * (pct / 100) * 100) / 100;
  }

  const minSecs = trade.profitInterval > 0 ? trade.profitInterval : 60;
  const maxSecs = trade.maxInterval && trade.maxInterval > 0 ? trade.maxInterval : minSecs;
  const secs = maxSecs > minSecs ? minSecs + Math.random() * (maxSecs - minSecs) : minSecs;
  const anchor = trade.nextProfitAt ?? now;
  const nextProfitAt = new Date(anchor.getTime() + Math.round(secs * 1000));
  const nextStreak = isLoss ? (trade.consecutiveLosses ?? 0) + 1 : 0;

  await prisma.$transaction([
    prisma.userCopyTrade.update({
      where: { id: tradeId },
      data:  {
        totalEarned: { increment: delta },
        lastProfitAt: now,
        nextProfitAt,
        consecutiveLosses: nextStreak,
      },
    }),
    // NO wallet touch — profits locked in totalEarned until admin ends.
    prisma.activityLog.create({
      data: {
        userId: trade.userId,
        type:   isLoss ? "COPY_TRADE_LOSS" : "COPY_TRADE_PROFIT",
        title:  isLoss ? "test loss" : "test profit",
        amount: delta,
        currency: "USD",
      },
    }),
  ]);

  return delta;
}

async function main() {
  const email = `verify-copy-${Date.now()}@vaultex-test.local`;
  console.log(`\n[verify] test email: ${email}\n`);

  // Need a trader to copy.
  const trader = await prisma.copyTrader.create({
    data: {
      name: "Verify Trader",
      winRate: 80, totalROI: 50, performance30d: 10,
      riskLevel: "MEDIUM", followers: 100,
      minCopyAmount: 50, maxCopyAmount: null,
      profitInterval: 60, maxInterval: 120,
      minProfit: 0.5, maxProfit: 1.2,
      minLossRatio: 10, maxLossRatio: 15,
      minLoss: 0.1, maxLoss: 0.3,
      isActive: true, isSeeded: false,
    },
  });

  const user = await prisma.user.create({
    data: {
      email, name: "Copy Verify", role: "USER", status: "ACTIVE",
      wallets: { create: [{ currency: "USD", balance: 1000, address: "x" }] },
    },
    include: { wallets: true },
  });
  console.log(`[1] user created, wallet = $${user.wallets[0].balance}`);

  // Start the copy trade with $500, backdate nextProfitAt 20 min to simulate offline.
  const copyTrade = await prisma.userCopyTrade.create({
    data: {
      userId:   user.id,
      traderId: trader.id,
      traderName: trader.name,
      amount: 500,
      totalEarned: 0,
      minProfit: 0.5, maxProfit: 1.2,
      profitInterval: 60, maxInterval: 120,
      minLossRatio: 10, maxLossRatio: 15,
      minLoss: 0.1, maxLoss: 0.3,
      status: "ACTIVE",
      lastProfitAt: new Date(),
      nextProfitAt: new Date(Date.now() - 20 * 60_000),
    },
  });
  await prisma.wallet.update({
    where: { userId_currency: { userId: user.id, currency: "USD" } },
    data:  { balance: { decrement: 500 } },
  });
  console.log(`[2] copy-trading $500 → wallet = $500`);

  // Run catch-up.
  const now = new Date();
  let deltas: number[] = [];
  for (let i = 0; i < 50; i++) {
    const d = await runCopyTradeTick(copyTrade.id, now);
    if (d === null) break;
    deltas.push(d);
  }
  console.log(`[3] catch-up fired ${deltas.length} ticks`);

  const afterTicks = await prisma.userCopyTrade.findUnique({ where: { id: copyTrade.id } });
  const afterWallet = await prisma.wallet.findUnique({
    where: { userId_currency: { userId: user.id, currency: "USD" } },
  });
  const walletStayed = Math.abs(Number(afterWallet!.balance) - 500) < 0.01;
  console.log(`[4] wallet after ticks = $${afterWallet!.balance} (expected $500) ${walletStayed ? "✓" : "✗ FAIL"}`);
  console.log(`    totalEarned = $${afterTicks!.totalEarned}`);

  // Simulate adminEndCopyTrade.
  const principal = Number(afterTicks!.amount);
  const earnedRaw = Number(afterTicks!.totalEarned);
  const profitPayout = Math.max(0, earnedRaw);
  const payout = Math.round((principal + profitPayout) * 100) / 100;

  await prisma.$transaction([
    prisma.userCopyTrade.update({
      where: { id: copyTrade.id },
      data:  { status: "STOPPED", completedAt: new Date(), finalReturn: payout, nextProfitAt: null },
    }),
    prisma.wallet.update({
      where: { userId_currency: { userId: user.id, currency: "USD" } },
      data:  { balance: { increment: payout } },
    }),
    prisma.transaction.create({
      data: {
        userId: user.id, type: "ADJUSTMENT", currency: "USD", amount: payout,
        description: `Copy trade ended — ${trader.name} released to available balance`,
      },
    }),
    prisma.activityLog.create({
      data: {
        userId: user.id, type: "COPY_TRADE_ENDED",
        title: `Copy trade ended — $${payout} released to your balance`,
        amount: payout, currency: "USD",
      },
    }),
  ]);

  const finalWallet = await prisma.wallet.findUnique({
    where: { userId_currency: { userId: user.id, currency: "USD" } },
  });
  const finalTrade = await prisma.userCopyTrade.findUnique({ where: { id: copyTrade.id } });
  const txs = await prisma.transaction.findMany({
    where: { userId: user.id, description: { contains: "Copy trade ended" } },
  });

  const expectedFinal = 500 + payout;
  const walletOk = Math.abs(Number(finalWallet!.balance) - expectedFinal) < 0.01;
  const txOk = txs.length === 1 && Number(txs[0].amount) === payout;

  console.log(`[5] End Trade:`);
  console.log(`    principal: $${principal}  profit: $${profitPayout.toFixed(2)}  payout: $${payout.toFixed(2)}`);
  console.log(`    wallet = $${finalWallet!.balance} (expected $${expectedFinal.toFixed(2)}) ${walletOk ? "✓" : "✗ FAIL"}`);
  console.log(`    status = ${finalTrade!.status}  finalReturn = $${finalTrade!.finalReturn}`);
  console.log(`    transaction row created: ${txs.length} (expected 1) ${txOk ? "✓" : "✗ FAIL"}`);

  // Cleanup.
  await prisma.activityLog.deleteMany({ where: { userId: user.id } });
  await prisma.transaction.deleteMany({ where: { userId: user.id } });
  await prisma.userCopyTrade.delete({ where: { id: copyTrade.id } });
  await prisma.wallet.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
  await prisma.copyTrader.delete({ where: { id: trader.id } });
  console.log(`[6] cleanup done\n`);

  console.log(`=== VERDICT ===`);
  console.log(`catch-up fires multiple ticks:        ${deltas.length >= 8 ? "PASS" : "FAIL"} (${deltas.length} fired)`);
  console.log(`wallet untouched during ticks:        ${walletStayed ? "PASS" : "FAIL"}`);
  console.log(`End Trade releases principal+profit:  ${walletOk ? "PASS" : "FAIL"}`);
  console.log(`Transaction row created:              ${txOk ? "PASS" : "FAIL"}`);
  if (!walletStayed || !walletOk || !txOk) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
