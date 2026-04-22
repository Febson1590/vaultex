/**
 * Duration unit helper — single source of truth for converting between
 * the canonical storage unit (seconds) and the admin-friendly display
 * units (minutes / hours).
 *
 * Every duration/interval input in the admin UI pairs a numeric field
 * with a unit selector. The UI layer reads seconds from the DB,
 * derives a sensible display (value, unit) via `secondsToDisplay`, and
 * writes seconds back via `displayToSeconds` on submit. The engine
 * always works in seconds.
 */

export type DurationUnit = "minutes" | "hours";

export const DURATION_UNITS: readonly DurationUnit[] = ["minutes", "hours"] as const;

export const UNIT_LABELS: Record<DurationUnit, string> = {
  minutes: "Minutes",
  hours:   "Hours",
};

/**
 * Turn a seconds value into a `{ value, unit }` pair suitable for the
 * admin input. Prefer hours when the value divides cleanly; otherwise
 * fall back to minutes with up to 2 decimals of precision so no data
 * is lost in the round-trip.
 *
 *   secondsToDisplay(3600)  → { value: 1,   unit: "hours"   }
 *   secondsToDisplay(90)    → { value: 1.5, unit: "minutes" }
 *   secondsToDisplay(60)    → { value: 1,   unit: "minutes" }
 *   secondsToDisplay(0)     → { value: 0,   unit: "minutes" }
 */
export function secondsToDisplay(secs: number | null | undefined): { value: number; unit: DurationUnit } {
  const s = Number(secs ?? 0);
  if (!Number.isFinite(s) || s <= 0) return { value: 0, unit: "minutes" };
  if (s >= 3600 && s % 3600 === 0) return { value: s / 3600, unit: "hours" };
  if (s % 60 === 0)                return { value: s / 60,   unit: "minutes" };
  // Non-divisible value — round to 0.01 minute precision.
  return { value: Math.round((s / 60) * 100) / 100, unit: "minutes" };
}

/**
 * Turn a `(value, unit)` pair into seconds for storage.
 *
 *   displayToSeconds(5, "minutes") → 300
 *   displayToSeconds(1, "hours")   → 3600
 *   displayToSeconds(1.5, "hours") → 5400
 */
export function displayToSeconds(value: number, unit: DurationUnit): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * (unit === "hours" ? 3600 : 60));
}

/**
 * Resolve the canonical (minSecs, maxSecs) for any plan/investment row.
 *
 * Duration is stored as seconds on `profitInterval` / `maxInterval`;
 * legacy rows carry the old hour columns. Two kinds of rows exist:
 *
 *   1. New-format (post-unification): `minDurationHours` / `maxDurationHours`
 *      are explicitly `null`. We trust `profitInterval` / `maxInterval`
 *      as-is — including short values like 60 (1 min) or 30 (30 s).
 *
 *   2. Legacy (pre-unification): the hour columns are populated AND
 *      `profitInterval` is still the 60-second placeholder. We fold the
 *      hour values into seconds.
 *
 * This ordering means a genuine 1-minute plan on the new format still
 * renders correctly instead of being mistaken for a legacy placeholder.
 */
export function resolvePlanSecs(p: {
  profitInterval?:   number | null;
  maxInterval?:      number | null;
  minDurationHours?: number | null;
  maxDurationHours?: number | null;
}): { minSecs: number; maxSecs: number } {
  const pi = Number(p.profitInterval ?? 0);
  const mi = Number(p.maxInterval    ?? 0);
  const minH = Number(p.minDurationHours ?? 0);
  const maxH = Number(p.maxDurationHours ?? 0);
  const hasLegacyHours = minH > 0 || maxH > 0;

  // New-format row — trust seconds directly. Lets genuine 1-minute
  // (60 s) cadences render as "Every 1 minute" instead of falling
  // through to a placeholder default.
  if (!hasLegacyHours) {
    if (pi > 0) return { minSecs: pi, maxSecs: mi > 0 ? mi : pi };
    return { minSecs: 0, maxSecs: 0 };
  }

  // Legacy row. Prefer seconds only if they're meaningfully above the
  // 60-second placeholder default that rows carried before the schema
  // unification. Otherwise the hour columns are the source of truth.
  if (pi > 60) {
    return { minSecs: pi, maxSecs: mi > 60 ? mi : pi };
  }
  return {
    minSecs: minH * 3600,
    maxSecs: (maxH > 0 ? maxH : minH) * 3600,
  };
}

/**
 * Canonical cycle label used everywhere — admin list, admin modal,
 * user plan card, active-investment card. Output reads naturally in
 * minutes or hours based on the underlying value.
 *
 *   planCycleLabel({ profitInterval: 3600, maxInterval: 7200 }) → "Every 1–2 hours"
 *   planCycleLabel({ profitInterval:   60, maxInterval:   60 }) → "—"   (placeholder)
 *   planCycleLabel({ profitInterval:  300, maxInterval:  900 }) → "Every 5–15 minutes"
 */
export function planCycleLabel(p: Parameters<typeof resolvePlanSecs>[0]): string {
  const { minSecs, maxSecs } = resolvePlanSecs(p);
  if (minSecs <= 0 || maxSecs <= 0) return "—";
  return formatSecondsRange(minSecs, maxSecs);
}

/**
 * Friendly human label for showing a cycle range on user-facing cards.
 *
 *   formatSecondsRange(1800, 3600)  → "Every 30–60 minutes"
 *   formatSecondsRange(3600, 3600)  → "Every 1 hour"
 *   formatSecondsRange(7200, 10800) → "Every 2–3 hours"
 */
export function formatSecondsRange(minSecs: number, maxSecs: number): string {
  const a = secondsToDisplay(minSecs);
  const b = secondsToDisplay(maxSecs);

  // Coerce both ends to the "coarser" unit when they differ so the
  // label stays readable (e.g. 60 min + 2 hr → "1-2 hours").
  const unit: DurationUnit = a.unit === "hours" || b.unit === "hours" ? "hours" : "minutes";
  const divisor = unit === "hours" ? 3600 : 60;
  const fmt = (secs: number) => {
    const v = secs / divisor;
    return Number.isInteger(v) ? String(v) : (Math.round(v * 10) / 10).toString();
  };

  const minV = fmt(minSecs);
  const maxV = fmt(maxSecs);
  if (minV === maxV) return `Every ${minV} ${unit === "hours" ? (minV === "1" ? "hour" : "hours") : (minV === "1" ? "minute" : "minutes")}`;
  return `Every ${minV}–${maxV} ${unit}`;
}
