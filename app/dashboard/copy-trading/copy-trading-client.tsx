"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Search, SlidersHorizontal, Users, Check,
  TrendingUp, ShieldCheck, ChevronDown,
} from "lucide-react";
import { KycBanner } from "@/components/dashboard/kyc-banner";
import type { KycStatus } from "@/lib/kyc";

/* ─── Types ──────────────────────────────────────────────────────────── */

interface Trader {
  id:              string;
  name:            string;
  avatarUrl:       string | null;
  country:         string | null;
  specialty:       string | null;
  winRate:         number;
  performance30d:  number;
  totalROI:        number;
  followers:       number;
  riskLevel:       string;
  minCopyAmount:   number;
  maxCopyAmount:   number | null;
  minProfit:       number;
  maxProfit:       number;
  profitInterval:  number;
  maxInterval:     number;
  alreadyCopying:  boolean;
}

interface Props {
  traders:     Trader[];
  usdBalance:  number;
  kycStatus:   KycStatus;
}

/* ─── Helpers ────────────────────────────────────────────────────────── */

function flagEmoji(code: string | null): string {
  if (!code || code.length !== 2) return "";
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65))
    .join("");
}

function initials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function avatarHue(name: string): number {
  return [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
}

type SortKey = "performance" | "winRate" | "followers" | "risk";
const SORT_OPTS: { key: SortKey; label: string }[] = [
  { key: "performance", label: "Best performance" },
  { key: "winRate",     label: "Highest win rate" },
  { key: "followers",   label: "Most followers"   },
  { key: "risk",        label: "Lowest risk"       },
];

const RISK_ORDER: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };

/* ══════════════════════════════════════════════════════════════════════
   Copy Trading — list page
══════════════════════════════════════════════════════════════════════ */

