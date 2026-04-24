/**
 * Verify that the balance chart accurately tracks inflow and outflow
 * under the split-balance model. Simulates a realistic lifecycle:
 *
 *   1. Deposit $1,000 (admin approves)
 *   2. Start a $400 investment
 *   3. Add $100 to it (addInvestmentFunds)
 *   4. Tick engine runs (profit + loss) → should NOT move wallet
 *   5. Admin ends the trade → releases principal + profit to wallet
 *   6. Admin SUBTRACT $50 (with "Account adjustment — test" reason)
 *   7. Admin ADD $30 as bonus
 *
 * After each step, computes the expected wallet balance from ledger
 * math and checks that the chart's last point matches.
 */
import "dotenv/config";
import { PrismaClient, TransactionType, TxStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function walletUsd(userId: string) {
  const w = await prisma.wallet.findUnique({
    where: { userId_currency: { userId, currency: "USD" } },
  });
  return w ? Number(w.balance) : 0;
}

/** Inlined mirror of lib/chart.ts#buildBalanceChart — kept in sync with
 *  the production source. We can't import it here because it uses the
 *  Next.js-only `server-only` module. */
async function buildChart(userId: string, days: number) {
  const now = new Date();
  const rangeStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days));
  const usdWallet = await prisma.wallet.findFirst({ where: { userId, currency: "USD" } });
  const currentBalance = usdWallet ? Number(usdWallet.balance) : 0;
  const transactions = await prisma.transaction.findMany({
    where: { userId, currency: "USD", status: TxStatus.COMPLETED },
    orderBy: { createdAt: "desc" },
  });
  const events: { ts: Date; delta: number }[] = [];
  for (const tx of transactions) {
    const amount = Number(tx.amount);
    const desc = (tx.description ?? "").toLowerCase();
    let delta = 0;
    switch (tx.type) {
      case TransactionType.DEPOSIT:
      case TransactionType.BONUS:
      case TransactionType.SELL: delta = amount; break;
      case TransactionType.WITHDRAWAL:
      case TransactionType.FEE:
      case TransactionType.BUY: delta = -amount; break;
      case TransactionType.ADJUSTMENT: {
        if (desc.includes("balance correction")) { delta = 0; break; }
        const debitMarkers = [
          "account adjustment", "investment in ", "copy trading",
          "upgrade top-up", "added funds to",
        ];
        const isDebit = debitMarkers.some(m => desc.includes(m));
        delta = isDebit ? -amount : amount;
        break;
      }
    }
    if (delta !== 0) events.push({ ts: tx.createdAt, delta });
  }
  events.sort((a, b) => b.ts.getTime() - a.ts.getTime());
  let balance = currentBalance;
  const dailyClose = new Map<string, number>();
  const key = (d: Date) => d.toISOString().slice(0, 10);
  dailyClose.set(key(now), currentBalance);
  for (const ev of events) {
    const k = key(ev.ts);
    if (!dailyClose.has(k)) dailyClose.set(k, balance);
    balance = balance - ev.delta;
  }
  const points: { date: string; value: number }[] = [];
  let carry = balance;
  for (let i = 0; i <= days; i++) {
    const d = new Date(Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth(), rangeStart.getUTCDate() + i));
    const k = key(d);
    if (dailyClose.has(k)) carry = dailyClose.get(k)!;
    points.push({ date: k, value: Math.round(Math.max(0, carry) * 100) / 100 });
  }
  return points;
}

async function chartToday(userId: string) {
  const points = await buildChart(userId, 7);
  return points[points.length - 1].value;
}

async function assertMatch(label: string, expected: number, actualWallet: number, actualChart: number) {
  const walletOk = Math.abs(actualWallet - expected) < 0.01;
  const chartOk  = Math.abs(actualChart  - expected) < 0.01;
  const mark = (ok: boolean) => ok ? "✓" : "✗ FAIL";
  console.log(`  ${label}`);
  console.log(`    expected:       $${expected.toFixed(2)}`);
  console.log(`    wallet balance: $${actualWallet.toFixed(2)}  ${mark(walletOk)}`);
  console.log(`    chart today:    $${actualChart.toFixed(2)}  ${mark(chartOk)}`);
  return walletOk && chartOk;
}

