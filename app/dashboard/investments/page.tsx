import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getAvailablePlans } from "@/lib/actions/investment";
import type { Metadata } from "next";
import InvestmentsClient from "./investments-client";

export const metadata: Metadata = { title: "Investments \u2014 VaultEx" };

export default async function InvestmentsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [plansRaw, investment, usdWallet] = await Promise.all([
    getAvailablePlans(),
    db.userInvestment.findUnique({ where: { userId } }),
    db.wallet.findFirst({ where: { userId, currency: "USD" } }),
  ]);

  const plans = plansRaw.map((p: any) => ({
    id: p.id, name: p.name, description: p.description,
    minAmount:      Number(p.minAmount),
    minProfit:      Number(p.minProfit), maxProfit: Number(p.maxProfit),
    profitInterval: p.profitInterval,
    maxInterval:    p.maxInterval ?? p.profitInterval,
    isActive:       p.isActive,
  }));

  const inv = investment ? {
    planName:       investment.planName,
    amount:         Number(investment.amount),
    totalEarned:    Number(investment.totalEarned),
    minProfit:      Number(investment.minProfit),
    maxProfit:      Number(investment.maxProfit),
    profitInterval: investment.profitInterval,
    maxInterval:    investment.maxInterval ?? investment.profitInterval,
    status:         investment.status,
  } : null;

  const usdBalance = usdWallet ? Number(usdWallet.balance) : 0;

  return <InvestmentsClient plans={plans} investment={inv} usdBalance={usdBalance} />;
}
