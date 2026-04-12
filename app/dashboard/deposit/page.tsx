import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getKycStatusForUser } from "@/lib/kyc";
import { getFinancialLimits } from "@/lib/limits";
import DepositForm from "./_deposit-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Deposit — VaultEx" };

export default async function DepositPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [kycStatus, limits] = await Promise.all([
    getKycStatusForUser(session.user.id),
    getFinancialLimits(),
  ]);

  return (
    <DepositForm
      kycStatus={kycStatus}
      minDeposit={limits.minDeposit}
      maxDeposit={limits.maxDeposit}
    />
  );
}
