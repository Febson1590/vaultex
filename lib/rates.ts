import "server-only";
import { getMarketAssets } from "@/lib/coingecko";

/**
 * Lightweight crypto → USD rate map. Used by the Deposit and Withdraw
 * forms so the dual USD/crypto inputs can two-way convert live.
 *
 * The underlying source (`getMarketAssets`) is cached server-side for
 * 60 s and falls back to static prices when CoinGecko is unreachable,
 * so this helper never returns an empty or zero rate.
 */

export type CryptoSymbol = "BTC" | "ETH" | "USDT" | "BNB" | "SOL";

export interface CryptoRates {
  /** Price of 1 unit of the symbol, denominated in USD. */
  [symbol: string]: number;
}

const TRACKED: CryptoSymbol[] = ["BTC", "ETH", "USDT", "BNB", "SOL"];

/** Hard-coded fallback used if `getMarketAssets` somehow returns empty. */
const HARD_FALLBACK: Record<CryptoSymbol, number> = {
  BTC:  84231.50,
  ETH:   3921.80,
  USDT:     1.00,
  BNB:    621.40,
  SOL:    182.60,
};

export async function getCryptoRates(): Promise<CryptoRates> {
  try {
    const assets = await getMarketAssets();
    const bySymbol = new Map<string, number>();
    for (const a of assets) bySymbol.set(a.symbol, a.price);

    const rates: CryptoRates = {};
    for (const sym of TRACKED) {
      const live = bySymbol.get(sym);
      rates[sym] = live && live > 0 ? live : HARD_FALLBACK[sym];
    }
    return rates;
  } catch {
    return { ...HARD_FALLBACK };
  }
}
