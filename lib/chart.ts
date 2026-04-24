/**
 * lib/chart.ts
 * SERVER-ONLY utility for building the USD balance history chart.
 * Uses backward reconstruction from the current wallet balance so the final
 * chart point always exactly matches the user's live balance.
 *
 * IMPORTANT: This module must never be imported by client components.
 * The "server-only" guard below causes an immediate build error if it is.
 */
import "server-only";

import { db } from "@/lib/db";
import { TransactionType, TxStatus } from "@prisma/client";

export type ChartPoint = { date: string; value: number };

const RANGE_DAYS: Record<string, number> = {
  "7d":  7,
  "30d": 30,
  "90d": 90,
  "1y":  365,
};

export function rangeToDays(range: string): number {
  return RANGE_DAYS[range] ?? 30;
}

export const RANGE_LABELS: Record<string, string> = {
  "7d":  "7-day",
  "30d": "30-day",
  "90d": "90-day",
  "1y":  "1-year",
};

/**
 * Build a daily USD-balance chart for `days` days ending today.
 *
 * Algorithm (backward reconstruction):
 *  1. Start from current USD wallet balance (ground truth).
 *  2. Walk through all USD-affecting events newest-first.
 *  3. For each day, record the closing balance (balance *after* the newest
 *     event of that day = balance before undoing it).
 *  4. Forward-fill the daily points with carry-forward for event-free days.
 *
 * This guarantees the last chart point === current wallet balance.
 */
export async function buildBalanceChart(
  userId: string,
  days: number,
): Promise<ChartPoint[]> {
  const now = new Date();

  // Range start: UTC midnight `days` days ago
  const rangeStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days),
  );

  // ── Ground truth ─────────────────────────────────────────────────────────
  const usdWallet = await db.wallet.findFirst({ where: { userId, currency: "USD" } });
  const currentBalance = usdWallet ? Number(usdWallet.balance) : 0;

  // ── Fetch all balance-affecting events (all-time, sorted newest-first) ──
  //
  // Under the split-balance model investment + copy-trade ticks do NOT
  // touch the USD wallet — they accumulate in the relevant investment's
  // `totalEarned` and only release to the wallet when admin ends the
  // trade (which writes a Transaction row). So the USD balance chart is
  // driven entirely by Transaction rows; activity logs are not consulted.
  const transactions = await db.transaction.findMany({
    where: { userId, currency: "USD", status: TxStatus.COMPLETED },
    orderBy: { createdAt: "desc" },
  });

  // ── Build unified event list with signed USD deltas ───────────────────────
  type BalanceEvent = { ts: Date; delta: number };
  const events: BalanceEvent[] = [];

  for (const tx of transactions) {
    const amount = Number(tx.amount);
    const desc   = (tx.description ?? "").toLowerCase();
    let delta    = 0;

    switch (tx.type) {
      case TransactionType.DEPOSIT:
      case TransactionType.BONUS:
      case TransactionType.SELL:
        delta = amount;
        break;

      case TransactionType.WITHDRAWAL:
      case TransactionType.FEE:
      case TransactionType.BUY:
        delta = -amount;
        break;

      case TransactionType.ADJUSTMENT: {
        // ADJUSTMENT covers everything that moves through the USD wallet
        // without a dedicated TransactionType: admin credits/debits,
        // user moving money into investments / copy trades / upgrades,
        // and admin-released payouts when a trade ends.
        //
        // Debit markers (money leaves the wallet):
        //   "account adjustment"  — admin SUBTRACT
        //   "investment in "      — user starts an investment
        //   "copy trading"        — user starts copying a trader
        //   "upgrade top-up"      — plan upgrade top-up
        //   "added funds to"      — addFunds into an active investment
        //
        // Credit markers (money arrives in the wallet):
        //   "bonus credited" / "account credit" — admin ADD
        //   "trade ended"    / "copy trade ended" — end-trade payouts
        //
        // "balance correction" (admin SET) is ambiguous — the stored
        // amount is the new absolute balance, not a delta. Skip those
        // from reconstruction; the current-balance anchor still pulls
        // today's point to the true wallet value.
        if (desc.includes("balance correction")) {
          delta = 0;
          break;
        }
        const debitMarkers = [
          "account adjustment",
          "investment in ",
          "copy trading",
          "upgrade top-up",
          "added funds to",
        ];
        const isDebit = debitMarkers.some((m) => desc.includes(m));
        delta = isDebit ? -amount : amount;
        break;
      }
    }

    if (delta !== 0) events.push({ ts: tx.createdAt, delta });
  }

  // Sort newest-first (already sorted by DB query but the types may
  // arrive in different insertion orders within the same millisecond).
  events.sort((a, b) => b.ts.getTime() - a.ts.getTime());

  // ── Backward reconstruction ───────────────────────────────────────────────
  let balance = currentBalance;

  // dailyClose[YYYY-MM-DD] = USD balance at end of that day
  const dailyClose = new Map<string, number>();

  // Anchor: today's closing balance = current wallet balance
  dailyClose.set(dateKey(now), currentBalance);

  for (const ev of events) {
    const key = dateKey(ev.ts);
    // First time we encounter a day going backward = it is the end-of-day close
    if (!dailyClose.has(key)) {
      dailyClose.set(key, balance);
    }
    // Undo this event to travel further back in time
    balance = balance - ev.delta;
  }
  // `balance` is now the pre-account-history estimated starting balance

  // ── Forward pass: generate chart points with carry-forward ────────────────
  const points: ChartPoint[] = [];
  let carry = balance; // carry = balance for days with no events

  for (let i = 0; i <= days; i++) {
    const d = new Date(
      Date.UTC(
        rangeStart.getUTCFullYear(),
        rangeStart.getUTCMonth(),
        rangeStart.getUTCDate() + i,
      ),
    );
    const key = dateKey(d);
    if (dailyClose.has(key)) carry = dailyClose.get(key)!;

    points.push({
      date: d.toLocaleDateString("en-US", {
        month: "short",
        day:   "numeric",
        timeZone: "UTC",
      }),
      value: Math.round(Math.max(0, carry) * 100) / 100,
    });
  }

  return points;
}

/** UTC date string "YYYY-MM-DD" used as a stable map key */
function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
