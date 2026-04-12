import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getKycStatusForUser } from "@/lib/kyc";
import DepositForm from "./_deposit-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Deposit — VaultEx" };

/**
 * Deposit page — always renders for authenticated users.
 * The KYC status is passed to the form so it can disable submission
 * and show a contextual banner instead of a full-page redirect.
 */
export default async function DepositPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const kycStatus = await getKycStatusForUser(session.user.id);

  return <DepositForm kycStatus={kycStatus} />;
}
