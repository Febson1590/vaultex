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
