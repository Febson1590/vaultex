import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getAvailablePlans } from "@/lib/actions/investment";
import { getKycStatusForUser } from "@/lib/kyc";
import type { Metadata } from "next";
import InvestmentsClient from "./investments-client";

export const metadata: Metadata = { title: "Investment Plans — VaultEx" };

export default async function InvestmentsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [kycStatus, plansRaw, usdWallet] = await Promise.all([
    getKycStatusForUser(userId),
    getAvailablePlans(),
    db.wallet.findFirst({ where: { userId, currency: "USD" } }),
  ]);

  const plans = plansRaw.map((p) => ({
    id:              p.id,
    name:            p.name,
    description:     p.description,
    minAmount:       Number(p.minAmount),
    maxAmount:       p.maxAmount !== null ? Number(p.maxAmount) : null,
    minProfit:       Number(p.minProfit),
    maxProfit:       Number(p.maxProfit),
    minDurationHours: p.minDurationHours ?? null,
    maxDurationHours: p.maxDurationHours ?? null,
    profitInterval:  p.profitInterval,
    maxInterval:     p.maxInterval ?? p.profitInterval,
    isActive:        p.isActive,
    isPopular:       p.isPopular,
  }));

  const usdBalance = usdWallet ? Number(usdWallet.balance) : 0;

  return <InvestmentsClient plans={plans} usdBalance={usdBalance} kycStatus={kycStatus} />;
}
