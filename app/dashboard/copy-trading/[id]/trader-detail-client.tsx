"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Users, ShieldCheck, AlertTriangle,
  TrendingUp, ArrowDownToLine, Loader2,
} from "lucide-react";
import { userStartCopyTrade } from "@/lib/actions/investment";
import { formatCurrency } from "@/lib/utils";
import { KycBanner } from "@/components/dashboard/kyc-banner";
import type { KycStatus } from "@/lib/kyc";

/* ─── Types ──────────────────────────────────────────────────────────── */

interface Trader {
  id:              string;
  name:            string;
  avatarUrl:       string | null;
  country:         string | null;
  specialty:       string | null;
  description:     string | null;
  winRate:         number;
  performance30d:  number;
  totalROI:        number;
  followers:       number;
  riskLevel:       string;
  totalTrades:     number;
  successfulTrades: number;
  failedTrades:    number;
  maxDrawdown:     number;
  minCopyAmount:   number;
  maxCopyAmount:   number | null;
  minProfit:       number;
  maxProfit:       number;
  profitInterval:  number;
  maxInterval:     number;
}

interface AlreadyCopying {
  id:          string;
  amount:      number;
  totalEarned: number;
}

interface Props {
  trader:          Trader;
  alreadyCopying:  AlreadyCopying | null;
  usdBalance:      number;
  kycStatus:       KycStatus;
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

/**
 * Generate 30 daily points that end at +performance30d% and start at 0%.
 * Uses a seeded wobble so the same trader always shows the same shape.
 */
function buildPerformanceSeries(name: string, targetPct: number): { label: string; value: number }[] {
  const N    = 30;
  const end  = targetPct;
  const seed = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);

  const today = new Date();
  const points: { label: string; value: number }[] = [];

  for (let i = 0; i < N; i++) {
    const t      = i / (N - 1);
    // Ease the curve a bit so it feels more like a real P/L line
    const eased  = t * t * (3 - 2 * t);
    const trend  = eased * end;
    const wobble = Math.sin(i * 1.3 + seed) * Math.max(0.4, Math.abs(end) * 0.08);
    const value  = trend + wobble;
    const date   = new Date(today);
    date.setDate(today.getDate() - (N - 1 - i));
    points.push({
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value,
    });
  }
  return points;
}

