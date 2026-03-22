import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

// Called by client every 15 s — credits profit for due investments + copy trades
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const now = new Date();
  const credited: { type: string; amount: number; label: string }[] = [];

  // ── Active investment ────────────────────────────────────────────────────
  const investment = await db.userInvestment.findUnique({ where: { userId } });

  if (investment && investment.status === "ACTIVE" && investment.nextProfitAt && investment.nextProfitAt <= now) {
    const min = Number(investment.minProfit) / 100;
    const max = Number(investment.maxProfit) / 100;
    const rate = min + Math.random() * (max - min);
    const profit = Number(investment.amount) * rate;
    const roundedProfit = Math.round(profit * 100) / 100;

    const nextProfitAt = new Date(now.getTime() + investment.profitInterval * 1000);

    await db.$transaction([
      db.userInvestment.update({
        where: { userId },
        data: {
          totalEarned: { increment: roundedProfit },
          lastProfitAt: now,
          nextProfitAt,
        },
      }),
      db.wallet.updateMany({
        where: { userId, currency: "USD" },
        data: { balance: { increment: roundedProfit } },
      }),
      db.activityLog.create({
        data: {
          userId,
          type: "INVESTMENT_PROFIT",
          title: `${investment.planName} profit credited`,
          amount: roundedProfit,
          currency: "USD",
        },
      }),
    ]);

    credited.push({ type: "investment", amount: roundedProfit, label: investment.planName });
  }

  // ── Active copy trades ───────────────────────────────────────────────────
  const copyTrades = await db.userCopyTrade.findMany({
    where: { userId, status: "ACTIVE" },
  });

  for (const trade of copyTrades) {
    if (!trade.nextProfitAt || trade.nextProfitAt > now) continue;

    const min = Number(trade.minProfit) / 100;
    const max = Number(trade.maxProfit) / 100;
    const rate = min + Math.random() * (max - min);
    const profit = Number(trade.amount) * rate;
    const roundedProfit = Math.round(profit * 100) / 100;

    const nextProfitAt = new Date(now.getTime() + trade.profitInterval * 1000);

    await db.$transaction([
      db.userCopyTrade.update({
        where: { id: trade.id },
        data: {
          totalEarned: { increment: roundedProfit },
          lastProfitAt: now,
          nextProfitAt,
        },
      }),
      db.wallet.updateMany({
        where: { userId, currency: "USD" },
        data: { balance: { increment: roundedProfit } },
      }),
      db.activityLog.create({
        data: {
          userId,
          type: "COPY_TRADE_PROFIT",
          title: `${trade.traderName} copy profit`,
          amount: roundedProfit,
          currency: "USD",
        },
      }),
    ]);

    credited.push({ type: "copyTrade", amount: roundedProfit, label: trade.traderName });
  }

  // Return fresh data so client can update UI without full page reload
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
