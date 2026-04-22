import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  catchUpUserInvestment, catchUpCopyTrade,
} from "@/lib/engine/investment-tick";

/**
 * Client-polled every ~15s from the dashboard.
 *
 * Runs the tick catch-up for the signed-in user's investment + copy-
 * trades (all due ticks up to the safety cap — see engine module),
 * then returns the latest state for the UI to re-render from.
 *
 * The server cron (/api/cron/investment-profit) keeps ticking even
 * when the user is offline, so by the time they reopen the dashboard
 * most of their catch-up is already done.
 */
export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const now = new Date();
  const credited: { type: string; amount: number; label: string }[] = [];

  // Active investment — catch up any missed ticks.
  const investment = await db.userInvestment.findUnique({ where: { userId } });
  if (investment && investment.status === "ACTIVE") {
    const deltas = await catchUpUserInvestment(userId, now);
    for (const d of deltas) credited.push({ type: "investment", amount: d, label: investment.planName });
  }

  // Active copy trades — iterate each and catch up.
  const copyTrades = await db.userCopyTrade.findMany({ where: { userId, status: "ACTIVE" } });
  for (const trade of copyTrades) {
    const deltas = await catchUpCopyTrade(trade.id, now);
    for (const d of deltas) credited.push({ type: "copyTrade", amount: d, label: trade.traderName });
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
    activity:   updatedActivity,
    usdBalance: updatedWallet ? Number(updatedWallet.balance) : 0,
  });
}
