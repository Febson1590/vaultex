import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getKycStatusForUser } from "@/lib/kyc";
import type { Metadata } from "next";
import CopyTradingClient from "./copy-trading-client";

export const metadata: Metadata = { title: "Copy Trading \u2014 VaultEx" };

export default async function CopyTradingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  // KYC gate — non-approved users are sent to the verification page
  const kycStatus = await getKycStatusForUser(userId);
  if (kycStatus !== "approved") {
    redirect(`/dashboard/verification?status=${kycStatus}`);
  }

  const [copyTrades, usdWallet] = await Promise.all([
    db.userCopyTrade.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      include: { trader: { select: { avatarUrl: true } } },
    }),
    db.wallet.findFirst({ where: { userId, currency: "USD" } }),
  ]);

  function ser(t: any) {
    return {
      id:             t.id,
      traderName:     t.traderName,
      traderId:       t.traderId,
      avatarUrl:      t.trader?.avatarUrl ?? null,
      amount:         Number(t.amount),
      totalEarned:    Number(t.totalEarned),
      minProfit:      Number(t.minProfit),
      maxProfit:      Number(t.maxProfit),
      profitInterval: t.profitInterval,
      maxInterval:    t.maxInterval ?? t.profitInterval,
      status:         t.status,
    };
  }

  const activeTrades  = copyTrades.filter(t => t.status !== "STOPPED").map(ser);
  const stoppedTrades = copyTrades.filter(t => t.status === "STOPPED").map(ser);
  const usdBalance    = usdWallet ? Number(usdWallet.balance) : 0;

  return <CopyTradingClient activeTrades={activeTrades} stoppedTrades={stoppedTrades} usdBalance={usdBalance} />;
}
