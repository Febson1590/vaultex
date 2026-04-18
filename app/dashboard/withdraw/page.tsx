import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getKycStatusForUser } from "@/lib/kyc";
import { getFinancialLimits } from "@/lib/limits";
import WithdrawForm from "./_withdraw-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Withdraw — VaultEx" };

/**
 * Withdrawal page — always renders for authenticated users.
 * The KYC status, user balances, limits, and recent withdrawals are
 * passed to the client form so it can render the full flow.
 */
export default async function WithdrawPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [kycStatus, walletsRaw, limits, recentRaw] = await Promise.all([
    getKycStatusForUser(userId),
    db.wallet.findMany({
      where:   { userId },
      orderBy: { currency: "asc" },
    }),
    getFinancialLimits(),
    db.withdrawalRequest.findMany({
      where:   { userId },
      orderBy: { createdAt: "desc" },
      take:    10,
    }),
  ]);

  // Normalize wallet balances to plain numbers for the client component.
  const balances = walletsRaw.map((w) => ({
    currency: w.currency,
    balance:  Number(w.balance),
  }));

  const recent = recentRaw.map((r) => ({
    id:          r.id,
    currency:    r.currency,
    amount:      Number(r.amount),
    method:      r.method,            // network label
    destination: r.destination,
    status:      r.status,             // PENDING | APPROVED | REJECTED | PROCESSING
    adminNotes:  r.adminNotes,
    createdAt:   r.createdAt.toISOString(),
    processedAt: r.processedAt?.toISOString() ?? null,
  }));

  return (
    <WithdrawForm
      kycStatus={kycStatus}
      balances={balances}
      minWithdrawal={limits.minWithdrawal}
      maxWithdrawal={limits.maxWithdrawal}
      feePercent={limits.withdrawalFeePercent}
      feeFixed={limits.withdrawalFeeFixed}
      recent={recent}
    />
  );
}
