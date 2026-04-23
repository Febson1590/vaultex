/**
 * Investment / copy-trade tick engine.
 *
 * Shared by two entry points:
 *
 *   1. /api/investment/profit
 *      Client-polled (every 15s) for the signed-in user's dashboard.
 *      Primarily a "latest state" probe. Uses `catchUpUserInvestment`
 *      and `catchUpUserCopyTrades` so a user who has been offline for
 *      a while sees all missed ticks credited when they next open the
 *      dashboard.
 *
 *   2. /api/cron/investment-profit
 *      Server cron (runs every minute via vercel.json). Iterates ALL
 *      ACTIVE investments + copy-trades and runs due ticks. This is
 *      what actually makes profits "pay out while the user is offline"
 *      — the guarantee is that the server keeps ticking whether or not
 *      anyone's tab is open.
 *
 * Both endpoints call the same per-row functions below, so the ledger
 * (USD wallet, totalEarned, activity log, streak counter, nextProfitAt)
 * stays consistent across either call path.
 */

import { db } from "@/lib/db";
import type {
  UserInvestment, UserCopyTrade, ActivityType,
} from "@prisma/client";

/** Safety cap — max ticks credited per row per request. Stops a single
 *  poll/cron from running hundreds of transactions when a user has been
 *  offline for weeks. Subsequent calls finish the catch-up. */
const MAX_TICKS_PER_CATCHUP = 50;

/** Weighted-toward-low random draw inside [min, max].
 *  Squaring Math.random() biases toward 0, so most ticks land near the
 *  floor of the band with occasional draws near the ceiling. */
function biasedRand(min: number, max: number): number {
  if (max <= min) return min;
  const t = Math.random() * Math.random();
  return min + t * (max - min);
}

/** Resolve the canonical seconds cadence for any plan/investment row.
 *
 * Mirrors lib/duration.ts#resolvePlanSecs exactly so the display layer
 * and the engine never disagree on what cadence a row is running at:
 *
 *   • New-format rows (hour columns null) → trust seconds as-is,
 *     including short values like 60 s (1 minute) or 30 s.
 *   • Legacy rows (hour columns populated) → prefer hours unless the
 *     seconds column is meaningfully above the 60 s placeholder.
 *   • Final fallback: 1 hour so the engine never fires in a tight loop.
 */
function resolveCadenceSecs(row: {
  profitInterval:   number;
  maxInterval:      number | null;
  minDurationHours: number | null;
  maxDurationHours: number | null;
}): { minSecs: number; maxSecs: number } {
  const pi = Number(row.profitInterval ?? 0);
  const mi = Number(row.maxInterval    ?? 0);
  const minH = Number(row.minDurationHours ?? 0);
  const maxH = Number(row.maxDurationHours ?? 0);
  const hasLegacyHours = minH > 0 || maxH > 0;

  let minSecs: number;
  let maxSecs: number;
  if (!hasLegacyHours) {
    minSecs = pi;
    maxSecs = mi > 0 ? mi : pi;
  } else if (pi > 60) {
    minSecs = pi;
    maxSecs = mi > 60 ? mi : pi;
  } else {
    minSecs = minH * 3600;
    maxSecs = (maxH > 0 ? maxH : minH) * 3600;
  }

  if (minSecs <= 0) minSecs = 3600;
  if (maxSecs <  minSecs) maxSecs = minSecs;
  return { minSecs, maxSecs };
}

/** One tick of profit/loss for a single UserInvestment. Mutates the row,
 *  the user's USD wallet and the activity log atomically. Returns the
 *  signed delta that was credited, or `null` if the row isn't due or
 *  isn't ACTIVE. Callers that want to catch up multiple ticks should
 *  call this in a loop until it returns null (or the cap is hit). */
