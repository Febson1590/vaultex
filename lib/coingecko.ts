/**
 * CoinGecko market data utility
 * Fetches live prices + 24h % change for the 15 core assets.
 * Caches server-side for 60 seconds with Next.js fetch caching.
 * Returns static fallback values if the API is unavailable.
 */

/* ── Symbol / name map keyed by CoinGecko coin ID ─────────────────────── */
const COIN_MAP: Record<string, { symbol: string; name: string }> = {
  "bitcoin":       { symbol: "BTC",  name: "Bitcoin"   },
  "ethereum":      { symbol: "ETH",  name: "Ethereum"  },
  "tether":        { symbol: "USDT", name: "Tether"    },
  "binancecoin":   { symbol: "BNB",  name: "BNB"       },
  "solana":        { symbol: "SOL",  name: "Solana"    },
  "ripple":        { symbol: "XRP",  name: "XRP"       },
  "cardano":       { symbol: "ADA",  name: "Cardano"   },
  "dogecoin":      { symbol: "DOGE", name: "Dogecoin"  },
  "avalanche-2":   { symbol: "AVAX", name: "Avalanche" },
  "matic-network": { symbol: "MATIC",name: "Polygon"   },
  "polkadot":      { symbol: "DOT",  name: "Polkadot"  },
  "chainlink":     { symbol: "LINK", name: "Chainlink" },
  "litecoin":      { symbol: "LTC",  name: "Litecoin"  },
  "uniswap":       { symbol: "UNI",  name: "Uniswap"   },
  "cosmos":        { symbol: "ATOM", name: "Cosmos"    },
};

const IDS     = Object.keys(COIN_MAP).join(",");
const API_URL = `https://api.coingecko.com/api/v3/simple/price?ids=${IDS}&vs_currencies=usd&include_24hr_change=true`;

/* ── Exported type ─────────────────────────────────────────────────────── */
export interface TickerItem {
  symbol: string;
  name:   string;
  price:  number;
  change: number;
}

/* ── Static fallback — used when CoinGecko is unreachable ──────────────── */
const STATIC_FALLBACK: TickerItem[] = [
  { symbol: "BTC",  name: "Bitcoin",   price: 84231.50, change:  2.34 },
  { symbol: "ETH",  name: "Ethereum",  price:  3921.80, change:  1.87 },
  { symbol: "USDT", name: "Tether",    price:     1.00, change:  0.01 },
  { symbol: "BNB",  name: "BNB",       price:   621.40, change:  3.12 },
  { symbol: "SOL",  name: "Solana",    price:   182.60, change:  4.21 },
  { symbol: "XRP",  name: "XRP",       price:     0.62, change: -0.82 },
  { symbol: "ADA",  name: "Cardano",   price:     0.58, change:  1.24 },
  { symbol: "DOGE", name: "Dogecoin",  price:     0.18, change:  5.63 },
  { symbol: "AVAX", name: "Avalanche", price:    42.18, change: -1.34 },
  { symbol: "MATIC",name: "Polygon",   price:     0.93, change:  2.09 },
  { symbol: "DOT",  name: "Polkadot",  price:     8.21, change:  0.73 },
  { symbol: "LINK", name: "Chainlink", price:    18.52, change:  2.94 },
  { symbol: "LTC",  name: "Litecoin",  price:    98.34, change: -0.45 },
  { symbol: "UNI",  name: "Uniswap",   price:    12.64, change:  3.41 },
  { symbol: "ATOM", name: "Cosmos",    price:     9.82, change:  1.16 },
];

/* ── Fetcher — 60-second server-side cache ─────────────────────────────── */
export async function getLiveTickers(): Promise<TickerItem[]> {
  try {
    const res = await fetch(API_URL, {
      next: { revalidate: 60 }, // ISR-style: fresh every 60 s
    });

    if (!res.ok) throw new Error(`CoinGecko responded ${res.status}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, { usd: number; usd_24h_change: number }> = await res.json();

    return Object.entries(COIN_MAP).map(([id, { symbol, name }]) => ({
      symbol,
      name,
      price:  data[id]?.usd             ?? 0,
      change: data[id]?.usd_24h_change  ?? 0,
    }));
  } catch {
    // Silently fall back to static data — UI stays intact
    return STATIC_FALLBACK;
  }
}
