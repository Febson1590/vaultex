import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getKycStatusForUser } from "@/lib/kyc";
import { getActiveDepositWallets } from "@/lib/actions/deposits";
import { getFinancialLimits } from "@/lib/limits";
import DepositForm from "./_deposit-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Deposit — VaultEx" };

export default async function DepositPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [kycStatus, walletsRaw, limits] = await Promise.all([
    getKycStatusForUser(session.user.id),
    getActiveDepositWallets(),
    getFinancialLimits(),
  ]);

  const wallets = walletsRaw.map((w) => ({
    id: w.id,
    asset: w.asset,
    network: w.network,
    address: w.address,
    label: w.label,
  }));

  return (
    <DepositForm
      kycStatus={kycStatus}
      wallets={wallets}
      minDeposit={limits.minDeposit}
      maxDeposit={limits.maxDeposit}
    />
  );
}
