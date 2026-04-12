"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, Star, ChevronRight } from "lucide-react";
import { Sparkline } from "./sparkline";
import { formatCurrency, formatCompact, formatPercent } from "@/lib/utils";
import type { MarketAsset } from "@/lib/coingecko";

/* ─── Per-symbol brand color accents ──────────────────────────────────── */
const BRAND_COLOR: Record<string, string> = {
  BTC:  "#f7931a", ETH:  "#627eea", USDT: "#26a17b", BNB:  "#f3ba2f",
  SOL:  "#9945ff", XRP:  "#346aa9", ADA:  "#3cc8c8", DOGE: "#c2a633",
  AVAX: "#e84142", POL:  "#8247e5", DOT:  "#e6007a", LINK: "#2a5ada",
  LTC:  "#bebebe", UNI:  "#ff007a", ATOM: "#6f7390",
};

type Tab = "all" | "gainers" | "losers" | "trending" | "watchlist";

const TABS: { id: Tab; label: string }[] = [
  { id: "all",       label: "All"       },
  { id: "gainers",   label: "Gainers"   },
  { id: "losers",    label: "Losers"    },
  { id: "trending",  label: "Trending"  },
  { id: "watchlist", label: "Watchlist" },
];

interface MarketPanelProps {
  assets:     MarketAsset[];
  /** Compact mode removes the column headers and uses a tighter row height. */
  compact?:   boolean;
  /** Maximum rows to display per tab. */
  maxRows?:   number;
  /** Title shown in the panel header strip. */
  title?:     string;
  /** Optional "View all" link rendered on the right of the header. */
  viewAllHref?: string;
  className?: string;
}

export function MarketPanel({
  assets,
  compact = false,
  maxRows = 6,
  title = "Markets",
  viewAllHref,
  className,
}: MarketPanelProps) {
  const [tab, setTab]             = useState<Tab>("all");
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set(["BTC", "ETH"]));

  const filtered = useMemo(() => {
    const list = [...assets];
    switch (tab) {
      case "gainers":
        return list.filter((a) => a.change > 0).sort((a, b) => b.change - a.change).slice(0, maxRows);
      case "losers":
        return list.filter((a) => a.change < 0).sort((a, b) => a.change - b.change).slice(0, maxRows);
      case "trending":
        // Use absolute 24h % change as a proxy for trending.
        return list
          .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
          .slice(0, maxRows);
      case "watchlist":
        return list.filter((a) => watchlist.has(a.symbol)).slice(0, maxRows);
      case "all":
      default:
        return list.slice(0, maxRows);
    }
  }, [assets, tab, maxRows, watchlist]);

  function toggleWatch(symbol: string) {
    setWatchlist((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
      return next;
    });
  }

  return (
    <div className={`vx-panel ${className ?? ""}`}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="vx-panel-header">
        <div className="vx-panel-title">
          <span className="vx-panel-title-dot" />
          {title}
        </div>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="text-[11px] font-medium text-slate-400 hover:text-sky-400 inline-flex items-center gap-1 transition-colors"
          >
            View all <ChevronRight size={12} />
          </Link>
        )}
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────── */}
      <div className="px-3.5 pt-3 pb-2.5 flex items-center justify-between gap-3 flex-wrap">
        <div className="vx-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className="vx-tab"
              data-active={tab === t.id}
              onClick={() => setTab(t.id)}
              type="button"
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold hidden sm:inline-flex items-center gap-1.5">
          <span className="vx-live-dot" /> Refreshed every minute
        </div>
      </div>

      {/* ── Column headers ─────────────────────────────────────────── */}
      {!compact && (
        <div
          className="grid items-center gap-3 px-3.5 pb-2 text-[9.5px] uppercase tracking-widest text-slate-500 font-semibold border-b border-white/[0.04]"
          style={{ gridTemplateColumns: "1.8fr 1fr 0.8fr 1.1fr 0.4fr" }}
        >
          <div>Asset</div>
          <div className="text-right">Price</div>
          <div className="text-right">24h</div>
          <div className="text-right">Last 7d</div>
          <div />
        </div>
      )}

      {/* ── Rows ───────────────────────────────────────────────────── */}
      <div>
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No assets in this view yet.
          </div>
        ) : (
          filtered.map((a) => {
            const up      = a.change >= 0;
            const color   = BRAND_COLOR[a.symbol] ?? "#0ea5e9";
            const starred = watchlist.has(a.symbol);
            return (
              <div
                key={a.symbol}
                className="vx-row"
                style={{ gridTemplateColumns: "1.8fr 1fr 0.8fr 1.1fr 0.4fr", columnGap: "12px" }}
              >
                {/* Asset */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-black"
                    style={{ background: `${color}18`, border: `1px solid ${color}55`, color }}
                  >
                    {a.symbol.slice(0, 1)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-semibold text-white leading-tight truncate">
                      {a.symbol}
                      <span className="text-[10px] font-normal text-slate-500 ml-1">/USD</span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">{a.name}</div>
                  </div>
                </div>

                {/* Price */}
                <div className="text-right tabular-nums">
                  <div className="text-[12.5px] font-semibold text-white">{formatCurrency(a.price)}</div>
                  <div className="text-[9.5px] text-slate-600">Vol ${formatCompact(a.volume24h)}</div>
                </div>

                {/* 24h */}
                <div className="text-right">
                  <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold tabular-nums ${up ? "text-emerald-400" : "text-red-400"}`}>
                    {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                    {formatPercent(a.change)}
                  </span>
                </div>

                {/* Sparkline */}
                <div className="flex justify-end">
                  <Sparkline
                    data={a.sparkline}
                    width={96}
                    height={28}
                    up={up}
                    idSuffix={`${a.symbol}-${tab}`}
                  />
                </div>

                {/* Watchlist star */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => toggleWatch(a.symbol)}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-slate-600 hover:text-amber-400 hover:bg-white/[0.04] transition-colors"
                    aria-label={starred ? `Remove ${a.symbol} from watchlist` : `Add ${a.symbol} to watchlist`}
                  >
                    <Star
                      size={13}
                      strokeWidth={2}
                      fill={starred ? "#f59e0b" : "none"}
                      className={starred ? "text-amber-400" : ""}
                    />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
