import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getPortfolioPerformance } from "@/lib/actions/user";
import DashboardClient from "./dashboard-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [user, wallets, holdings, investment, copyTrades, activity, chartData] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      include: { verifications: { orderBy: { submittedAt: "desc" }, take: 1 } },
    }),
    db.wallet.findMany({ where: { userId } }),
    db.assetHolding.findMany({ where: { userId }, include: { asset: true } }),
    db.userInvestment.findUnique({ where: { userId } }),
    db.userCopyTrade.findMany({
      where: { userId, status: { not: "STOPPED" } },
      orderBy: { startedAt: "desc" },
    }),
    db.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    getPortfolioPerformance(userId),
  ]);

  if (!user) redirect("/login");

  const usdWallet = wallets.find(w => w.currency === "USD");
  const usdBalance = Number(usdWallet?.balance ?? 0);
  const holdingsValue = holdings.reduce((sum, h) => sum + Number(h.quantity) * Number(h.asset.currentPrice), 0);
  const totalPortfolio = usdBalance + holdingsValue;

  const isVerified = user.verifications[0]?.status === "APPROVED";

  const totalEarned =
    (investment ? Number(investment.totalEarned) : 0) +
    copyTrades.filter(t => t.status !== "STOPPED").reduce((s, t) => s + Number(t.totalEarned), 0);

  // Serialize Prisma Decimal/Date fields to plain JS values
  const serializedInvestment = investment
    ? {
        id: investment.id,
        planName: investment.planName,
        amount: Number(investment.amount),
        totalEarned: Number(investment.totalEarned),
        minProfit: Number(investment.minProfit),
        maxProfit: Number(investment.maxProfit),
        profitInterval: investment.profitInterval,
        status: investment.status,
        nextProfitAt: investment.nextProfitAt?.toISOString() ?? null,
      }
    : null;

  const serializedCopyTrades = copyTrades.map(t => ({
    id: t.id,
    traderName: t.traderName,
    amount: Number(t.amount),
    totalEarned: Number(t.totalEarned),
    minProfit: Number(t.minProfit),
    maxProfit: Number(t.maxProfit),
    profitInterval: t.profitInterval,
    status: t.status,
    nextProfitAt: t.nextProfitAt?.toISOString() ?? null,
  }));

  const serializedActivity = activity.map(a => ({
    id: a.id,
    type: a.type,
    title: a.title,
    amount: a.amount !== null ? Number(a.amount) : null,
    currency: a.currency,
    createdAt: a.createdAt.toISOString(),
  }));

  return (
    <DashboardClient
      user={{ id: user.id, name: user.name }}
      usdBalance={usdBalance}
      totalPortfolio={totalPortfolio}
      totalEarned={totalEarned}
      isVerified={isVerified}
      investment={serializedInvestment}
      copyTrades={serializedCopyTrades}
      activity={serializedActivity}
      chartData={chartData}
    />
  );
}
