import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getKycStatusForUser } from "@/lib/kyc";
import WithdrawForm from "./_withdraw-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Withdraw — VaultEx" };

/**
 * Withdrawal page — always renders for authenticated users.
 * The KYC status is passed to the form so it can disable submission
 * and show a contextual banner instead of a full-page redirect.
 */
export default async function WithdrawPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const kycStatus = await getKycStatusForUser(session.user.id);

  return <WithdrawForm kycStatus={kycStatus} />;
}
