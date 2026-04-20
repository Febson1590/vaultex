import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import type { Metadata } from "next";
import { SettingsClient, type SettingsInitialData } from "./settings-client";

export const metadata: Metadata = { title: "Account Settings — Vaultex" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [user, profile, latestVerification] = await Promise.all([
    db.user.findUnique({
      where:  { id: userId },
      select: { email: true, name: true },
    }),
    db.profile.findUnique({ where: { userId } }),
    db.verification.findFirst({
      where: { userId },
      orderBy: { submittedAt: "desc" },
      select: { status: true },
    }),
  ]);

  if (!user) redirect("/login");

  // Prefer Profile fields. If profile.firstName/lastName are blank (older
  // accounts whose registration didn't write them) derive from user.name
  // which always exists from registration — so Settings never shows the
  // form empty when we already have the data.
  let firstName = profile?.firstName ?? "";
  let lastName  = profile?.lastName  ?? "";
  if (!firstName && !lastName && user.name) {
    const parts = user.name.trim().split(/\s+/);
    firstName = parts[0] ?? "";
    lastName  = parts.slice(1).join(" ");
  }

  const initial: SettingsInitialData = {
    email:       user.email,
    firstName,
    lastName,
    phone:       profile?.phone   ?? "",
    country:     profile?.country ?? "",
    city:        profile?.city    ?? "",
    zipCode:     profile?.zipCode ?? "",
    address:     profile?.address ?? "",
    kycApproved: latestVerification?.status === "APPROVED",
  };

  return <SettingsClient initial={initial} />;
}
