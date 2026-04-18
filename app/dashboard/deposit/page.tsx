import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getKycStatusForUser } from "@/lib/kyc";
import { getActiveDepositWallets } from "@/lib/actions/deposits";
import { getFinancialLimits } from "@/lib/limits";
import DepositForm from "./_deposit-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Deposit — VaultEx" };

export default async function DepositPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [kycStatus, walletsRaw, limits, recentRaw] = await Promise.all([
    getKycStatusForUser(userId),
    getActiveDepositWallets(),
    getFinancialLimits(),
    /* Last 10 deposits for this user so the client can show pending /
       under-review / approved / rejected entries in one list. */
    db.depositRequest.findMany({
      where:   { userId },
      orderBy: { createdAt: "desc" },
      take:    10,
    }),
  ]);

  const wallets = walletsRaw.map((w) => ({
    id:      w.id,
    asset:   w.asset,
    network: w.network,
    address: w.address,
    label:   w.label,
  }));

  const recent = recentRaw.map((r) => ({
    id:          r.id,
    currency:    r.currency,
    amount:      Number(r.amount),
    method:      r.method,
    status:      r.status,             // PENDING | APPROVED | REJECTED | PROCESSING
    proofUrl:    r.proofUrl,
    txHash:      r.txHash,
    walletId:    r.walletId,
    adminNotes:  r.adminNotes,
    createdAt:   r.createdAt.toISOString(),
    processedAt: r.processedAt?.toISOString() ?? null,
  }));

  return (
    <DepositForm
      kycStatus={kycStatus}
      wallets={wallets}
      minDeposit={limits.minDeposit}
      maxDeposit={limits.maxDeposit}
      recent={recent}
    />
  );
}
