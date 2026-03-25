import "server-only";
import { db } from "@/lib/db";

// ─── Types ────────────────────────────────────────────────────────────────────

export type KycStatus = "not_submitted" | "pending" | "approved" | "rejected";

// ─── Messages ────────────────────────────────────────────────────────────────
// Used by server actions when returning a block error, and by the verification
// page when showing the redirect-reason banner.

export const KYC_BLOCK_MESSAGES: Record<Exclude<KycStatus, "approved">, string> = {
  not_submitted: "Complete identity verification to begin trading and investing",
  pending:       "Your verification is pending approval",
  rejected:      "Your verification was rejected. Please resubmit to continue",
};

// ─── Core status helper ───────────────────────────────────────────────────────

/**
 * Returns the 4-state KYC status for a given user ID by checking the most
 * recent Verification record.  This is the SINGLE source of truth used by
 * every page guard and server action in the app.
 */
export async function getKycStatusForUser(userId: string): Promise<KycStatus> {
  const v = await db.verification.findFirst({
    where: { userId },
    orderBy: { submittedAt: "desc" },
    select: { status: true },
  });
  if (!v) return "not_submitted";
  if (v.status === "APPROVED") return "approved";
  if (v.status === "REJECTED") return "rejected";
  return "pending"; // covers PENDING and UNDER_REVIEW
}

// ─── Server-action guard ──────────────────────────────────────────────────────

/**
 * Call at the start of any protected server action (after auth check).
 *
 * Returns null  → KYC is approved, action may proceed.
 * Returns { error } → KYC blocks the action; return this directly to the caller.
 */
export async function requireApprovedKyc(
  userId: string,
): Promise<{ error: string } | null> {
  const status = await getKycStatusForUser(userId);
  if (status === "approved") return null;
  return { error: KYC_BLOCK_MESSAGES[status] };
}
