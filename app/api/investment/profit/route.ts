import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

// Called by client every 15s — credits profit for due investments + copy trades
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const now = new Date();
  const credited: { type: string; amount: number; label: string }[] = [];

  // ── Active investment ───────────────────────────────────────────────────────────────────
  const investment = await db.userInvestment.findUnique({ where: { userId } });

  if (investment && investment.status === "ACTIVE" && investment.nextProfitAt && investment.nextProfitAt <= now) {
    // ── 1. Pick this tick's loss probability from the configured band.
    //     minLossRatio / maxLossRatio are percents (0–100). Convert to a
    //     probability in [0, 1] after picking the band value.
    const minRatioPct = Number(investment.minLossRatio ?? 0);
    const maxRatioPct = Number(investment.maxLossRatio ?? 0);
    const currentRatioPct = maxRatioPct > minRatioPct
      ? minRatioPct + Math.random() * (maxRatioPct - minRatioPct)
      : minRatioPct;
    const lossProbability = Math.max(0, Math.min(1, currentRatioPct / 100));

    // ── 2. Streak guard — after 2 consecutive losses, force a profit.
    const streakCap = 2;
    const streakAtCap = (investment.consecutiveLosses ?? 0) >= streakCap;
    const isLoss = !streakAtCap && lossProbability > 0 && Math.random() < lossProbability;

    // ── 3. Compute delta + the exact percent applied, for history.
    let delta:         number;
    let percentUsed:   number;   // signed % — negative for loss, positive for profit
    let activityType:  "INVESTMENT_PROFIT" | "INVESTMENT_LOSS";
    let activityTitle: string;

    if (isLoss) {
      const minL = Number(investment.minLoss ?? 0);
      const maxL = Number(investment.maxLoss ?? 0);
      const pct  = minL + Math.random() * (maxL - minL);
      const loss = Number(investment.amount) * (pct / 100);
      delta         = -(Math.round(loss * 100) / 100);
      percentUsed   = -Math.round(pct * 10000) / 10000;
      activityType  = "INVESTMENT_LOSS";
      activityTitle = `${investment.planName} loss (${pct.toFixed(2)}%)`;
    } else {
      const minP   = Number(investment.minProfit);
      const maxP   = Number(investment.maxProfit);
      const pct    = minP + Math.random() * (maxP - minP);
      const profit = Number(investment.amount) * (pct / 100);
      delta         = Math.round(profit * 100) / 100;
      percentUsed   = Math.round(pct * 10000) / 10000;
      activityType  = "INVESTMENT_PROFIT";
      activityTitle = `${investment.planName} profit (${pct.toFixed(2)}%)`;
    }

    // ── 4. Schedule the next tick from the hour band on the investment.
    //     Each tick picks an independently random wait so the sequence is
    //     never a fixed cadence. If the band is missing (shouldn't happen —
    //     admin validation + seed backfill ensure it's populated), use a
    //     safe 1–3 hour default rather than slipping into seconds.
    const minHours = investment.minDurationHours ?? 1;
    const maxHours = investment.maxDurationHours ?? Math.max(3, minHours);
    const hours = maxHours > minHours
      ? minHours + Math.random() * (maxHours - minHours)
      : minHours;
    const nextDelayMs = Math.round(hours * 3600 * 1000);
    const nextProfitAt = new Date(now.getTime() + nextDelayMs);

    // ── 5. Persist atomically. Update the streak counter so the guard
    //     stays accurate across ticks.
    const nextStreak = isLoss ? (investment.consecutiveLosses ?? 0) + 1 : 0;

    await db.$transaction([
      db.userInvestment.update({
        where: { userId },
        data:  {
          totalEarned:       { increment: delta },
          lastProfitAt:      now,
          nextProfitAt,
          consecutiveLosses: nextStreak,
        },
      }),
      db.wallet.updateMany({
        where: { userId, currency: "USD" },
        data:  { balance: { increment: delta } },
      }),
      db.activityLog.create({
        data: {
          userId,
          type:     activityType,
          title:    activityTitle,
          amount:   delta,
          percent:  percentUsed,
          currency: "USD",
        },
      }),
    ]);

    credited.push({ type: "investment", amount: delta, label: investment.planName });
  }

  // ── Active copy trades ───────────────────────────────────────────────────────────────
  const copyTrades = await db.userCopyTrade.findMany({ where: { userId, status: "ACTIVE" } });

  for (const trade of copyTrades) {
    if (!trade.nextProfitAt || trade.nextProfitAt > now) continue;

    const min = Number(trade.minProfit) / 100;
    const max = Number(trade.maxProfit) / 100;
    const rate = min + Math.random() * (max - min);
    const profit = Number(trade.amount) * rate;
    const roundedProfit = Math.round(profit * 100) / 100;

    // Random next interval between profitInterval (min) and maxInterval (max)
    const minSecs = trade.profitInterval;
    const maxSecs = trade.maxInterval ?? trade.profitInterval;
    const intervalSecs = minSecs + Math.floor(Math.random() * (maxSecs - minSecs + 1));
    const nextProfitAt = new Date(now.getTime() + intervalSecs * 1000);

    await db.$transaction([
      db.userCopyTrade.update({
        where: { id: trade.id },
        data: { totalEarned: { increment: roundedProfit }, lastProfitAt: now, nextProfitAt },
      }),
      db.wallet.updateMany({
        where: { userId, currency: "USD" },
        data: { balance: { increment: roundedProfit } },
      }),
      db.activityLog.create({
        data: { userId, type: "COPY_TRADE_PROFIT", title: `${trade.traderName} copy profit`, amount: roundedProfit, currency: "USD" },
      }),
    ]);

    credited.push({ type: "copyTrade", amount: roundedProfit, label: trade.traderName });
  }

  const [updatedInvestment, updatedCopyTrades, updatedActivity, updatedWallet] = await Promise.all([
    db.userInvestment.findUnique({ where: { userId } }),
    db.userCopyTrade.findMany({ where: { userId, status: { not: "STOPPED" } }, orderBy: { startedAt: "desc" } }),
    db.activityLog.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.wallet.findFirst({ where: { userId, currency: "USD" } }),
  ]);

  return NextResponse.json({
    credited,
    investment: updatedInvestment,
    copyTrades: updatedCopyTrades,
    activity: updatedActivity,
    usdBalance: updatedWallet ? Number(updatedWallet.balance) : 0,
  });
}
