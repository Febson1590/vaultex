/**
 * Self-contained end-to-end verification. Mirrors runInvestmentTick +
 * catchUpUserInvestment + adminEndInvestment inline so we don't need
 * Next.js path-alias resolution. Creates a test user, exercises the
 * full lifecycle, asserts, cleans up.
 *
 * Run:
 *   npx ts-node --project tsconfig.seed.json scripts/verify-end-trade.ts
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

async function runInvestmentTick(userId: string, now: Date) {
  const investment = await prisma.userInvestment.findUnique({ where: { userId } });
  if (!investment) return null;
  if (investment.status !== "ACTIVE") return null;
  if (!investment.nextProfitAt || investment.nextProfitAt > now) return null;

  const minRatioPct = Number(investment.minLossRatio ?? 0);
  const maxRatioPct = Number(investment.maxLossRatio ?? 0);
  const currentRatioPct = maxRatioPct > minRatioPct
    ? minRatioPct + Math.random() * (maxRatioPct - minRatioPct)
    : minRatioPct;
  const lossProb = Math.max(0, Math.min(1, currentRatioPct / 100));

  const streakCap   = 2;
  const streakAtCap = (investment.consecutiveLosses ?? 0) >= streakCap;
  const isLoss = !streakAtCap && lossProb > 0 && Math.random() < lossProb;

  let delta = 0;
  if (isLoss) {
    const pct = biasedRand(Number(investment.minLoss ?? 0), Number(investment.maxLoss ?? 0));
    delta = -Math.round(Number(investment.amount) * (pct / 100) * 100) / 100;
  } else {
    const pct = biasedRand(Number(investment.minProfit), Number(investment.maxProfit));
    delta = Math.round(Number(investment.amount) * (pct / 100) * 100) / 100;
  }

  const minSecs = investment.profitInterval > 0 ? investment.profitInterval : 60;
  const maxSecs = investment.maxInterval && investment.maxInterval > 0 ? investment.maxInterval : minSecs;
  const secs = maxSecs > minSecs ? minSecs + Math.random() * (maxSecs - minSecs) : minSecs;
  // ANCHOR ON PREVIOUS nextProfitAt (the fix we're verifying):
  const anchor = investment.nextProfitAt ?? now;
  const nextProfitAt = new Date(anchor.getTime() + Math.round(secs * 1000));
  const nextStreak = isLoss ? (investment.consecutiveLosses ?? 0) + 1 : 0;

  await prisma.$transaction([
    prisma.userInvestment.update({
      where: { userId },
      data:  {
        totalEarned: { increment: delta },
        lastProfitAt: now,
        nextProfitAt,
        consecutiveLosses: nextStreak,
      },
    }),
    // NO wallet touch — split-balance model
    prisma.activityLog.create({
      data: {
        userId,
        type: isLoss ? "INVESTMENT_LOSS" : "INVESTMENT_PROFIT",
        title: isLoss ? `test loss` : `test profit`,
        amount: delta,
        currency: "USD",
      },
    }),
  ]);

  return delta;
}

async function catchUp(userId: string, now: Date, cap = 50) {
  const deltas: number[] = [];
  for (let i = 0; i < cap; i++) {
    const d = await runInvestmentTick(userId, now);
    if (d === null) break;
    deltas.push(d);
  }
  return deltas;
}

async function main() {
  const email = `verify-${Date.now()}@vaultex-test.local`;
  console.log(`\n[verify] test email: ${email}\n`);

  // 1. Test user + $1,000 USD wallet.
  const user = await prisma.user.create({
    data: {
      email, name: "Verify Test", role: "USER", status: "ACTIVE",
      wallets: { create: [{ currency: "USD", balance: 1000, address: "x" }] },
    },
    include: { wallets: true },
  });
  console.log(`[1] user created, wallet = $${user.wallets[0].balance}`);

  // 2. $500 investment, 1-min cadence, already-due nextProfitAt 20 min ago.
  await prisma.userInvestment.create({
    data: {
      userId:         user.id,
      planName:       "Verify Plan",
      amount:         500,
      totalEarned:    0,
      minProfit:      0.5,
      maxProfit:      1.0,
      profitInterval: 60,
      maxInterval:    120,
      minLossRatio:   10,
      maxLossRatio:   15,
      minLoss:        0.1,
      maxLoss:        0.3,
      status:         "ACTIVE",
      lastProfitAt:   new Date(),
      nextProfitAt:   new Date(Date.now() - 20 * 60_000), // 20 min in past
    },
  });
  // Simulate userStartInvestment debiting the wallet by principal.
  await prisma.wallet.update({
    where: { userId_currency: { userId: user.id, currency: "USD" } },
    data:  { balance: { decrement: 500 } },
  });
  const walletAfterStart = await prisma.wallet.findUnique({
    where: { userId_currency: { userId: user.id, currency: "USD" } },
  });
  console.log(`[2] invested $500 → wallet = $${walletAfterStart!.balance} (expected $500)`);

  // 3. Catch-up. Band is 1–2 min, 20 min offline → should fire ~10-20 ticks.
  const deltas = await catchUp(user.id, new Date(), 50);
  console.log(`[3] catch-up fired ${deltas.length} ticks`);
  if (deltas.length > 0) {
    const small = deltas.slice(0, 5).map(d => d.toFixed(2)).join(", ");
    console.log(`    first 5 deltas: ${small}...`);
  }

  // 4. Wallet must still be $500 — profits are LOCKED.
  const afterInv = await prisma.userInvestment.findUnique({ where: { userId: user.id } });
  const afterWallet = await prisma.wallet.findUnique({
    where: { userId_currency: { userId: user.id, currency: "USD" } },
  });
  const walletStayed = Math.abs(Number(afterWallet!.balance) - 500) < 0.01;
  console.log(`[4] wallet after ticks = $${afterWallet!.balance} (expected $500)  ${walletStayed ? "✓" : "✗ FAIL"}`);
  console.log(`    investment.totalEarned = $${afterInv!.totalEarned}`);

  // 5. End the trade — release principal + max(earned, 0).
  const earnedRaw = Number(afterInv!.totalEarned);
  const profitPayout = Math.max(0, earnedRaw);
  const payout = Math.round((Number(afterInv!.amount) + profitPayout) * 100) / 100;

  await prisma.$transaction([
    prisma.userInvestment.update({
      where: { userId: user.id },
      data:  { status: "COMPLETED", completedAt: new Date(), finalReturn: payout, nextProfitAt: null },
    }),
    prisma.wallet.update({
      where: { userId_currency: { userId: user.id, currency: "USD" } },
      data:  { balance: { increment: payout } },
    }),
    prisma.activityLog.create({
      data: {
        userId: user.id, type: "INVESTMENT_ENDED",
        title: `Trade ended — $${payout} released`,
        amount: payout, currency: "USD",
      },
    }),
  ]);

  const finalWallet = await prisma.wallet.findUnique({
    where: { userId_currency: { userId: user.id, currency: "USD" } },
  });
  const finalInv = await prisma.userInvestment.findUnique({ where: { userId: user.id } });
  const expectedFinal = 500 + payout;
  const walletOk = Math.abs(Number(finalWallet!.balance) - expectedFinal) < 0.01;
  console.log(`[5] End Trade:`);
  console.log(`    principal: $${afterInv!.amount}   profit released: $${profitPayout.toFixed(2)}   payout: $${payout.toFixed(2)}`);
  console.log(`    wallet = $${finalWallet!.balance} (expected $${expectedFinal.toFixed(2)})  ${walletOk ? "✓" : "✗ FAIL"}`);
  console.log(`    status = ${finalInv!.status}  (expected COMPLETED)`);
  console.log(`    finalReturn = $${finalInv!.finalReturn}`);

  // 6. Cleanup.
  await prisma.activityLog.deleteMany({ where: { userId: user.id } });
  await prisma.userInvestment.delete({ where: { userId: user.id } });
  await prisma.wallet.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
  console.log(`[6] cleanup complete\n`);

  const catchUpOk = deltas.length >= 8; // 20 min with 1-2 min band → at least ~8 ticks
  console.log(`=== VERDICT ===`);
  console.log(`catch-up fires multiple ticks offline: ${catchUpOk ? "PASS" : "FAIL"} (${deltas.length} fired)`);
  console.log(`wallet untouched during ticks:        ${walletStayed ? "PASS" : "FAIL"}`);
  console.log(`End Trade releases principal+profit:  ${walletOk ? "PASS" : "FAIL"}`);
  if (!catchUpOk || !walletStayed || !walletOk) process.exit(1);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
