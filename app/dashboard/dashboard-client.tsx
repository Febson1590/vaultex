"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PortfolioChart } from "@/components/dashboard/portfolio-chart";
import { addInvestmentFunds, stopCopyTrade } from "@/lib/actions/investment";
import {
  TrendingUp, Activity, Plus, ShieldAlert, Loader2, Clock,
  Users, StopCircle, XCircle, ArrowDownToLine, ArrowUpFromLine,
  History, Copy as CopyIcon, ChevronRight,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────
   Types
────────────────────────────────────────────────────────────────────── */

interface Investment {
  id: string;
  planName: string;
  amount: number;
  totalEarned: number;
  minProfit: number;
  maxProfit: number;
  profitInterval: number;
  status: string;
  nextProfitAt: string | null;
}

interface CopyTrade {
  id: string;
  traderName: string;
  amount: number;
  totalEarned: number;
  minProfit: number;
  maxProfit: number;
  profitInterval: number;
  status: string;
  nextProfitAt: string | null;
}

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  amount: number | null;
  currency: string;
  createdAt: string;
}

interface WalletBalance {
  id: string;
  currency: string;
  balance: number;
}

interface DashboardClientProps {
  user: { name: string | null; id: string };
  usdBalance: number;
  totalPortfolio: number;
  totalEarned: number;
  kycStatus: "not_submitted" | "pending" | "approved" | "rejected";
  investment: Investment | null;
  copyTrades: CopyTrade[];
  activity: ActivityItem[];
  chartData: { date: string; value: number }[];
  wallets: WalletBalance[];
}

/* ──────────────────────────────────────────────────────────────────────
   Helpers
────────────────────────────────────────────────────────────────────── */

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 2,
  }).format(n);
}

function fmtPct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function timeAgo(date: string) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/** Produce a polite greeting by time-of-day. */
function greetingFor(name: string | null) {
  const h = new Date().getHours();
  const greeting = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  const first    = (name ?? "").trim().split(/\s+/)[0];
  return first ? `${greeting}, ${first}` : greeting;
}

/* ──────────────────────────────────────────────────────────────────────
   Shared primitives
────────────────────────────────────────────────────────────────────── */

