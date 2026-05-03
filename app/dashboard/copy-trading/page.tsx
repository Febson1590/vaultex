import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getKycStatusForUser } from "@/lib/kyc";
import type { Metadata } from "next";
import CopyTradingClient from "./copy-trading-client";

export const metadata: Metadata = { title: "Copy Trading" };

export default async function CopyTradingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [kycStatus, traders, existingCopies, usdWallet] = await Promise.all([
    getKycStatusForUser(userId),
    db.copyTrader.findMany({
      where: { isActive: true },
      orderBy: { performance30d: "desc" },
    }),
    db.userCopyTrade.findMany({
      where: { userId, status: { not: "STOPPED" } },
      select: { traderId: true },
    }),
    db.wallet.findFirst({ where: { userId, currency: "USD" } }),
  ]);

  const activeTraderIds = new Set(existingCopies.map((c) => c.traderId));

  const serialized = traders.map((t) => ({
    id:              t.id,
    name:            t.name,
    avatarUrl:       t.avatarUrl,
    country:         t.country,
    specialty:       t.specialty,
    winRate:         Number(t.winRate),
    performance30d:  Number(t.performance30d),
    totalROI:        Number(t.totalROI),
    followers:       t.followers,
    riskLevel:       t.riskLevel,
    minCopyAmount:   Number(t.minCopyAmount),
    maxCopyAmount:   t.maxCopyAmount !== null ? Number(t.maxCopyAmount) : null,
    minProfit:       Number(t.minProfit),
    maxProfit:       Number(t.maxProfit),
    profitInterval:  t.profitInterval,
    maxInterval:     t.maxInterval,
    alreadyCopying:  activeTraderIds.has(t.id),
  }));

  const usdBalance = usdWallet ? Number(usdWallet.balance) : 0;

  return (
    <CopyTradingClient
      traders={serialized}
      usdBalance={usdBalance}
      kycStatus={kycStatus}
    />
  );
}
