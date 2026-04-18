/**
 * Country registry used by the admin Copy Trader form and anywhere else
 * we need a country selector.
 *
 * Only the ISO 3166-1 alpha-2 `code` is persisted in the database.
 * Flags are derived in the UI via `flagEmoji(code)` — do NOT store emojis
 * or images.
 */

export interface Country {
  code: string;   // ISO alpha-2, uppercase (US, GB, SG…)
  name: string;
}

/** Pragmatic list of popular trading jurisdictions + common user countries. */
export const COUNTRIES: Country[] = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "NZ", name: "New Zealand" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "PT", name: "Portugal" },
  { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" },
  { code: "CH", name: "Switzerland" },
  { code: "AT", name: "Austria" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "IS", name: "Iceland" },
  { code: "IE", name: "Ireland" },
  { code: "PL", name: "Poland" },
  { code: "CZ", name: "Czechia" },
  { code: "GR", name: "Greece" },
  { code: "TR", name: "Türkiye" },
  { code: "RU", name: "Russia" },
  { code: "UA", name: "Ukraine" },
  { code: "IL", name: "Israel" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "QA", name: "Qatar" },
  { code: "EG", name: "Egypt" },
  { code: "ZA", name: "South Africa" },
  { code: "NG", name: "Nigeria" },
  { code: "KE", name: "Kenya" },
  { code: "GH", name: "Ghana" },
  { code: "MA", name: "Morocco" },
  { code: "IN", name: "India" },
  { code: "PK", name: "Pakistan" },
  { code: "BD", name: "Bangladesh" },
  { code: "ID", name: "Indonesia" },
  { code: "MY", name: "Malaysia" },
  { code: "SG", name: "Singapore" },
  { code: "TH", name: "Thailand" },
  { code: "VN", name: "Vietnam" },
  { code: "PH", name: "Philippines" },
  { code: "HK", name: "Hong Kong" },
  { code: "TW", name: "Taiwan" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "CN", name: "China" },
  { code: "BR", name: "Brazil" },
  { code: "AR", name: "Argentina" },
  { code: "CL", name: "Chile" },
  { code: "CO", name: "Colombia" },
  { code: "MX", name: "Mexico" },
  { code: "PE", name: "Peru" },
  { code: "UY", name: "Uruguay" },
];

/** Sort A→Z by display name — cached once at module load. */
export const COUNTRIES_SORTED: Country[] = [...COUNTRIES].sort((a, b) =>
  a.name.localeCompare(b.name),
);

const CODE_TO_NAME: Record<string, string> = Object.fromEntries(
  COUNTRIES.map((c) => [c.code, c.name]),
);

/** Map an ISO code back to its display name, or null if unknown. */
export function countryName(code: string | null | undefined): string | null {
  if (!code) return null;
  return CODE_TO_NAME[code.toUpperCase()] ?? null;
}

/**
 * Convert a 2-letter ISO country code into the corresponding Unicode
 * regional-indicator sequence ("GB" → 🇬🇧). Returns "" when the input
 * isn't exactly two letters so callers can safely fall back.
 */
export function flagEmoji(code: string | null | undefined): string {
  if (!code || code.length !== 2) return "";
  const letters = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(letters)) return "";
  return [...letters]
    .map((ch) => String.fromCodePoint(0x1f1e6 + ch.charCodeAt(0) - 65))
    .join("");
}
