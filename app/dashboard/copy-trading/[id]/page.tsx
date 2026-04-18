import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getKycStatusForUser } from "@/lib/kyc";
import type { Metadata } from "next";
import TraderDetailClient from "./trader-detail-client";

export const metadata: Metadata = { title: "Trader — VaultEx" };

interface Params {
  params: Promise<{ id: string }>;
}

export default async function TraderDetailPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const { id } = await params;

  const [kycStatus, trader, existingCopy, usdWallet] = await Promise.all([
    getKycStatusForUser(userId),
    db.copyTrader.findUnique({ where: { id } }),
    db.userCopyTrade.findFirst({
      where: { userId, traderId: id, status: { not: "STOPPED" } },
      select: { id: true, amount: true, totalEarned: true },
    }),
    db.wallet.findFirst({ where: { userId, currency: "USD" } }),
  ]);

  if (!trader || !trader.isActive) notFound();

  const serialized = {
    id:              trader.id,
    name:            trader.name,
    avatarUrl:       trader.avatarUrl,
    country:         trader.country,
    specialty:       trader.specialty,
    description:     trader.description,
    winRate:         Number(trader.winRate),
    performance30d:  Number(trader.performance30d),
    totalROI:        Number(trader.totalROI),
    followers:       trader.followers,
    riskLevel:       trader.riskLevel,
    totalTrades:     trader.totalTrades,
    successfulTrades: trader.successfulTrades,
    failedTrades:    trader.failedTrades,
    maxDrawdown:     Number(trader.maxDrawdown),
    minCopyAmount:   Number(trader.minCopyAmount),
    maxCopyAmount:   trader.maxCopyAmount !== null ? Number(trader.maxCopyAmount) : null,
    minProfit:       Number(trader.minProfit),
    maxProfit:       Number(trader.maxProfit),
    profitInterval:  trader.profitInterval,
    maxInterval:     trader.maxInterval,
  };

  const alreadyCopying = existingCopy ? {
    id:          existingCopy.id,
    amount:      Number(existingCopy.amount),
    totalEarned: Number(existingCopy.totalEarned),
  } : null;

  const usdBalance = usdWallet ? Number(usdWallet.balance) : 0;

  return (
    <TraderDetailClient
      trader={serialized}
      alreadyCopying={alreadyCopying}
      usdBalance={usdBalance}
      kycStatus={kycStatus}
    />
  );
}
