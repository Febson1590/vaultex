/**
 * Unified market data source for all public-facing sections.
 *
 * Every public UI surface (ticker bar, homepage market overview,
 * markets page, etc.) consumes this single function so that prices,
 * percentages, volumes, and market caps are always consistent.
 *
 * - Primary source: CoinGecko /coins/markets
 * - Cached server-side for 60 seconds (ISR-style)
 * - If the API fails OR returns missing/zero values for a coin,
 *   a static fallback is merged in — never leaving gaps like $0.00.
 */

/* ── Canonical asset list (CoinGecko IDs) ──────────────────────────────── */
const COIN_MAP: Record<
  string,
  { symbol: string; name: string; rank: number }
> = {
  "bitcoin":                 { symbol: "BTC",  name: "Bitcoin",   rank: 1  },
  "ethereum":                { symbol: "ETH",  name: "Ethereum",  rank: 2  },
  "tether":                  { symbol: "USDT", name: "Tether",    rank: 3  },
  "binancecoin":             { symbol: "BNB",  name: "BNB",       rank: 4  },
  "solana":                  { symbol: "SOL",  name: "Solana",    rank: 5  },
  "ripple":                  { symbol: "XRP",  name: "XRP",       rank: 6  },
  "cardano":                 { symbol: "ADA",  name: "Cardano",   rank: 7  },
  "dogecoin":                { symbol: "DOGE", name: "Dogecoin",  rank: 8  },
  "avalanche-2":             { symbol: "AVAX", name: "Avalanche", rank: 9  },
  "polygon-ecosystem-token": { symbol: "POL",  name: "Polygon",   rank: 10 },
  "polkadot":                { symbol: "DOT",  name: "Polkadot",  rank: 11 },
  "chainlink":               { symbol: "LINK", name: "Chainlink", rank: 12 },
  "litecoin":                { symbol: "LTC",  name: "Litecoin",  rank: 13 },
  "uniswap":                 { symbol: "UNI",  name: "Uniswap",   rank: 14 },
  "cosmos":                  { symbol: "ATOM", name: "Cosmos",    rank: 15 },
};

const IDS = Object.keys(COIN_MAP).join(",");
const API_URL =
  `https://api.coingecko.com/api/v3/coins/markets` +
  `?vs_currency=usd&ids=${IDS}` +
  `&order=market_cap_desc&per_page=50&page=1&sparkline=false` +
  `&price_change_percentage=24h`;

/* ── Exported type ─────────────────────────────────────────────────────── */
export interface MarketAsset {
  id:           string;
  symbol:       string;
  name:         string;
  price:        number;
  change:       number;
  marketCap:    number;
  volume24h:    number;
  supply:       number;
  rank:         number;
}

/** Legacy alias — keeps existing imports working */
export type TickerItem = MarketAsset;

/* ── Static fallback — used when CoinGecko is unreachable or partial ──── */
const STATIC_FALLBACK: Record<string, Omit<MarketAsset, "id" | "symbol" | "name" | "rank">> = {
  BTC:  { price: 84231.50, change:  2.34, marketCap: 1_660_000_000_000, volume24h: 28_400_000_000, supply:    19_700_000 },
  ETH:  { price:  3921.80, change:  1.87, marketCap:   471_000_000_000, volume24h: 14_900_000_000, supply:   120_300_000 },
  USDT: { price:     1.00, change:  0.01, marketCap:   120_000_000_000, volume24h: 45_000_000_000, supply:   120_000_000_000 },
  BNB:  { price:   621.40, change:  3.12, marketCap:    90_500_000_000, volume24h:  1_600_000_000, supply:       145_900_000 },
  SOL:  { price:   182.60, change:  4.21, marketCap:    85_700_000_000, volume24h:  3_100_000_000, supply:       469_000_000 },
  XRP:  { price:     0.62, change: -0.82, marketCap:    34_200_000_000, volume24h:  1_200_000_000, supply:    55_100_000_000 },
  ADA:  { price:     0.58, change:  1.24, marketCap:    20_400_000_000, volume24h:    420_000_000, supply:    35_200_000_000 },
  DOGE: { price:     0.18, change:  5.63, marketCap:    25_700_000_000, volume24h:    980_000_000, supply:   142_700_000_000 },
  AVAX: { price:    42.18, change: -1.34, marketCap:    16_200_000_000, volume24h:    510_000_000, supply:       384_000_000 },
  POL:  { price:     0.93, change:  2.09, marketCap:     9_100_000_000, volume24h:    290_000_000, supply:     9_850_000_000 },
  DOT:  { price:     8.21, change:  0.73, marketCap:    11_300_000_000, volume24h:    240_000_000, supply:     1_380_000_000 },
  LINK: { price:    18.52, change:  2.94, marketCap:    11_100_000_000, volume24h:    490_000_000, supply:       600_000_000 },
  LTC:  { price:    98.34, change: -0.45, marketCap:     7_400_000_000, volume24h:    510_000_000, supply:        75_400_000 },
  UNI:  { price:    12.64, change:  3.41, marketCap:     7_600_000_000, volume24h:    220_000_000, supply:       600_000_000 },
  ATOM: { price:     9.82, change:  1.16, marketCap:     3_900_000_000, volume24h:    110_000_000, supply:       395_000_000 },
};

function buildFallback(): MarketAsset[] {
  return Object.entries(COIN_MAP).map(([id, meta]) => ({
    id,
    symbol: meta.symbol,
    name:   meta.name,
    rank:   meta.rank,
    ...STATIC_FALLBACK[meta.symbol],
  }));
}

/* ── CoinGecko API row (only the fields we consume) ───────────────────── */
interface CoinGeckoRow {
  id:                            string;
  current_price:                 number | null;
  price_change_percentage_24h:   number | null;
  market_cap:                    number | null;
  total_volume:                  number | null;
  circulating_supply:            number | null;
}

/* ── Helpers ───────────────────────────────────────────────────────────── */
function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

/**
 * Fetch and return a unified list of market assets, in canonical rank order.
 * Any coin that the upstream API fails to return (or returns zero/null for)
 * is transparently patched from the static fallback so the UI never shows
 * a $0.00 price.
 */
export async function getMarketAssets(): Promise<MarketAsset[]> {
  const fallback = buildFallback();

  let rows: CoinGeckoRow[] = [];
  try {
    const res = await fetch(API_URL, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error(`CoinGecko responded ${res.status}`);
    rows = (await res.json()) as CoinGeckoRow[];
  } catch {
    return fallback;
  }

  const byId = new Map<string, CoinGeckoRow>();
  for (const row of rows) byId.set(row.id, row);

  return fallback.map((fb) => {
    const live = byId.get(fb.id);
    if (!live) return fb;

    const price     = isFiniteNumber(live.current_price)               && live.current_price! > 0 ? live.current_price!               : fb.price;
    const change    = isFiniteNumber(live.price_change_percentage_24h)                             ? live.price_change_percentage_24h! : fb.change;
    const marketCap = isFiniteNumber(live.market_cap)                  && live.market_cap!    > 0 ? live.market_cap!                  : fb.marketCap;
    const volume24h = isFiniteNumber(live.total_volume)                && live.total_volume!  > 0 ? live.total_volume!                : fb.volume24h;
    const supply    = isFiniteNumber(live.circulating_supply)          && live.circulating_supply! > 0 ? live.circulating_supply!    : fb.supply;

    return { ...fb, price, change, marketCap, volume24h, supply };
  });
}

/** @deprecated Use getMarketAssets() — kept for backwards compatibility. */
export const getLiveTickers = getMarketAssets;