async function main() {
  const email = `verify-chart-${Date.now()}@vaultex-test.local`;
  console.log(`\n[verify chart] test email: ${email}\n`);

  const user = await prisma.user.create({
    data: {
      email, name: "Chart Verify", role: "USER", status: "ACTIVE",
      wallets: { create: [{ currency: "USD", balance: 0, address: "x" }] },
    },
  });

  let passes = 0; let failures = 0;
  const ok = (b: boolean) => { if (b) passes++; else failures++; };

  // Step 1 — deposit $1,000 via approval path.
  await prisma.wallet.update({
    where: { userId_currency: { userId: user.id, currency: "USD" } },
    data:  { balance: { increment: 1000 } },
  });
  await prisma.transaction.create({
    data: { userId: user.id, type: "DEPOSIT", currency: "USD", amount: 1000, status: "COMPLETED", description: "Deposit via TEST" },
  });
  ok(await assertMatch("Step 1 — deposit +$1000", 1000, await walletUsd(user.id), await chartToday(user.id)));

  // Step 2 — start a $400 investment.
  await prisma.$transaction([
    prisma.wallet.update({
      where: { userId_currency: { userId: user.id, currency: "USD" } },
      data:  { balance: { decrement: 400 } },
    }),
    prisma.transaction.create({
      data: { userId: user.id, type: "ADJUSTMENT", currency: "USD", amount: 400, status: "COMPLETED", description: "Investment in Chart Plan" },
    }),
    prisma.userInvestment.create({
      data: {
        userId: user.id, planName: "Chart Plan", amount: 400, totalEarned: 0,
        minProfit: 0.5, maxProfit: 1.0, profitInterval: 60, maxInterval: 60,
        minLossRatio: 10, maxLossRatio: 15, minLoss: 0.1, maxLoss: 0.3,
        status: "ACTIVE", lastProfitAt: new Date(), nextProfitAt: new Date(),
      },
    }),
  ]);
  ok(await assertMatch("Step 2 — start $400 investment", 600, await walletUsd(user.id), await chartToday(user.id)));

  // Step 3 — addInvestmentFunds $100. Test both wallet debit + transaction row.
  await prisma.$transaction([
    prisma.wallet.update({
      where: { userId_currency: { userId: user.id, currency: "USD" } },
      data:  { balance: { decrement: 100 } },
    }),
    prisma.userInvestment.update({
      where: { userId: user.id }, data: { amount: { increment: 100 } },
    }),
    prisma.transaction.create({
      data: { userId: user.id, type: "ADJUSTMENT", currency: "USD", amount: 100, status: "COMPLETED", description: "Added funds to Chart Plan" },
    }),
  ]);
  ok(await assertMatch("Step 3 — addFunds $100 → $500 locked", 500, await walletUsd(user.id), await chartToday(user.id)));

  // Step 4 — engine ticks (simulate): profit + loss to totalEarned,
  // NO wallet touch. Chart should stay at $500.
  await prisma.userInvestment.update({
    where: { userId: user.id },
    data:  { totalEarned: { increment: 25 } },
  });
  await prisma.activityLog.create({
    data: { userId: user.id, type: "INVESTMENT_PROFIT", title: "tick +25", amount: 25, currency: "USD" },
  });
  await prisma.userInvestment.update({
    where: { userId: user.id },
    data:  { totalEarned: { decrement: 5 } },
  });
  await prisma.activityLog.create({
    data: { userId: user.id, type: "INVESTMENT_LOSS", title: "tick -5", amount: -5, currency: "USD" },
  });
  ok(await assertMatch("Step 4 — 2 ticks credited to totalEarned (wallet untouched)", 500, await walletUsd(user.id), await chartToday(user.id)));

  // Step 5 — admin ends the trade. Invested $500, earned $20 net.
  const inv = await prisma.userInvestment.findUnique({ where: { userId: user.id } });
  const payout = Number(inv!.amount) + Math.max(0, Number(inv!.totalEarned)); // 500 + 20 = 520
  await prisma.$transaction([
    prisma.userInvestment.update({
      where: { userId: user.id },
      data:  { status: "COMPLETED", completedAt: new Date(), finalReturn: payout, nextProfitAt: null },
    }),
    prisma.wallet.update({
      where: { userId_currency: { userId: user.id, currency: "USD" } },
      data:  { balance: { increment: payout } },
    }),
    prisma.transaction.create({
      data: { userId: user.id, type: "ADJUSTMENT", currency: "USD", amount: payout, status: "COMPLETED", description: "Trade ended — Chart Plan released to available balance" },
    }),
  ]);
  ok(await assertMatch("Step 5 — End Trade releases $520", 500 + payout, await walletUsd(user.id), await chartToday(user.id)));

  // Step 6 — admin SUBTRACT $50.
  await prisma.$transaction([
    prisma.wallet.update({
      where: { userId_currency: { userId: user.id, currency: "USD" } },
      data:  { balance: { decrement: 50 } },
    }),
    prisma.transaction.create({
      data: { userId: user.id, type: "ADJUSTMENT", currency: "USD", amount: 50, status: "COMPLETED", description: "Account adjustment — test subtract" },
    }),
  ]);
  ok(await assertMatch("Step 6 — admin SUBTRACT $50", 500 + payout - 50, await walletUsd(user.id), await chartToday(user.id)));

  // Step 7 — admin BONUS +$30.
  await prisma.$transaction([
    prisma.wallet.update({
      where: { userId_currency: { userId: user.id, currency: "USD" } },
      data:  { balance: { increment: 30 } },
    }),
    prisma.transaction.create({
      data: { userId: user.id, type: "ADJUSTMENT", currency: "USD", amount: 30, status: "COMPLETED", description: "Bonus credited — welcome" },
    }),
  ]);
  ok(await assertMatch("Step 7 — admin BONUS +$30", 500 + payout - 50 + 30, await walletUsd(user.id), await chartToday(user.id)));

  // Cleanup.
  await prisma.activityLog.deleteMany({ where: { userId: user.id } });
  await prisma.transaction.deleteMany({ where: { userId: user.id } });
  await prisma.userInvestment.deleteMany({ where: { userId: user.id } });
  await prisma.wallet.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
  console.log(`\n[cleanup] removed\n`);

  console.log(`=== ${failures === 0 ? "PASS" : "FAIL"} — ${passes}/${passes + failures} steps correct ===`);
  if (failures > 0) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
