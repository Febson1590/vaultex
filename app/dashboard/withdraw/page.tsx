import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getKycStatusForUser } from "@/lib/kyc";
import { getFinancialLimits } from "@/lib/limits";
import { getCryptoRates } from "@/lib/rates";
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

  const [kycStatus, usdWallet, limits, recentRaw, rates] = await Promise.all([
    getKycStatusForUser(userId),
    /* We treat USD as the canonical wallet — user picks a crypto
       on submission and the page converts using the live rate. */
    db.wallet.findFirst({ where: { userId, currency: "USD" } }),
    getFinancialLimits(),
    db.withdrawalRequest.findMany({
      where:   { userId },
      orderBy: { createdAt: "desc" },
      take:    10,
    }),
    getCryptoRates(),
  ]);

  const usdBalance = usdWallet ? Number(usdWallet.balance) : 0;

  const recent = recentRaw.map((r) => ({
    id:            r.id,
    currency:      r.currency,
    amount:        Number(r.amount),             // USD
    method:        r.method,                     // network label
    destination:   r.destination,
    status:        r.status,                     // PENDING | APPROVED | REJECTED | PROCESSING
    adminNotes:    r.adminNotes,
    cryptoAmount:  r.cryptoAmount !== null ? Number(r.cryptoAmount) : null,
    cryptoSymbol:  r.cryptoSymbol,
    cryptoNetwork: r.cryptoNetwork,
    exchangeRate:  r.exchangeRate !== null ? Number(r.exchangeRate) : null,
    createdAt:     r.createdAt.toISOString(),
    processedAt:   r.processedAt?.toISOString() ?? null,
  }));

  return (
    <WithdrawForm
      kycStatus={kycStatus}
      usdBalance={usdBalance}
      minWithdrawal={limits.minWithdrawal}
      maxWithdrawal={limits.maxWithdrawal}
      feePercent={limits.withdrawalFeePercent}
      feeFixed={limits.withdrawalFeeFixed}
      recent={recent}
      initialRates={rates}
    />
  );
}