export default function CopyTradingClient({ traders, usdBalance, kycStatus }: Props) {
  void usdBalance; // balance is only used inside the detail page

  const router = useRouter();
  const isRestricted = kycStatus !== "approved";

  const [query,    setQuery]    = useState("");
  const [sort,     setSort]     = useState<SortKey>("performance");
  const [showSort, setShowSort] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = traders;
    if (q) {
      list = list.filter((t) =>
        t.name.toLowerCase().includes(q) ||
        (t.specialty?.toLowerCase().includes(q) ?? false) ||
        (t.country?.toLowerCase().includes(q) ?? false)
      );
    }
    const sorted = [...list];
    switch (sort) {
      case "winRate":     sorted.sort((a, b) => b.winRate - a.winRate); break;
      case "followers":   sorted.sort((a, b) => b.followers - a.followers); break;
      case "risk":        sorted.sort((a, b) => (RISK_ORDER[a.riskLevel] ?? 2) - (RISK_ORDER[b.riskLevel] ?? 2)); break;
      case "performance":
      default:            sorted.sort((a, b) => b.performance30d - a.performance30d); break;
    }
    return sorted;
  }, [traders, query, sort]);

  return (
    <div className="space-y-5 max-w-2xl mx-auto">

      {/* ── Header ───────────────────────────────────────────────── */}
      <div>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft size={14} />
          Back
        </button>
        <h1 className="text-2xl font-bold text-white">Copy Trading</h1>
        <p className="text-sm text-slate-500 mt-1">Follow top traders automatically.</p>
      </div>

      {/* ── KYC banner ───────────────────────────────────────────── */}
      {isRestricted && <KycBanner kycStatus={kycStatus} />}

      {/* ── Search + filter row ──────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search traders"
            className="w-full h-11 pl-9 pr-3 text-[13px] bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500/40"
          />
        </div>

        <div className="relative">
          <button
            onClick={() => setShowSort((v) => !v)}
            className="h-11 px-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-200 bg-white/[0.03] border border-white/[0.08] rounded-xl hover:bg-white/[0.05] transition-colors"
          >
            <SlidersHorizontal size={13} /> Filter
            <ChevronDown size={11} className={`text-slate-500 transition-transform ${showSort ? "rotate-180" : ""}`} />
          </button>
          {showSort && (
            <div
              className="absolute right-0 top-12 z-30 min-w-[180px] rounded-xl border border-white/[0.08] shadow-2xl"
              style={{ background: "rgba(8,14,28,0.98)" }}
            >
              {SORT_OPTS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => { setSort(opt.key); setShowSort(false); }}
                  className="w-full text-left px-3.5 py-2.5 text-[12.5px] text-slate-300 hover:bg-white/[0.04] flex items-center justify-between first:rounded-t-xl last:rounded-b-xl"
                >
                  {opt.label}
                  {sort === opt.key && <Check size={12} className="text-sky-400" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Traders list ─────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyState hasQuery={query.length > 0} />
      ) : (
        <div className="space-y-3">
          {filtered.map((trader) => (
            <TraderCard
              key={trader.id}
              trader={trader}
              disabled={isRestricted}
            />
          ))}
        </div>
      )}

      {/* ── Footer disclaimer ────────────────────────────────────── */}
      <div className="pt-2 pb-1 text-center">
        <p className="text-[11.5px] text-slate-500">
          Copy trading involves risk. Past performance is not a guarantee of future results.
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Trader card
══════════════════════════════════════════════════════════════════════ */

function TraderCard({ trader, disabled }: { trader: Trader; disabled: boolean }) {
  const up = trader.performance30d >= 0;
  const hue = avatarHue(trader.name);
  const href = `/dashboard/copy-trading/${trader.id}`;

  function handleCtaClick(e: React.MouseEvent) {
    if (disabled) {
      e.preventDefault();
      e.stopPropagation();
      toast.error("Complete identity verification to continue.");
    }
    // Otherwise let the Link wrapper handle navigation
  }

  return (
    <Link
      href={href}
      className="block rounded-2xl border border-white/[0.06] hover:border-sky-500/25 transition-colors overflow-hidden"
      style={{ background: "rgba(10,18,34,0.7)" }}
    >
      <div className="p-4 sm:p-5 flex items-center gap-4">

        {/* Avatar */}
        <div className="flex-shrink-0">
          {trader.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={trader.avatarUrl}
              alt={trader.name}
              className="w-14 h-14 rounded-full object-cover border border-white/10"
            />
          ) : (
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{
                background: `hsl(${hue} 55% 22%)`,
                border: `1px solid hsl(${hue} 55% 32%)`,
              }}
            >
              {initials(trader.name)}
            </div>
          )}
        </div>

        {/* Name + performance + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-bold text-white truncate">{trader.name}</h3>
            {trader.country && (
              <span className="text-[15px] leading-none" aria-label={trader.country}>
                {flagEmoji(trader.country)}
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-2 mt-1">
            <span
              className={`text-[15px] font-bold tabular-nums ${up ? "text-emerald-400" : "text-red-400"}`}
            >
              {up ? "+" : ""}
              {trader.performance30d.toFixed(1)}%
            </span>
            <span className="text-[11px] text-slate-500">30d</span>
          </div>

          <div className="flex items-center gap-3 mt-1 text-[11.5px] text-slate-500">
            {trader.winRate > 0 && (
              <span className="flex items-center gap-1">
                <TrendingUp size={11} className="text-slate-500" />
                {trader.winRate.toFixed(0)}% win rate
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users size={11} className="text-slate-500" />
              {trader.followers.toLocaleString()}
            </span>
          </div>
        </div>

        {/* CTA */}
        <Button
          disabled={disabled}
          className="hidden sm:inline-flex h-9 px-4 bg-sky-500 hover:bg-sky-400 text-white font-semibold text-[12.5px] disabled:opacity-50 flex-shrink-0"
          onClick={handleCtaClick}
        >
          {trader.alreadyCopying ? "View" : "Copy Trader"}
        </Button>
      </div>
    </Link>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Empty state
══════════════════════════════════════════════════════════════════════ */

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] p-10 text-center"
      style={{ background: "rgba(10,18,34,0.7)" }}>
      <div className="w-12 h-12 rounded-2xl bg-sky-500/[0.08] flex items-center justify-center mx-auto mb-4">
        <Users size={20} className="text-sky-400/60" />
      </div>
      <h2 className="text-[15px] font-bold text-white mb-1.5">
        {hasQuery ? "No traders match your search" : "No traders available yet"}
      </h2>
      <p className="text-[12.5px] text-slate-500 max-w-sm mx-auto leading-relaxed">
        {hasQuery
          ? "Try a different search term or adjust the filter."
          : "Copy traders haven't been configured by the platform admin yet."}
      </p>
      {!hasQuery && (
        <div className="mt-4 inline-flex items-center gap-1.5 text-[11px] text-slate-600">
          <ShieldCheck size={11} className="text-slate-500" />
          Verified traders only
        </div>
      )}
    </div>
  );
}
