"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, ChevronRight } from "lucide-react";
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

type Tab = "all" | "gainers" | "losers" | "trending";

const TABS: { id: Tab; label: string }[] = [
  { id: "all",      label: "All"      },
  { id: "gainers",  label: "Gainers"  },
  { id: "losers",   label: "Losers"   },
  { id: "trending", label: "Trending" },
];

interface MarketPanelProps {
  assets:     MarketAsset[];
  /** Maximum rows per tab. */
  maxRows?:   number;
  /** Title shown in the panel header strip. */
  title?:     string;
  /** Optional "View all" link rendered on the right of the header. */
  viewAllHref?: string;
  className?: string;
}

export function MarketPanel({
  assets,
  maxRows = 6,
  title = "Markets",
  viewAllHref,
  className,
}: MarketPanelProps) {
  const [tab, setTab] = useState<Tab>("all");

  const filtered = useMemo(() => {
    const list = [...assets];
    switch (tab) {
      case "gainers":
        return list.filter((a) => a.change > 0).sort((a, b) => b.change - a.change).slice(0, maxRows);
      case "losers":
        return list.filter((a) => a.change < 0).sort((a, b) => a.change - b.change).slice(0, maxRows);
      case "trending":
        return list.sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, maxRows);
      case "all":
      default:
        return list.slice(0, maxRows);
    }
  }, [assets, tab, maxRows]);

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

      {/* ── Tabs row ───────────────────────────────────────────────── */}
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
      <div className="vx-market-grid items-center px-3.5 pb-1.5 text-[9.5px] uppercase tracking-widest text-slate-500 font-semibold border-b border-white/[0.05]">
        <div>Asset</div>
        <div className="text-right">Price</div>
        <div className="text-right">24h</div>
        <div className="text-right hidden sm:block">Vol 24h</div>
        <div className="text-right hidden md:block">Market Cap</div>
        <div className="text-right hidden sm:block">Last 7d</div>
      </div>

      {/* ── Rows ───────────────────────────────────────────────────── */}
      <div>
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No assets in this view.
          </div>
        ) : (
          filtered.map((a) => {
            const up    = a.change >= 0;
            const color = BRAND_COLOR[a.symbol] ?? "#0ea5e9";
            return (
              <div
                key={a.symbol}
                className="vx-row vx-market-grid"
                style={{ padding: "9px 14px" }}
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
                </div>

                {/* 24h % */}
                <div className="text-right">
                  <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold tabular-nums ${up ? "text-emerald-400" : "text-red-400"}`}>
                    {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                    {formatPercent(a.change)}
                  </span>
                </div>

                {/* Volume */}
                <div className="hidden sm:block text-right text-[11.5px] text-slate-400 tabular-nums">
                  ${formatCompact(a.volume24h)}
                </div>

                {/* Market cap */}
                <div className="hidden md:block text-right text-[11.5px] text-slate-400 tabular-nums">
                  ${formatCompact(a.marketCap)}
                </div>

                {/* Sparkline */}
                <div className="hidden sm:flex justify-end">
                  <Sparkline
                    data={a.sparkline}
                    width={96}
                    height={26}
                    up={up}
                    idSuffix={`${a.symbol}-${tab}`}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
