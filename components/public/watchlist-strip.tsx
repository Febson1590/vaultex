"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { Sparkline } from "./sparkline";
import { formatCurrency } from "@/lib/utils";
import type { MarketAsset } from "@/lib/coingecko";

/* Brand color accents for the symbol tile */
const BRAND_COLOR: Record<string, string> = {
  BTC:  "#f7931a", ETH:  "#627eea", USDT: "#26a17b", BNB:  "#f3ba2f",
  SOL:  "#9945ff", XRP:  "#346aa9", ADA:  "#3cc8c8", DOGE: "#c2a633",
  AVAX: "#e84142", POL:  "#8247e5", DOT:  "#e6007a", LINK: "#2a5ada",
  LTC:  "#bebebe", UNI:  "#ff007a", ATOM: "#6f7390",
};

interface WatchlistStripProps {
  assets:   MarketAsset[];
  /** Which symbols to show in the watchlist. */
  symbols?: string[];
  className?: string;
}

/**
 * Horizontal compact watchlist — a row of clickable asset pills
 * with symbol, price, 24h change, and a tiny sparkline.
 */
export function WatchlistStrip({
  assets,
  symbols = ["BTC", "ETH", "SOL", "BNB", "XRP"],
  className,
}: WatchlistStripProps) {
  const bySymbol = Object.fromEntries(assets.map((a) => [a.symbol, a]));
  const items    = symbols
    .map((s) => bySymbol[s])
    .filter((a): a is MarketAsset => Boolean(a));

  return (
    <div className={`vx-panel ${className ?? ""}`}>
      <div className="vx-panel-header">
        <div className="vx-panel-title">
          <Star size={11} className="text-amber-400" />
          Watchlist
        </div>
        <div className="text-[10px] text-slate-600 uppercase tracking-widest hidden sm:block">
          Quick Access
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-y sm:divide-y-0 divide-white/[0.04]">
        {items.map((a) => {
          const up    = a.change >= 0;
          const color = BRAND_COLOR[a.symbol] ?? "#0ea5e9";
          return (
            <Link
              key={a.symbol}
              href="/markets"
              className="flex items-center gap-2 sm:gap-3 px-3 py-3 hover:bg-sky-500/[0.04] transition-colors duration-150 group min-w-0"
            >
              <div
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] sm:text-[10px] font-black"
                style={{ background: `${color}18`, border: `1px solid ${color}55`, color }}
              >
                {a.symbol.slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-[11.5px] sm:text-[12px] font-semibold text-white tracking-wide">
                    {a.symbol}
                  </span>
                  <span className="text-[9px] text-slate-600 hidden sm:inline">/ USD</span>
                </div>
                <div className="text-[11px] sm:text-[11.5px] font-semibold text-slate-200 tabular-nums truncate">
                  {formatCurrency(a.price)}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="hidden md:inline-block">
                  <Sparkline
                    data={a.sparkline}
                    width={38}
                    height={18}
                    up={up}
                    idSuffix={`wl-${a.symbol}`}
                  />
                </span>
                <span
                  className={`text-[10px] font-bold tabular-nums ${up ? "text-emerald-400" : "text-red-400"}`}
                >
                  {up ? "+" : ""}
                  {a.change.toFixed(2)}%
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
