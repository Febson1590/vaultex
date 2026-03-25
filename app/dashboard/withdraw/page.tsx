import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getKycStatusForUser } from "@/lib/kyc";
import WithdrawForm from "./_withdraw-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Withdraw — VaultEx" };

/**
 * KYC-gated withdrawal page.
 * Redirects non-approved users to the verification page with a status hint.
 */
export default async function WithdrawPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const kycStatus = await getKycStatusForUser(session.user.id);
  if (kycStatus !== "approved") {
    redirect(`/dashboard/verification?status=${kycStatus}`);
  }

  return <WithdrawForm />;
}