/** Unified premium card surface used throughout the dashboard. */
function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/[0.06] ${className}`}
      style={{ background: "rgba(10,18,34,0.7)" }}
    >
      {children}
    </div>
  );
}

/** Consistent header strip used at the top of every card. */
function CardHeader({
  icon: Icon,
  title,
  action,
}: {
  icon?: React.ElementType;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.05]">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={14} className="text-sky-400" />}
        <span className="text-[13px] font-semibold text-white">{title}</span>
      </div>
      {action}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   Add Funds modal
────────────────────────────────────────────────────────────────────── */

function AddFundsModal({
  usdBalance, onClose, onSuccess,
}: {
  usdBalance: number;
  onClose:    () => void;
  onSuccess:  () => void;
}) {
  const [amount,  setAmount]  = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    const n = parseFloat(amount);
    if (!n || n <= 0) { toast.error("Enter a valid amount"); return; }
    if (n > usdBalance) { toast.error("Insufficient balance"); return; }
    setLoading(true);
    const r = await addInvestmentFunds(n);
    setLoading(false);
    if ("error" in r) { toast.error(r.error); return; }
    toast.success(`$${n.toLocaleString()} added to your investment`);
    onSuccess();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-sky-500/20"
        style={{ background: "rgba(7,15,30,0.98)" }}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-white mb-1">Add Funds to Investment</h3>
        <p className="text-xs text-slate-400 mb-5">
          Available: <span className="text-white font-semibold">{fmt(usdBalance)}</span>
        </p>
        <input
          type="number"
          placeholder="USD amount"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          autoFocus
          className="w-full bg-white/[0.05] border border-white/[0.12] rounded-lg px-4 py-3 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-sky-500/50 mb-4"
        />
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 border-white/10 text-slate-300 hover:text-white h-10" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1 bg-sky-500 hover:bg-sky-400 text-white font-semibold h-10"
            onClick={submit}
            disabled={loading}
          >
            {loading ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
            Add Funds
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Main component
══════════════════════════════════════════════════════════════════════ */

export default function DashboardClient({
  user,
  usdBalance: initBalance,
  totalPortfolio,
  totalEarned: initEarned,
  kycStatus,
  investment: initInvestment,
  copyTrades: initCopyTrades,
  activity: initActivity,
  chartData,
  wallets,
}: DashboardClientProps) {
  // Silence unused-var warning — totalEarned is recomputed below from
  // live investment/copyTrades state, but we keep the prop for type parity.
  void initEarned;
  void wallets;
  void totalPortfolio;

  const router = useRouter();

  const [usdBalance, setUsdBalance]       = useState(initBalance);
  const [investment, setInvestment]       = useState<Investment | null>(initInvestment);
  const [copyTrades, setCopyTrades]       = useState<CopyTrade[]>(initCopyTrades);
  const [activity, setActivity]           = useState<ActivityItem[]>(initActivity);
  const [chartRefreshKey, setChartRefreshKey] = useState(0);
  const [showAddFunds, setShowAddFunds]   = useState(false);
  const [stoppingId, setStoppingId]       = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Derived values ────────────────────────────────────────────── */
  const activeCopyTrades = copyTrades.filter(t => t.status !== "STOPPED");
  const copyTradingTotal = activeCopyTrades.reduce((s, t) => s + t.amount, 0);
  const totalEarned =
    (investment ? investment.totalEarned : 0) +
    activeCopyTrades.reduce((s, t) => s + t.totalEarned, 0);
  const activeInvested = investment && investment.status !== "CANCELLED" ? investment.amount : 0;
  const roiPct = activeInvested > 0 ? (totalEarned / activeInvested) * 100 : 0;

  // Daily change — computed from chart data (last vs previous point)
  const daily = computeDailyChange(chartData, usdBalance);

  const isKycApproved = kycStatus === "approved";
  const kycHref = `/dashboard/verification?status=${kycStatus}`;

  /* ── Profit polling (unchanged logic) ─────────────────────────── */
  const pollProfit = useCallback(async () => {
    try {
      const res = await fetch("/api/investment/profit", { method: "POST" });
      if (!res.ok) return;
      const data = await res.json();

      if (data.credited?.length > 0) {
        // Refresh the chart silently — no toast spam on every profit tick.
        // Users can see new profits in the Portfolio Overview and activity list.
        setChartRefreshKey(k => k + 1);
      }
      if (data.investment !== undefined) setInvestment(data.investment ? ser(data.investment) : null);
      if (data.copyTrades)  setCopyTrades(data.copyTrades.map(serCopy));
      if (data.activity)    setActivity(data.activity.map(serAct));
      if (data.usdBalance !== undefined) setUsdBalance(data.usdBalance);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    pollingRef.current = setInterval(pollProfit, 15_000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [pollProfit]);

  function refresh() {
    setChartRefreshKey(k => k + 1);
    pollProfit();
  }

  /* ── Handlers ─────────────────────────────────────────────────── */
  async function handleStopCopy(id: string, name: string) {
    setStoppingId(id);
    const r = await stopCopyTrade(id);
    setStoppingId(null);
    if (r.error) { toast.error(r.error); return; }
    toast.success(`Stopped copying ${name}`);
    refresh();
  }

  /* ══════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-5 max-w-3xl mx-auto">

      {/* ── KYC banner ──────────────────────────────────────────── */}
      <KycBanner kycStatus={kycStatus} />

      {/* ── 1. Top greeting ─────────────────────────────────────── */}
      <div>
        <h1 className="text-[20px] sm:text-[22px] font-bold text-white flex items-center gap-2">
          {greetingFor(user.name)} <span aria-hidden="true">👋</span>
        </h1>
        {daily !== null && (
          <p className="text-[13px] text-slate-400 mt-1">
            Your portfolio is {daily.value >= 0 ? "up" : "down"}{" "}
            <span className={daily.value >= 0 ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>
              {fmtPct(daily.pct)}
            </span>{" "}
            today
          </p>
        )}
      </div>

      {/* ── 2. MAIN HERO BALANCE CARD ──────────────────────────── */}
      <Card className="overflow-hidden">
        <div className="px-5 pt-5 pb-4">
          <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500 font-semibold mb-2">
            Total Balance
          </p>
          <div className="text-[32px] sm:text-[36px] font-bold text-white tracking-tight leading-none">
            {fmt(usdBalance)}
          </div>

          {daily !== null && (
            <div className="mt-2 text-[13px]">
              <span className={daily.value >= 0 ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>
                {daily.value >= 0 ? "+" : ""}{fmt(daily.value)} today
              </span>
              <span className="text-slate-500 ml-1.5">
                ({fmtPct(daily.pct)})
              </span>
            </div>
          )}

          {/* Primary actions — Deposit, Withdraw */}
          <div className="flex items-center gap-2 mt-4">
            <Link href={isKycApproved ? "/dashboard/deposit" : kycHref} className="flex-1 sm:flex-none">
              <Button className="w-full sm:w-auto h-10 px-5 bg-sky-500 hover:bg-sky-400 text-white font-semibold text-[13px]">
                <ArrowDownToLine size={14} className="mr-1.5" />
                Deposit
              </Button>
            </Link>
            <Link href={isKycApproved ? "/dashboard/withdraw" : kycHref} className="flex-1 sm:flex-none">
              <Button
                variant="outline"
                className="w-full sm:w-auto h-10 px-5 border-white/10 text-slate-200 hover:bg-white/[0.04] font-semibold text-[13px]"
              >
                <ArrowUpFromLine size={14} className="mr-1.5" />
                Withdraw
              </Button>
            </Link>
          </div>
        </div>

        {/* Mini chart inside the same card */}
        {chartData.length > 1 && chartData.some(d => d.value > 0) ? (
          <div className="h-36 sm:h-40 px-2 pb-3">
            <PortfolioChartWrapper refreshKey={chartRefreshKey} initial={chartData} />
          </div>
        ) : (
          <div className="px-5 pb-5 pt-1">
            <p className="text-[11px] text-slate-600">
              Balance history chart will appear after your first confirmed deposit.
            </p>
          </div>
        )}
      </Card>

      {/* ── 3. QUICK ACTIONS ROW ─────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <QuickAction icon={ArrowDownToLine}  label="Deposit"    href={isKycApproved ? "/dashboard/deposit"       : kycHref} />
          <QuickAction icon={ArrowUpFromLine}  label="Withdraw"   href={isKycApproved ? "/dashboard/withdraw"      : kycHref} />
          <QuickAction icon={TrendingUp}       label="Invest"     href={isKycApproved ? "/dashboard/investments"   : kycHref} />
          <QuickAction icon={CopyIcon}         label="Copy Trade" href={isKycApproved ? "/dashboard/copy-trading"  : kycHref} />
          <QuickAction icon={History}          label="History"    href="/dashboard/transactions" />
        </div>
      </div>

      {/* ── 4. PORTFOLIO OVERVIEW ──────────────────────────── */}
      <Card>
        <CardHeader
          icon={TrendingUp}
          title="Portfolio Overview"
        />
        <div className="divide-y divide-white/[0.04]">
          <Row label="Active Investment" value={activeInvested > 0 ? fmt(activeInvested) : "—"} />
          <Row label="Total Profit"      value={fmt(totalEarned)} valueClassName={totalEarned > 0 ? "text-emerald-400" : "text-slate-400"} />
          <Row label="ROI"               value={activeInvested > 0 ? fmtPct(roiPct) : "—"}      valueClassName={roiPct > 0 ? "text-emerald-400" : "text-slate-400"} />
          <Row label="Copy Trading"      value={copyTradingTotal > 0 ? `${fmt(copyTradingTotal)} active` : "—"} />
        </div>
      </Card>

      {/* ── 5. ACTIVE INVESTMENT CARD ───────────────────────── */}
      {investment && investment.status !== "CANCELLED" ? (
        <Card>
          <CardHeader
            icon={TrendingUp}
            title={`${investment.planName}`}
            action={
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  investment.status === "ACTIVE"
                    ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                    : "bg-yellow-500/10 border-yellow-500/25 text-yellow-400"
                }`}
              >
                {investment.status}
              </span>
            }
          />
          <div className="px-5 py-4 space-y-3">
            <MetaRow label="Invested" value={fmt(investment.amount)} />
            <MetaRow label="Profit"   value={fmt(investment.totalEarned)} valueClassName="text-emerald-400" />
            <MetaRow label="Cycle"    value={`${investment.minProfit}% – ${investment.maxProfit}% every ${investment.profitInterval}s`} />
          </div>
          {investment.status === "ACTIVE" && (
            <div className="px-5 pb-5 flex gap-2">
              <Button
                className="flex-1 h-10 bg-sky-500/[0.10] hover:bg-sky-500/[0.18] text-sky-300 border border-sky-500/25 font-semibold text-[13px]"
                onClick={() => {
                  if (!isKycApproved) { router.push(kycHref); return; }
                  setShowAddFunds(true);
                }}
              >
                <Plus size={13} className="mr-1.5" /> Add Funds
              </Button>
              <Button
                className="flex-1 h-10 bg-sky-500 hover:bg-sky-400 text-white font-semibold text-[13px]"
                render={<Link href="/dashboard/support" />}
              >
                Upgrade Plan
              </Button>
            </div>
          )}
        </Card>
      ) : null}

      {/* ── 6. COPY TRADING CARD ────────────────────────────── */}
      {activeCopyTrades.length > 0 ? (
        <Card>
          <CardHeader
            icon={Users}
            title="Copy Trading"
            action={
              <span className="text-[11px] text-slate-500">
                {activeCopyTrades.length} active
              </span>
            }
          />
          <div className="divide-y divide-white/[0.04]">
            {activeCopyTrades.map((trade) => {
              const stopping = stoppingId === trade.id;
              const hue = [...trade.traderName].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
              const initials = trade.traderName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
              return (
                <div key={trade.id} className="px-5 py-4 flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
                    style={{
                      background: `hsl(${hue} 55% 22%)`,
                      border: `1px solid hsl(${hue} 55% 32%)`,
                    }}
                  >
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-white truncate">
                      {trade.traderName}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          trade.status === "ACTIVE"
                            ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                            : "bg-yellow-500/10 border-yellow-500/25 text-yellow-400"
                        }`}
                      >
                        {trade.status}
                      </span>
                      <span className="text-[11px] text-slate-500 tabular-nums">
                        {fmt(trade.amount)} copied
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-[13px] font-semibold text-emerald-400 tabular-nums">
                      +{fmt(trade.totalEarned)}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">profit</div>
                  </div>
                  <Button
                    size="sm"
                    disabled={stopping}
                    onClick={() => handleStopCopy(trade.id, trade.traderName)}
                    className="h-8 px-3 text-[11px] font-semibold bg-red-500/[0.10] hover:bg-red-500/[0.18] text-red-400 border border-red-500/20 flex-shrink-0"
                  >
                    {stopping
                      ? <Loader2 size={11} className="animate-spin" />
                      : <><StopCircle size={11} className="mr-1" /> Stop</>
                    }
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      {/* ── 7. RECENT ACTIVITY CARD ─────────────────────────── */}
      <Card>
        <CardHeader
          icon={Activity}
          title="Recent Activity"
          action={
            <Link
              href="/dashboard/transactions"
              className="text-[12px] text-sky-400 hover:text-sky-300 flex items-center gap-0.5 font-medium"
            >
              View All <ChevronRight size={12} />
            </Link>
          }
        />
        {activity.length === 0 ? (
          <div className="px-5 py-8 text-center text-[12px] text-slate-500">
            No activity yet
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {activity.slice(0, 5).map((item) => {
              const color = ACT_COLOR[item.type] ?? "text-slate-300";
              const dot   = ACT_DOT[item.type]   ?? "bg-slate-500";
              return (
                <div key={item.id} className="flex items-center gap-3 px-5 py-3">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-medium text-white truncate">
                      {item.title}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {timeAgo(item.createdAt)}
                    </div>
                  </div>
                  {item.amount != null && item.amount > 0 && (
                    <div className={`text-[13px] font-semibold flex-shrink-0 tabular-nums ${color}`}>
                      +{fmt(item.amount)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── Add Funds modal ─────────────────────────────────── */}
      {showAddFunds && investment && (
        <AddFundsModal
          usdBalance={usdBalance}
          onClose={() => setShowAddFunds(false)}
          onSuccess={refresh}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Small sub-components
══════════════════════════════════════════════════════════════════════ */

/** Horizontal-scrolling quick-action pill. */
function QuickAction({
  icon: Icon, label, href,
}: {
  icon: React.ElementType;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex-shrink-0 flex items-center gap-2 h-10 px-4 rounded-full border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-sky-500/25 transition-colors"
    >
      <Icon size={14} className="text-sky-400" />
      <span className="text-[12.5px] font-medium text-slate-200">{label}</span>
    </Link>
  );
}

/** Label / value row used inside summary cards. */
function Row({
  label, value, valueClassName = "",
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <span className="text-[12px] text-slate-400">{label}</span>
      <span className={`text-[13px] font-semibold tabular-nums ${valueClassName || "text-white"}`}>
        {value}
      </span>
    </div>
  );
}

/** Label / value row used inside meta-details blocks (non-divided). */
function MetaRow({
  label, value, valueClassName = "",
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] text-slate-400">{label}</span>
      <span className={`text-[13px] font-semibold tabular-nums ${valueClassName || "text-white"}`}>
        {value}
      </span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   KYC banner — 4 states (preserved from previous version)
══════════════════════════════════════════════════════════════════════ */

function KycBanner({ kycStatus }: { kycStatus: "not_submitted" | "pending" | "approved" | "rejected" }) {
  if (kycStatus === "approved") return null;

  if (kycStatus === "not_submitted") {
    return (
      <div className="rounded-xl px-4 py-3 flex items-center justify-between gap-4 border border-yellow-500/20"
        style={{ background: "rgba(234,179,8,0.05)" }}
      >
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-yellow-400 flex-shrink-0" />
          <div>
            <p className="text-[13px] font-semibold text-yellow-300">Identity Verification Required</p>
            <p className="text-[11.5px] text-slate-400 mt-0.5">Complete KYC to unlock deposits, withdrawals and investing.</p>
          </div>
        </div>
        <Link href="/dashboard/verification" className="flex-shrink-0">
          <Button size="sm" className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs h-8 px-3">
            Verify Now
          </Button>
        </Link>
      </div>
    );
  }

  if (kycStatus === "pending") {
    return (
      <div className="rounded-xl px-4 py-3 flex items-center justify-between gap-4 border border-sky-500/20"
        style={{ background: "rgba(14,165,233,0.05)" }}
      >
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-sky-400 flex-shrink-0" />
          <div>
            <p className="text-[13px] font-semibold text-sky-300">Verification Under Review</p>
            <p className="text-[11.5px] text-slate-400 mt-0.5">Your documents are being reviewed. We&apos;ll notify you once complete.</p>
          </div>
        </div>
        <Link href="/dashboard/verification" className="flex-shrink-0">
          <Button size="sm" variant="outline" className="border-sky-500/30 text-sky-300 hover:bg-sky-500/10 font-semibold text-xs h-8 px-3">
            View Status
          </Button>
        </Link>
      </div>
    );
  }

  // rejected
  return (
    <div className="rounded-xl px-4 py-3 flex items-center justify-between gap-4 border border-red-500/20"
      style={{ background: "rgba(239,68,68,0.05)" }}
    >
      <div className="flex items-center gap-3">
        <XCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
        <div>
          <p className="text-[13px] font-semibold text-red-300">Verification Rejected</p>
          <p className="text-[11.5px] text-slate-400 mt-0.5">Your submission was not accepted. Please resubmit with valid documents.</p>
        </div>
      </div>
      <Link href="/dashboard/verification" className="flex-shrink-0">
        <Button size="sm" className="bg-red-500 hover:bg-red-400 text-white font-bold text-xs h-8 px-3">
          Resubmit
        </Button>
      </Link>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Chart wrapper — handles range switching + refresh key
══════════════════════════════════════════════════════════════════════ */

const RANGES = ["7d", "30d", "90d", "1y"] as const;
type Range = typeof RANGES[number];

function PortfolioChartWrapper({
  refreshKey, initial,
}: {
  refreshKey: number;
  initial: { date: string; value: number }[];
}) {
  const [data,    setData]    = useState(initial);
  const [range,   setRange]   = useState<Range>("30d");
  const [loading, setLoading] = useState(false);
  const firstMount    = useRef(true);
  const prevRefreshKey = useRef(0);

  const fetchData = useCallback(async (r: Range) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/chart?range=${r}`);
      if (!res.ok) return;
      const json = await res.json();
      setData(json.data ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (firstMount.current) { firstMount.current = false; return; }
    fetchData(range);
  }, [range, fetchData]);

  useEffect(() => {
    if (refreshKey > 0 && refreshKey !== prevRefreshKey.current) {
      prevRefreshKey.current = refreshKey;
      fetchData(range);
    }
  }, [refreshKey, range, fetchData]);

  return (
    <div className="relative h-full">
      {/* Range selector — tiny, top-right */}
      <div className="absolute top-0 right-2 z-10 flex gap-1">
        {RANGES.map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`text-[9px] font-semibold px-2 py-0.5 rounded transition-all ${
              range === r
                ? "bg-sky-500/20 text-sky-300"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {r.toUpperCase()}
          </button>
        ))}
      </div>
      <PortfolioChart data={data} isLoading={loading} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Helpers / constants
══════════════════════════════════════════════════════════════════════ */

const ACT_COLOR: Record<string, string> = {
  INVESTMENT_PROFIT:     "text-emerald-400",
  COPY_TRADE_PROFIT:     "text-sky-400",
  INVESTMENT_STARTED:    "text-violet-400",
  COPY_TRADE_STARTED:    "text-blue-400",
  INVESTMENT_FUNDS_ADDED:"text-yellow-400",
  INVESTMENT_UPGRADED:   "text-orange-400",
  INVESTMENT_CANCELLED:  "text-red-400",
  COPY_TRADE_STOPPED:    "text-red-400",
};

const ACT_DOT: Record<string, string> = {
  INVESTMENT_PROFIT:     "bg-emerald-400",
  COPY_TRADE_PROFIT:     "bg-sky-400",
  INVESTMENT_STARTED:    "bg-violet-400",
  COPY_TRADE_STARTED:    "bg-blue-400",
  INVESTMENT_FUNDS_ADDED:"bg-yellow-400",
  INVESTMENT_UPGRADED:   "bg-orange-400",
  INVESTMENT_CANCELLED:  "bg-red-400",
  COPY_TRADE_STOPPED:    "bg-red-400",
};

function computeDailyChange(
  chartData: { date: string; value: number }[],
  usdBalance: number,
): { value: number; pct: number } | null {
  if (!chartData || chartData.length === 0) return null;
  const last  = chartData[chartData.length - 1]?.value ?? usdBalance;
  const prev  = chartData.length >= 2 ? chartData[chartData.length - 2].value : last;
  if (prev <= 0) return null;
  const value = last - prev;
  const pct   = (value / prev) * 100;
  return { value, pct };
}

/* ── Serialisers ─────────────────────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ser(inv: any): Investment {
  return {
    id: inv.id, planName: inv.planName,
    amount: Number(inv.amount), totalEarned: Number(inv.totalEarned),
    minProfit: Number(inv.minProfit), maxProfit: Number(inv.maxProfit),
    profitInterval: inv.profitInterval, status: inv.status,
    nextProfitAt: inv.nextProfitAt ? new Date(inv.nextProfitAt).toISOString() : null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serCopy(t: any): CopyTrade {
  return {
    id: t.id, traderName: t.traderName,
    amount: Number(t.amount), totalEarned: Number(t.totalEarned),
    minProfit: Number(t.minProfit), maxProfit: Number(t.maxProfit),
    profitInterval: t.profitInterval, status: t.status,
    nextProfitAt: t.nextProfitAt ? new Date(t.nextProfitAt).toISOString() : null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serAct(a: any): ActivityItem {
  return {
    id: a.id, type: a.type, title: a.title,
    amount: a.amount !== null ? Number(a.amount) : null,
    currency: a.currency,
    createdAt: new Date(a.createdAt).toISOString(),
  };
}
