import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import type { Metadata } from "next";
import { AdminSecurityClient } from "./security-client";

export const metadata: Metadata = { title: "Security — Vaultex Admin" };

export default async function AdminSecurityPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const me = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { role: true, email: true, name: true, updatedAt: true },
  });
  if (!me || me.role !== "ADMIN") redirect("/dashboard");

  return (
    <AdminSecurityClient
      email={me.email}
      name={me.name ?? "Admin"}
      passwordUpdatedAt={me.updatedAt.toISOString()}
    />
  );
}
