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
    // Loss-vs-profit roll. `lossRatio` is between 0 and 1 — if random()
    // falls below it, this tick is a LOSS instead of a profit. Losses are
    // less frequent than profits (ratio < 0.5) so net outcome stays positive.
    const lossRatio = Number(investment.lossRatio ?? 0);
    const isLoss    = lossRatio > 0 && Math.random() < lossRatio;

    let delta:         number;
    let activityType:  "INVESTMENT_PROFIT" | "INVESTMENT_LOSS";
    let activityTitle: string;

    if (isLoss) {
      const minL = Number(investment.minLoss ?? 0) / 100;
      const maxL = Number(investment.maxLoss ?? 0) / 100;
      const rate = minL + Math.random() * (maxL - minL);
      const loss = Number(investment.amount) * rate;
      delta         = -(Math.round(loss * 100) / 100);
      activityType  = "INVESTMENT_LOSS";
      activityTitle = `${investment.planName} loss recorded`;
    } else {
      const min = Number(investment.minProfit) / 100;
      const max = Number(investment.maxProfit) / 100;
      const rate = min + Math.random() * (max - min);
      const profit = Number(investment.amount) * rate;
      delta         = Math.round(profit * 100) / 100;
      activityType  = "INVESTMENT_PROFIT";
      activityTitle = `${investment.planName} profit credited`;
    }

    // Random next interval between profitInterval (min) and maxInterval (max)
    const minSecs = investment.profitInterval;
    const maxSecs = investment.maxInterval ?? investment.profitInterval;
    const intervalSecs = minSecs + Math.floor(Math.random() * (maxSecs - minSecs + 1));
    const nextProfitAt = new Date(now.getTime() + intervalSecs * 1000);

    await db.$transaction([
      db.userInvestment.update({
        where: { userId },
        data: { totalEarned: { increment: delta }, lastProfitAt: now, nextProfitAt },
      }),
      db.wallet.updateMany({
        where: { userId, currency: "USD" },
        data: { balance: { increment: delta } },
      }),
      db.activityLog.create({
        data: { userId, type: activityType, title: activityTitle, amount: delta, currency: "USD" },
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
