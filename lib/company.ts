/**
 * Central source of truth for company, contact, and platform-identity
 * information that appears on public marketing pages.
 *
 * Most fields default to *placeholder* values that are clearly marked
 * "to be confirmed" so the codebase never silently ships invented legal
 * or corporate details. Fill in real values here when they become
 * available and every public page will pick them up automatically.
 */

/* ── Legal / corporate identity ──────────────────────────────────────── */
export const COMPANY = {
  /** The public product/brand name — never a placeholder. */
  brand:        "Vaultex Market",
  /** Legal entity name — placeholder until registered. */
  legalName:    "Vaultex Market (trading name)",
  /** Primary jurisdiction of operation. */
  jurisdiction: "To be confirmed",
  /** Registered business address. */
  address:      "To be confirmed",
  /** Company registration / file number, if any. */
  registration: "To be confirmed",
  /** Year the product launched — used in the footer copyright line. */
  launchYear:   2026,
} as const;

/* ── Support & security contact points ───────────────────────────────── */
export const CONTACT = {
  supportEmail:    "support@vaultexmarket.com",
  securityEmail:   "security@vaultexmarket.com",
  complianceEmail: "compliance@vaultexmarket.com",
  privacyEmail:    "privacy@vaultexmarket.com",

  /** Human-readable business hours. Keep it simple and specific. */
  businessHours:   "Monday – Friday, 09:00 – 18:00 UTC",
  /** Response window for general support tickets. */
  generalResponseWindow:  "within one business day",
  /** Response window for responsible-disclosure security reports. */
  securityResponseWindow: "within one business day",
} as const;

/* ── Platform metrics that appear on marketing pages ─────────────────── */
/**
 * All "how many assets / pairs / etc." numbers the public site quotes
 * live here. Keep them in lockstep with `lib/coingecko.ts` so we never
 * say "50+ assets" when only 15 are actually listed.
 */
export const PLATFORM = {
  /** Number of digital assets surfaced on the public markets page. */
  listedAssets: 15,
  /** Quote currency used across the site (USD pairs). */
  quoteCurrency: "USD",
  /** Kinds of orders the dashboard lets users place. */
  orderTypes: ["Market", "Limit", "Stop"] as const,
  /** Typical cadence at which server-side market data is revalidated.
   *  Paired with `revalidate: 60` in lib/coingecko.ts. Pages display
   *  a neutral "market snapshot" label rather than claiming live data. */
  dataFreshnessMinutes: 1,
} as const;

/* ── Risk & regulatory stance ────────────────────────────────────────── */
export const RISK_NOTICE =
  "Trading digital assets involves risk, including the potential loss of principal. " +
  "Only trade funds you can afford to lose.";

export const SHORT_RISK_NOTICE =
  "Digital-asset trading carries risk of loss.";

/* ── Reusable typed helpers ──────────────────────────────────────────── */
export type CompanyInfo = typeof COMPANY;
export type ContactInfo = typeof CONTACT;
export type PlatformInfo = typeof PLATFORM;