export async function runInvestmentTick(
  investment: UserInvestment,
  now: Date,
): Promise<number | null> {
  if (investment.status !== "ACTIVE") return null;
  if (!investment.nextProfitAt || investment.nextProfitAt > now) return null;

  // 1. Per-tick loss probability from the configured band.
  const minRatioPct = Number(investment.minLossRatio ?? 0);
  const maxRatioPct = Number(investment.maxLossRatio ?? 0);
  const currentRatioPct = maxRatioPct > minRatioPct
    ? minRatioPct + Math.random() * (maxRatioPct - minRatioPct)
    : minRatioPct;
  const lossProbability = Math.max(0, Math.min(1, currentRatioPct / 100));

  // 2. Streak guard — force a profit after 2 consecutive losses.
  const streakCap   = 2;
  const streakAtCap = (investment.consecutiveLosses ?? 0) >= streakCap;
  const isLoss = !streakAtCap && lossProbability > 0 && Math.random() < lossProbability;

  // 3. Compute delta + exact percent for history.
  let delta:         number;
  let percentUsed:   number;
  let activityType:  ActivityType;
  let activityTitle: string;

  if (isLoss) {
    const minL = Number(investment.minLoss ?? 0);
    const maxL = Number(investment.maxLoss ?? 0);
    const pct  = biasedRand(minL, maxL);
    const loss = Number(investment.amount) * (pct / 100);
    delta         = -(Math.round(loss * 100) / 100);
    percentUsed   = -Math.round(pct * 10000) / 10000;
    activityType  = "INVESTMENT_LOSS";
    activityTitle = `${investment.planName} loss (${pct.toFixed(2)}%)`;
  } else {
    const minP   = Number(investment.minProfit);
    const maxP   = Number(investment.maxProfit);
    const pct    = biasedRand(minP, maxP);
    const profit = Number(investment.amount) * (pct / 100);
    delta         = Math.round(profit * 100) / 100;
    percentUsed   = Math.round(pct * 10000) / 10000;
    activityType  = "INVESTMENT_PROFIT";
    activityTitle = `${investment.planName} profit (${pct.toFixed(2)}%)`;
  }

  // 4. Schedule next tick from the seconds band.
  //    Anchor the new nextProfitAt to the PREVIOUS nextProfitAt, not
  //    to `now`. When the loop runs catch-up on a user who was offline
  //    for a while, this keeps missed ticks in the past relative to
  //    `now` so runInvestmentTick returns a non-null delta on the next
  //    iteration — instead of stopping after a single tick because the
  //    newly-scheduled time landed in the future.
  const { minSecs, maxSecs } = resolveCadenceSecs(investment);
  const secs = maxSecs > minSecs ? minSecs + Math.random() * (maxSecs - minSecs) : minSecs;
  const anchor = investment.nextProfitAt ?? now;
  const nextProfitAt = new Date(anchor.getTime() + Math.round(secs * 1000));
  const nextStreak   = isLoss ? (investment.consecutiveLosses ?? 0) + 1 : 0;

  // 5. Persist atomically.
  //
  // IMPORTANT — investment ticks no longer touch the USD wallet. Under
  // the split-balance model the user's Available Balance ONLY holds
  // deposited money. Unrealised profit (and running losses) accumulate
  // in `investment.totalEarned` until an admin ends the trade via
  // `adminEndInvestment`, at which point `principal + max(profit, 0)`
  // is released to the wallet in one move.
  await db.$transaction([
    db.userInvestment.update({
      where: { userId: investment.userId },
      data:  {
        totalEarned:       { increment: delta },
        lastProfitAt:      now,
        nextProfitAt,
        consecutiveLosses: nextStreak,
      },
    }),
    db.activityLog.create({
      data: {
        userId:   investment.userId,
        type:     activityType,
        title:    activityTitle,
        amount:   delta,
        percent:  percentUsed,
        currency: "USD",
      },
    }),
  ]);

  return delta;
}

/** One tick of profit/loss for a single UserCopyTrade. Same semantics
 *  as runInvestmentTick. */
