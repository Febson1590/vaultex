/**
 * 4-tier user-status enforcement.
 *
 * | Status     | Login | Deposit | Withdraw | Open new trade/invest | Keep earning on existing trade |
 * |------------|-------|---------|----------|-----------------------|---------------------------------|
 * | ACTIVE     | ✅    | ✅      | ✅       | ✅                    | ✅                              |
 * | RESTRICTED | ✅    | ✅      | ❌       | ❌                    | ✅                              |
 * | FROZEN     | ✅    | ❌      | ❌       | ❌                    | ✅                              |
 * | SUSPENDED  | ❌    | ❌      | ❌       | ❌                    | ❌                              |
 *
 * Engine ticks for SUSPENDED users are skipped entirely (lib/engine/investment-tick.ts).
 * FROZEN/SUSPENDED block login at the NextAuth credentials step (auth.ts + lib/actions/auth.ts).
 * Layouts re-check per request so a status change mid-session lands on the next navigation.
 */

import { db } from "@/lib/db";
import type { UserStatus } from "@prisma/client";

/** Categorises the intent we're checking so we can choose the right message. */
export type StatusGatedAction =
  | "deposit"
  | "withdraw"
  | "trade"
  | "invest"
  | "upgrade"
  | "addFunds";

const HUMAN_LABEL: Record<StatusGatedAction, string> = {
  deposit:   "make a deposit",
  withdraw:  "request a withdrawal",
  trade:     "place trades",
  invest:    "start a new investment or copy trade",
  upgrade:   "upgrade your investment plan",
  addFunds:  "add funds to your investment",
};

/** What each status is allowed to do. */
export function canPerform(status: UserStatus, action: StatusGatedAction): boolean {
  switch (status) {
    case "ACTIVE":     return true;
    case "RESTRICTED": return action === "deposit";          // money-in only, no money-out, no new positions
    case "FROZEN":     return false;                         // read-only — nothing moves
    case "SUSPENDED":  return false;                         // hard block
    default:           return false;
  }
}

/** Reason text for a user-facing error when an action is blocked. */
export function blockReason(status: UserStatus, action: StatusGatedAction): string {
  const what = HUMAN_LABEL[action];
  switch (status) {
    case "RESTRICTED":
      return `Your account is currently restricted. You cannot ${what} until this is lifted. Contact support for more information.`;
    case "FROZEN":
      return `Your account is currently frozen. You cannot ${what} until this is lifted. Contact support for more information.`;
    case "SUSPENDED":
      return `Your account is suspended. Contact support.`;
    default:
      return `Your account is not active. Contact support.`;
  }
}

/**
 * Server-action guard. Reads the latest status from the DB (never trusts
 * the session/JWT since that could be stale), returns `null` if the
 * action is allowed, or `{ error }` if not — matching the return shape
 * the rest of our server actions use.
 */
export async function requireActiveStatus(
  userId: string,
  action: StatusGatedAction,
): Promise<null | { error: string }> {
  const u = await db.user.findUnique({
    where: { id: userId },
    select: { status: true },
  });
  if (!u) return { error: "Account not found" };
  if (canPerform(u.status, action)) return null;
  return { error: blockReason(u.status, action) };
}
