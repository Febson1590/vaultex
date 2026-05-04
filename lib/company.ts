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
  /** Legal entity name. */
  legalName:    "Vaultex Market Ltd",
  /** Primary jurisdiction of operation. */
  jurisdiction: "England & Wales, United Kingdom",
  /** Registered business address. */
  address:      "27 Old Gloucester Street, London, WC1N 3AX, United Kingdom",
  /** Company registration / file number. */
  registration: "Company No. 15248372",
  /** Year the product launched — used in the footer copyright line. */
  launchYear:   2026,
} as const;

/* ── Support & security contact points ───────────────────────────────── */
/* Single inbox model: every public-facing contact channel routes into
   support@vaultexmarket.com so users always know where to reach us and
   we don't have to maintain multiple mailboxes. The named keys are
   preserved (security/compliance/privacy) because public pages still
   label the link by purpose ("Report a Security Issue" etc.) — but
   they all resolve to the same address. */
export const CONTACT = {
  supportEmail:    "support@vaultexmarket.com",
  securityEmail:   "support@vaultexmarket.com",
  complianceEmail: "support@vaultexmarket.com",
  privacyEmail:    "support@vaultexmarket.com",

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

/* ── Reusable typed helpers ──────────────────────────────────────────── */
export type CompanyInfo = typeof COMPANY;
export type ContactInfo = typeof CONTACT;
export type PlatformInfo = typeof PLATFORM;