export async function runCopyTradeTick(
  trade: UserCopyTrade,
  now: Date,
): Promise<number | null> {
  if (trade.status !== "ACTIVE") return null;
  if (!trade.nextProfitAt || trade.nextProfitAt > now) return null;

  const minRatioPct = Number(trade.minLossRatio ?? 0);
  const maxRatioPct = Number(trade.maxLossRatio ?? 0);
  const currentRatioPct = maxRatioPct > minRatioPct
    ? minRatioPct + Math.random() * (maxRatioPct - minRatioPct)
    : minRatioPct;
  const lossProbability = Math.max(0, Math.min(1, currentRatioPct / 100));

  const streakCap   = 2;
  const streakAtCap = (trade.consecutiveLosses ?? 0) >= streakCap;
  const isLoss = !streakAtCap && lossProbability > 0 && Math.random() < lossProbability;

  let delta:         number;
  let percentUsed:   number;
  let activityType:  ActivityType;
  let activityTitle: string;

  if (isLoss) {
    const minL = Number(trade.minLoss ?? 0);
    const maxL = Number(trade.maxLoss ?? 0);
    const pct  = biasedRand(minL, maxL);
    const loss = Number(trade.amount) * (pct / 100);
    delta         = -(Math.round(loss * 100) / 100);
    percentUsed   = -Math.round(pct * 10000) / 10000;
    activityType  = "COPY_TRADE_LOSS";
    activityTitle = `${trade.traderName} copy loss (${pct.toFixed(2)}%)`;
  } else {
    const minP   = Number(trade.minProfit);
    const maxP   = Number(trade.maxProfit);
    const pct    = biasedRand(minP, maxP);
    const profit = Number(trade.amount) * (pct / 100);
    delta         = Math.round(profit * 100) / 100;
    percentUsed   = Math.round(pct * 10000) / 10000;
    activityType  = "COPY_TRADE_PROFIT";
    activityTitle = `${trade.traderName} copy profit (${pct.toFixed(2)}%)`;
  }

  // Anchor to the previous nextProfitAt so catch-up loops advance
  // correctly when the user was offline for multiple intervals.
  const { minSecs, maxSecs } = resolveCadenceSecs(trade);
  const secs = maxSecs > minSecs ? minSecs + Math.random() * (maxSecs - minSecs) : minSecs;
  const anchor = trade.nextProfitAt ?? now;
  const nextProfitAt = new Date(anchor.getTime() + Math.round(secs * 1000));
  const nextStreak   = isLoss ? (trade.consecutiveLosses ?? 0) + 1 : 0;

  // Copy-trade ticks — same split-balance rule as investment ticks:
  // do NOT touch the USD wallet. Profit + loss accumulate on
  // `trade.totalEarned` until an admin ends the trade via
  // `adminEndCopyTrade`, which releases principal + max(earned, 0) to
  // the user's Available Balance in one atomic move.
  await db.$transaction([
    db.userCopyTrade.update({
      where: { id: trade.id },
      data:  {
        totalEarned:       { increment: delta },
        lastProfitAt:      now,
        nextProfitAt,
        consecutiveLosses: nextStreak,
      },
    }),
    db.activityLog.create({
      data: {
        userId:   trade.userId,
        type:     activityType,
        title:    activityTitle,
        amount:   delta,
        percent:  percentUsed,
        currency: "USD",
      },
    }),
  ]);

  return delta;
}

/** Catch up a user's investment: loops runInvestmentTick until nothing
 *  is due or the safety cap is hit. Returns the list of signed deltas
 *  credited in this call. After the cap, the remaining ticks are left
 *  for the next poll/cron invocation. */
export async function catchUpUserInvestment(
  userId: string,
  now: Date,
  cap: number = MAX_TICKS_PER_CATCHUP,
): Promise<number[]> {
  const deltas: number[] = [];
  for (let i = 0; i < cap; i++) {
    // Re-read the row each iteration so streak/balance updates carry.
    const row = await db.userInvestment.findUnique({ where: { userId } });
    if (!row) break;
    const delta = await runInvestmentTick(row, now);
    if (delta === null) break;
    deltas.push(delta);
  }
  return deltas;
}

/** Same semantics as catchUpUserInvestment, for one UserCopyTrade row. */
export async function catchUpCopyTrade(
  tradeId: string,
  now: Date,
  cap: number = MAX_TICKS_PER_CATCHUP,
): Promise<number[]> {
  const deltas: number[] = [];
  for (let i = 0; i < cap; i++) {
    const row = await db.userCopyTrade.findUnique({ where: { id: tradeId } });
    if (!row) break;
    const delta = await runCopyTradeTick(row, now);
    if (delta === null) break;
    deltas.push(delta);
  }
  return deltas;
}
