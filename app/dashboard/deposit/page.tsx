import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getKycStatusForUser } from "@/lib/kyc";
import DepositForm from "./_deposit-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Deposit — VaultEx" };

/**
 * KYC-gated deposit page.
 * Any user whose KYC is not yet approved is redirected to the verification
 * page with a ?status= hint so it can show the right message.
 */
export default async function DepositPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const kycStatus = await getKycStatusForUser(session.user.id);
  if (kycStatus !== "approved") {
    redirect(`/dashboard/verification?status=${kycStatus}`);
  }

  return <DepositForm />;
}
