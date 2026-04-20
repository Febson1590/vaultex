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
import { ActivityType, TransactionType, TxStatus } from "@prisma/client";

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
  const [transactions, activityLogs] = await Promise.all([
    db.transaction.findMany({
      where: { userId, currency: "USD", status: TxStatus.COMPLETED },
      orderBy: { createdAt: "desc" },
    }),
    db.activityLog.findMany({
      where: {
        userId,
        currency: "USD",
        type: {
          in: [
            ActivityType.INVESTMENT_PROFIT,
            ActivityType.COPY_TRADE_PROFIT,
            ActivityType.INVESTMENT_LOSS,
          ],
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

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
        // ADJUSTMENT is used for both admin wallet edits and for
        // user-initiated debits that move money from the wallet into an
        // investment / copy-trade / plan upgrade. Descriptions we know
        // to mean "money left the wallet" (negative delta):
        //   "admin subtract: …"
        //   "admin balance adjustment: SUBTRACT …"
        //   "Investment in <plan>"
        //   "Copy trading <trader>"
        //   "Upgrade top-up to <plan>"
        const debitMarkers = [
          "subtract",
          "investment in ",
          "copy trading",
          "upgrade top-up",
        ];
        const isDebit = debitMarkers.some((m) => desc.includes(m));
        delta = isDebit ? -amount : amount;
        break;
      }
    }

    if (delta !== 0) events.push({ ts: tx.createdAt, delta });
  }

  for (const log of activityLogs) {
    if (log.amount === null) continue;
    // Profit rows store a positive amount; INVESTMENT_LOSS stores a
    // negative amount. Either way the stored amount IS the signed delta
    // applied to the wallet at tick time.
    const raw = Number(log.amount);
    if (raw !== 0) events.push({ ts: log.createdAt, delta: raw });
  }

  // Sort newest-first (already sorted by DB query, but merge may reorder)
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