const RISK_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  LOW:    { label: "Low risk",    color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  MEDIUM: { label: "Medium risk", color: "text-yellow-400",  bg: "bg-yellow-500/10",  border: "border-yellow-500/20" },
  HIGH:   { label: "High risk",   color: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/20" },
};

/* ══════════════════════════════════════════════════════════════════════
   Trader detail page
══════════════════════════════════════════════════════════════════════ */

export default function TraderDetailClient({
  trader, alreadyCopying, usdBalance, kycStatus,
}: Props) {
  const router = useRouter();
  const isRestricted = kycStatus !== "approved";

  const [showCopy, setShowCopy] = useState(false);

  const perfSeries = useMemo(
    () => buildPerformanceSeries(trader.name, trader.performance30d),
    [trader.name, trader.performance30d],
  );

  const up = trader.performance30d >= 0;
  const hue = avatarHue(trader.name);
  const risk = RISK_META[trader.riskLevel] ?? RISK_META.MEDIUM;

  function handleStartCopying() {
    if (isRestricted) {
      toast.error("Complete identity verification to continue.");
      return;
    }
    if (alreadyCopying) {
      toast.error(`You are already copying ${trader.name}`);
      return;
    }
    setShowCopy(true);
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto pb-16">

      {/* ── Back ─────────────────────────────────────────────────── */}
      <div>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          {trader.name}
        </button>
      </div>

      {/* ── KYC banner ───────────────────────────────────────────── */}
      {isRestricted && <KycBanner kycStatus={kycStatus} />}

      {/* ── Profile section ──────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        {/* Avatar */}
        {trader.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={trader.avatarUrl}
            alt={trader.name}
            className="w-20 h-20 rounded-full object-cover border border-white/10 flex-shrink-0"
          />
        ) : (
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
            style={{
              background: `hsl(${hue} 55% 22%)`,
              border: `1px solid hsl(${hue} 55% 32%)`,
            }}
          >
            {initials(trader.name)}
          </div>
        )}

        {/* Name + country + performance */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white truncate">{trader.name}</h1>
            {trader.country && (
              <span className="text-2xl leading-none" aria-label={trader.country}>
                {flagEmoji(trader.country)}
              </span>
            )}
          </div>
          {trader.specialty && (
            <p className="text-[12.5px] text-slate-500 mt-0.5">{trader.specialty}</p>
          )}
        </div>
      </div>

      {/* ── Quick stats row ──────────────────────────────────────── */}
      <div className="flex items-center gap-0 divide-x divide-white/[0.06] border-y border-white/[0.06] py-3">
        <QuickStat
          icon={<Users size={13} className="text-slate-400" />}
          label="Followers"
          value={trader.followers.toLocaleString()}
        />
        <QuickStat
          icon={<TrendingUp size={13} className="text-slate-400" />}
          label="Win rate"
          value={trader.winRate > 0 ? `${trader.winRate.toFixed(0)}%` : "—"}
        />
        <QuickStat
          icon={<AlertTriangle size={13} className={risk.color} />}
          label="Risk level"
          value={risk.label.replace(" risk", "")}
          valueClass={risk.color}
        />
      </div>

      {/* ── Performance chart ────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[13px] font-semibold text-slate-300">Performance</h2>
          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
            Last 30 days
          </span>
        </div>
        <PerformanceChart series={perfSeries} up={up} />
      </div>

      {/* ── Action: Start Copying ────────────────────────────────── */}
      {alreadyCopying ? (
        <div className="rounded-2xl p-5 border border-emerald-500/20 bg-emerald-500/[0.04]">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-[13.5px] font-semibold text-white">You&apos;re copying this trader</div>
              <div className="text-[12px] text-slate-400 mt-1">
                Amount: <span className="text-white font-semibold tabular-nums">{formatCurrency(alreadyCopying.amount)}</span>
                <span className="mx-1.5 text-slate-600">·</span>
                Earned: <span className="text-emerald-400 font-semibold tabular-nums">{formatCurrency(alreadyCopying.totalEarned)}</span>
              </div>
            </div>
          </div>
          <Link href="/dashboard" className="block mt-4">
            <Button className="w-full h-11 bg-sky-500 hover:bg-sky-400 text-white font-semibold text-[13px]">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      ) : (
        <Button
          onClick={handleStartCopying}
          disabled={isRestricted}
          className="w-full h-12 bg-sky-500 hover:bg-sky-400 text-white font-semibold text-[14px] disabled:opacity-50"
        >
          {isRestricted ? "Verification Required" : "Start Copying"}
        </Button>
      )}

      {/* ── Risk disclaimer ──────────────────────────────────────── */}
      <p className="text-[11.5px] text-slate-500 leading-relaxed text-center px-2">
        Copy trading involves risk. Past performance is not a guarantee of future results.
        You may lose part or all of the amount you allocate.
      </p>

      {/* ── Copy modal ───────────────────────────────────────────── */}
      {showCopy && (
        <CopyModal
          trader={trader}
          usdBalance={usdBalance}
          onClose={() => setShowCopy(false)}
          onSuccess={() => {
            setShowCopy(false);
            router.push("/dashboard");
          }}
        />
      )}
    </div>
  );
}

/* ── Quick stat cell (used in the horizontal divided row) ────────────── */

function QuickStat({
  icon, label, value, valueClass = "",
}: {
  icon:       React.ReactNode;
  label:      string;
  value:      string;
  valueClass?: string;
}) {
  return (
    <div className="flex-1 px-3 first:pl-0 last:pr-0 min-w-0">
      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`text-[14px] font-semibold mt-1 tabular-nums truncate ${valueClass || "text-white"}`}>
        {value}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Performance chart — pure-SVG line chart
══════════════════════════════════════════════════════════════════════ */

function PerformanceChart({
  series, up,
}: {
  series: { label: string; value: number }[];
  up: boolean;
}) {
  const w = 600;
  const h = 180;
  const pad = { top: 18, right: 14, bottom: 24, left: 28 };

  if (series.length < 2) {
    return (
      <div className="h-[180px] rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center">
        <span className="text-[11px] text-slate-600">Not enough data</span>
      </div>
    );
  }

  const values = series.map((p) => p.value);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = max - min || 1;

  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;

  const points = series.map((p, i) => {
    const x = pad.left + (i / (series.length - 1)) * innerW;
    const y = pad.top + (1 - (p.value - min) / span) * innerH;
    return [x, y] as const;
  });

  const linePath = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");

  const fillPath =
    linePath +
    ` L${points[points.length - 1][0].toFixed(2)},${(pad.top + innerH).toFixed(2)}` +
    ` L${points[0][0].toFixed(2)},${(pad.top + innerH).toFixed(2)} Z`;

  const stroke = up ? "#10b981" : "#ef4444";
  const gradId = "vx-trader-perf-grad";

  // Horizontal gridlines at 3 thresholds (0, mid, max)
  const gridYs = [0, max * 0.5, max].map((v) => pad.top + (1 - (v - min) / span) * innerH);

  // Bottom labels: show a few anchor dates
  const labelEvery = Math.ceil(series.length / 4);

  const lastPoint = points[points.length - 1];
  const lastVal   = series[series.length - 1].value;

  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] px-2 py-2">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={stroke} stopOpacity="0.28" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Gridlines */}
        {gridYs.map((y, i) => (
          <line
            key={i}
            x1={pad.left}
            y1={y}
            x2={w - pad.right}
            y2={y}
            stroke="rgba(148,163,184,0.08)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        ))}

        {/* Y-axis labels (min / mid / max percentage) */}
        {[max, max * 0.5, 0].map((v, i) => (
          <text
            key={i}
            x={pad.left - 6}
            y={pad.top + (1 - (v - min) / span) * innerH + 3}
            textAnchor="end"
            fontSize="9"
            fill="rgba(148,163,184,0.6)"
          >
            {`${v >= 0 ? "+" : ""}${v.toFixed(0)}%`}
          </text>
        ))}

        {/* X-axis date labels */}
        {series.map((p, i) => {
          if (i % labelEvery !== 0 && i !== series.length - 1) return null;
          const [x] = points[i];
          return (
            <text
              key={i}
              x={x}
              y={h - 6}
              textAnchor="middle"
              fontSize="9"
              fill="rgba(148,163,184,0.6)"
            >
              {p.label}
            </text>
          );
        })}

        {/* Area fill */}
        <path d={fillPath} fill={`url(#${gradId})`} />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={stroke}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Last-point marker */}
        <circle cx={lastPoint[0]} cy={lastPoint[1]} r={3.5} fill={stroke} />
        <circle cx={lastPoint[0]} cy={lastPoint[1]} r={7}   fill={stroke} fillOpacity="0.15" />

        {/* Last-value label */}
        <text
          x={lastPoint[0] - 6}
          y={lastPoint[1] - 8}
          textAnchor="end"
          fontSize="11"
          fontWeight="700"
          fill={stroke}
        >
          {`${lastVal >= 0 ? "+" : ""}${lastVal.toFixed(1)}%`}
        </text>
      </svg>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Copy modal — funding flow
══════════════════════════════════════════════════════════════════════ */

function CopyModal({
  trader, usdBalance, onClose, onSuccess,
}: {
  trader:     Trader;
  usdBalance: number;
  onClose:    () => void;
  onSuccess:  () => void;
}) {
  const [amount, setAmount] = useState(String(trader.minCopyAmount));
  const [isPending, start]  = useTransition();

  const val         = parseFloat(amount) || 0;
  const meetsMin    = val >= trader.minCopyAmount;
  const exceedsMax  = trader.maxCopyAmount !== null && val > trader.maxCopyAmount;
  const canAfford   = val <= usdBalance;
  const needsDeposit = usdBalance < trader.minCopyAmount;

  function submit() {
    if (!meetsMin)    { toast.error(`Minimum is ${formatCurrency(trader.minCopyAmount)}`); return; }
    if (exceedsMax)   { toast.error(`Maximum is ${formatCurrency(trader.maxCopyAmount!)}`); return; }
    if (!canAfford)   { toast.error("Insufficient USD balance"); return; }
    start(async () => {
      const r = await userStartCopyTrade({ traderId: trader.id, amount: val });
      if ("error" in r) { toast.error(r.error); return; }
      toast.success(`Started copying ${trader.name}`);
      onSuccess();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-sky-500/20 shadow-2xl"
        style={{ background: "rgba(7,15,30,0.98)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-4 border-b border-white/[0.05]">
          <h3 className="text-base font-bold text-white">Copy {trader.name}</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {trader.minProfit}% – {trader.maxProfit}% per cycle
          </p>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08]">
              <div className="text-[9px] uppercase tracking-widest text-slate-500 font-semibold mb-0.5">Balance</div>
              <div className="text-[13px] font-semibold text-white tabular-nums">{formatCurrency(usdBalance)}</div>
            </div>
            <div className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08]">
              <div className="text-[9px] uppercase tracking-widest text-slate-500 font-semibold mb-0.5">Min amount</div>
              <div className="text-[13px] font-semibold text-sky-400 tabular-nums">{formatCurrency(trader.minCopyAmount)}</div>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Amount (USD)
            </label>
            <div className="relative mt-1.5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
              <input
                type="number"
                autoFocus
                step="100"
                min={trader.minCopyAmount}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-white/[0.05] border border-white/[0.12] rounded-lg pl-7 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-sky-500/50"
              />
            </div>
            {val > 0 && !meetsMin && (
              <p className="text-[11px] text-yellow-400 mt-1.5">
                Below minimum of {formatCurrency(trader.minCopyAmount)}
              </p>
            )}
            {val > 0 && exceedsMax && (
              <p className="text-[11px] text-yellow-400 mt-1.5">
                Above maximum of {formatCurrency(trader.maxCopyAmount!)}
              </p>
            )}
            {val > 0 && !canAfford && !needsDeposit && (
              <p className="text-[11px] text-red-400 mt-1.5">Insufficient balance</p>
            )}
          </div>

          {needsDeposit && (
            <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 bg-yellow-500/[0.05] border border-yellow-500/20">
              <AlertTriangle size={13} className="text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-[11.5px] text-slate-300 leading-relaxed">
                You need at least <span className="font-semibold text-white">{formatCurrency(trader.minCopyAmount)}</span>{" "}
                in your USD wallet to copy this trader.{" "}
                <Link href="/dashboard/deposit" className="text-sky-400 hover:text-sky-300 font-semibold">
                  Make a deposit
                </Link>.
              </div>
            </div>
          )}
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <Button
            variant="outline"
            className="flex-1 h-10 border-white/10 text-slate-300 hover:text-white"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 h-10 bg-sky-500 hover:bg-sky-400 text-white font-semibold"
            onClick={needsDeposit ? onClose : submit}
            disabled={isPending || (!needsDeposit && (!canAfford || !meetsMin || exceedsMax))}
          >
            {isPending ? (
              <><Loader2 size={14} className="animate-spin mr-1.5" /> Starting…</>
            ) : needsDeposit ? (
              <><ArrowDownToLine size={14} className="mr-1.5" /> Deposit First</>
            ) : (
              "Confirm"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
