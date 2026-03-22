"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { PortfolioChart } from "@/components/dashboard/portfolio-chart";
import { addInvestmentFunds, stopCopyTrade } from "@/lib/actions/investment";
import {
  TrendingUp, DollarSign, Activity, Zap,
  ArrowUpRight, Plus, ShieldAlert, Loader2,
  ChevronRight, Clock, BarChart2, Users, StopCircle,
  Wallet, ArrowDownToLine,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface DashboardClientProps {
  user: { name: string | null; id: string };
  usdBalance: number;
  totalPortfolio: number;
  totalEarned: number;        // investment + copy trade earnings combined
  isVerified: boolean;
  investment: Investment | null;
  copyTrades: CopyTrade[];
  activity: ActivityItem[];
  chartData: { date: string; value: number }[];
}

// ─── Countdown hook ───────────────────────────────────────────────────────────

function useCountdown(nextProfitAt: string | null) {
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    function calc() {
      if (!nextProfitAt) return setSecs(0);
      const diff = Math.max(0, Math.floor((new Date(nextProfitAt).getTime() - Date.now()) / 1000));
      setSecs(diff);
    }
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [nextProfitAt]);

  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return { display: `${m}:${s}`, secs };
}

// ─── Format helpers ───────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
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

const ACTIVITY_COLORS: Record<string, string> = {
  INVESTMENT_PROFIT:    "text-emerald-400",
  COPY_TRADE_PROFIT:    "text-sky-400",
  INVESTMENT_STARTED:   "text-violet-400",
  COPY_TRADE_STARTED:   "text-blue-400",
  INVESTMENT_FUNDS_ADDED: "text-yellow-400",
  INVESTMENT_UPGRADED:  "text-orange-400",
  INVESTMENT_CANCELLED: "text-red-400",
  INVESTMENT_PAUSED:    "text-slate-400",
  INVESTMENT_RESUMED:   "text-emerald-400",
  COPY_TRADE_STOPPED:   "text-red-400",
  COPY_TRADE_PAUSED:    "text-slate-400",
};

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  INVESTMENT_PROFIT:    TrendingUp,
  COPY_TRADE_PROFIT:    BarChart2,
  INVESTMENT_STARTED:   Zap,
  COPY_TRADE_STARTED:   Users,
  INVESTMENT_FUNDS_ADDED: Plus,
  default:              Activity,
};

function ActivityIcon({ type }: { type: string }) {
  const Icon = ACTIVITY_ICONS[type] || ACTIVITY_ICONS.default;
  const color = ACTIVITY_COLORS[type] || "text-slate-400";
  return (
    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-white/5 ${color}`}>
      <Icon size={13} />
    </div>
  );
}

// ─── Countdown pill ───────────────────────────────────────────────────────────

function CountdownPill({ nextProfitAt }: { nextProfitAt: string | null }) {
  const { display, secs } = useCountdown(nextProfitAt);
  const isClose = secs > 0 && secs < 10;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full border transition-colors ${
      isClose ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300 animate-pulse" : "bg-white/[0.05] border-white/10 text-slate-300"
    }`}>
      <Clock size={9} />
      {secs === 0 ? "Due…" : display}
    </span>
  );
}

// ─── Add Funds modal ──────────────────────────────────────────────────────────

function AddFundsModal({ usdBalance, onClose, onSuccess }: { usdBalance: number; onClose: () => void; onSuccess: () => void }) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    const n = parseFloat(amount);
    if (!n || n <= 0) { toast.error("Enter a valid amount"); return; }
    if (n > usdBalance) { toast.error("Insufficient USD balance"); return; }
    setLoading(true);
    const r = await addInvestmentFunds(n);
    setLoading(false);
    if (r.error) { toast.error(r.error); return; }
    toast.success(`$${n.toLocaleString()} added to your investment!`);
    onSuccess();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <Card className="glass-card border border-sky-500/20 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold text-white mb-1">Add Funds</h3>
        <p className="text-xs text-slate-400 mb-5">Available: <span className="text-white font-semibold">{fmt(usdBalance)}</span></p>

        <input
          type="number"
          placeholder="Amount in USD"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="w-full bg-white/[0.06] border border-white/[0.18] rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-sky-500/60 mb-4"
        />

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 border-white/10 text-slate-300 hover:text-white" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-sky-500 hover:bg-sky-400 text-white font-semibold" onClick={submit} disabled={loading}>
            {loading ? <Loader2 size={14} className="animate-spin mr-1" /> : null} Add Funds
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ─── Investment Card ──────────────────────────────────────────────────────────

function InvestmentCard({
  investment,
  usdBalance,
  onRefresh,
}: {
  investment: Investment;
  usdBalance: number;
  onRefresh: () => void;
}) {
  const [showAddFunds, setShowAddFunds] = useState(false);
  const roiPct = investment.amount > 0 ? (investment.totalEarned / investment.amount) * 100 : 0;

  return (
    <div className="glass-card rounded-2xl p-5 border border-sky-500/15 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-sky-500/15 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-sky-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">{investment.planName}</div>
            <div className="text-[11px] text-slate-500 capitalize">{investment.status.toLowerCase()}</div>
          </div>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
          investment.status === "ACTIVE"
            ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
            : "bg-yellow-500/10 border-yellow-500/25 text-yellow-400"
        }`}>
          {investment.status}
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/[0.04] rounded-xl p-3">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Invested</div>
          <div className="text-sm font-bold text-white">{fmt(investment.amount)}</div>
        </div>
        <div className="bg-white/[0.04] rounded-xl p-3">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Earned</div>
          <div className="text-sm font-bold text-emerald-400">{fmt(investment.totalEarned)}</div>
        </div>
        <div className="bg-white/[0.04] rounded-xl p-3">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">ROI</div>
          <div className="text-sm font-bold text-sky-400">{fmtPct(roiPct)}</div>
        </div>
      </div>

      {/* Profit range + countdown */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-500">
          Profit: <span className="text-slate-300">{investment.minProfit}%–{investment.maxProfit}% / cycle</span>
        </div>
        {investment.status === "ACTIVE" && (
          <CountdownPill nextProfitAt={investment.nextProfitAt} />
        )}
      </div>

      {/* Actions */}
      {investment.status === "ACTIVE" && (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            className="flex-1 bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/25 hover:border-sky-500/40 font-semibold text-xs h-9"
            onClick={() => setShowAddFunds(true)}
          >
            <Plus size={13} className="mr-1" /> Add Funds
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-white/10 text-slate-300 hover:text-white hover:bg-white/5 text-xs h-9"
            render={<Link href="/dashboard/deposit" />}
          >
            <Wallet size={13} className="mr-1" /> Deposit
          </Button>
        </div>
      )}

      {showAddFunds && (
        <AddFundsModal
          usdBalance={usdBalance}
          onClose={() => setShowAddFunds(false)}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );
}

// ─── Copy Trader Card ─────────────────────────────────────────────────────────

function CopyTraderCard({ trade, onRefresh }: { trade: CopyTrade; onRefresh: () => void }) {
  const [stopping, setStopping] = useState(false);
  const roiPct = trade.amount > 0 ? (trade.totalEarned / trade.amount) * 100 : 0;

  async function handleStop() {
    setStopping(true);
    const r = await stopCopyTrade(trade.id);
    setStopping(false);
    if (r.error) { toast.error(r.error); return; }
    toast.success(`Stopped copying ${trade.traderName}`);
    onRefresh();
  }

  // Generate consistent avatar color from name
  const hue = [...trade.traderName].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;

  return (
    <div className="glass-card rounded-2xl p-5 border border-sky-500/10 flex flex-col gap-3">
      {/* Trader header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
          style={{ background: `hsl(${hue} 60% 25%)`, border: `1px solid hsl(${hue} 60% 35%)` }}
        >
          {trade.traderName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white truncate">{trade.traderName}</div>
          <div className="text-[11px] text-slate-500">Copy trading</div>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${
          trade.status === "ACTIVE"
            ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
            : "bg-yellow-500/10 border-yellow-500/25 text-yellow-400"
        }`}>
          {trade.status}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white/[0.04] rounded-lg p-2.5">
          <div className="text-[10px] text-slate-500 mb-0.5">Copied</div>
          <div className="text-xs font-bold text-white">{fmt(trade.amount)}</div>
        </div>
        <div className="bg-white/[0.04] rounded-lg p-2.5">
          <div className="text-[10px] text-slate-500 mb-0.5">Earned</div>
          <div className="text-xs font-bold text-emerald-400">{fmt(trade.totalEarned)}</div>
        </div>
        <div className="bg-white/[0.04] rounded-lg p-2.5">
          <div className="text-[10px] text-slate-500 mb-0.5">ROI</div>
          <div className="text-xs font-bold text-sky-400">{fmtPct(roiPct)}</div>
        </div>
      </div>

      {/* Profit info + countdown */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-500">
          {trade.minProfit}%–{trade.maxProfit}% / cycle
        </span>
        {trade.status === "ACTIVE" && <CountdownPill nextProfitAt={trade.nextProfitAt} />}
      </div>

      {/* Stop button */}
      {trade.status === "ACTIVE" && (
        <Button
          size="sm"
          variant="outline"
          className="w-full border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/35 text-xs h-8"
          onClick={handleStop}
          disabled={stopping}
        >
          {stopping ? <Loader2 size={12} className="animate-spin mr-1" /> : <StopCircle size={12} className="mr-1" />}
          Stop Copying
        </Button>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DashboardClient({
  user,
  usdBalance: initialBalance,
  totalPortfolio,
  totalEarned: initialEarned,
  isVerified,
  investment: initialInvestment,
  copyTrades: initialCopyTrades,
  activity: initialActivity,
  chartData,
}: DashboardClientProps) {
  const [usdBalance, setUsdBalance] = useState(initialBalance);
  const [investment, setInvestment] = useState<Investment | null>(initialInvestment);
  const [copyTrades, setCopyTrades] = useState<CopyTrade[]>(initialCopyTrades);
  const [activity, setActivity] = useState<ActivityItem[]>(initialActivity);
  const [refresh, setRefresh] = useState(0); // bump to force re-render of action components
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalEarned = (investment ? investment.totalEarned : 0) +
    copyTrades.filter(t => t.status !== "STOPPED").reduce((s, t) => s + t.totalEarned, 0);

  const pollProfit = useCallback(async () => {
    try {
      const r = await fetch("/api/investment/profit", { method: "POST" });
      if (!r.ok) return;
      const data = await r.json();

      if (data.credited?.length > 0) {
        data.credited.forEach((c: { label: string; amount: number }) => {
          toast.success(`+${fmt(c.amount)} — ${c.label}`, { duration: 4000 });
        });
      }

      setInvestment(data.investment ? serializeInvestment(data.investment) : null);
      setCopyTrades((data.copyTrades || []).map(serializeCopyTrade));
      setActivity((data.activity || []).map(serializeActivity));
      setUsdBalance(data.usdBalance || 0);
    } catch {
      // Silently ignore polling errors
    }
  }, []);

  useEffect(() => {
    pollingRef.current = setInterval(pollProfit, 15_000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [pollProfit]);

  function handleRefresh() {
    setRefresh(r => r + 1);
    pollProfit();
  }

  const activeCopyTrades = copyTrades.filter(t => t.status !== "STOPPED");

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {user.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {investment ? "Your investments are running" : "Start your investment journey"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isVerified && (
            <Button render={<Link href="/dashboard/verification" />} variant="outline" size="sm"
              className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 text-xs">
              <ShieldAlert size={13} className="mr-1" /> Verify Identity
            </Button>
          )}
          <Button render={<Link href="/dashboard/deposit" />} size="sm"
            className="bg-sky-500 hover:bg-sky-400 text-white text-xs shadow-lg shadow-sky-500/25">
            <ArrowDownToLine size={13} className="mr-1" /> Deposit
          </Button>
        </div>
      </div>

      {/* KYC banner */}
      {!isVerified && (
        <div className="glass-card rounded-xl p-4 border border-yellow-500/20 bg-yellow-500/5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-yellow-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-300">Identity Verification Required</p>
              <p className="text-xs text-slate-400">Complete KYC to unlock full trading features and higher limits.</p>
            </div>
          </div>
          <Button render={<Link href="/dashboard/verification" />} size="sm"
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold flex-shrink-0 text-xs">
            Verify Now
          </Button>
        </div>
      )}

      {/* ── Stat Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Total Balance */}
        <div className="glass-card rounded-2xl p-5 border border-sky-500/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Total Balance</span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
              <DollarSign size={14} className="text-sky-400" />
            </div>
          </div>
          <div className="text-xl font-bold text-white">{fmt(usdBalance)}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">USD wallet</div>
        </div>

        {/* Portfolio */}
        <div className="glass-card rounded-2xl p-5 border border-sky-500/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Portfolio</span>
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Wallet size={14} className="text-violet-400" />
            </div>
          </div>
          <div className="text-xl font-bold text-white">{fmt(totalPortfolio)}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">all assets</div>
        </div>

        {/* Total Earned */}
        <div className="glass-card rounded-2xl p-5 border border-emerald-500/15">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Total Earned</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp size={14} className="text-emerald-400" />
            </div>
          </div>
          <div className="text-xl font-bold text-emerald-400">{fmt(totalEarned)}</div>
          <div className="flex items-center gap-1 mt-0.5">
            <ArrowUpRight size={11} className="text-emerald-500" />
            <span className="text-[11px] text-emerald-500/80">investments + copy</span>
          </div>
        </div>

        {/* Active Earnings */}
        <div className="glass-card rounded-2xl p-5 border border-sky-500/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Active</span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
              <Zap size={14} className="text-sky-400" />
            </div>
          </div>
          <div className="text-xl font-bold text-white">
            {(investment ? 1 : 0) + activeCopyTrades.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {investment ? "1 plan" : "no plan"}
            {activeCopyTrades.length > 0 ? ` · ${activeCopyTrades.length} copy` : ""}
          </div>
        </div>
      </div>

      {/* ── Main layout: Investment + Copy / Chart ─────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Left: Investment + Copy Trading ─────────────────────── */}
        <div className="xl:col-span-2 space-y-5">

          {/* Active Investment */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <TrendingUp size={14} className="text-sky-400" /> Active Investment
              </h2>
              <Link href="/dashboard/portfolio" className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1">
                Portfolio <ChevronRight size={12} />
              </Link>
            </div>
            {investment && investment.status !== "CANCELLED" ? (
              <InvestmentCard
                key={refresh}
                investment={investment}
                usdBalance={usdBalance}
                onRefresh={handleRefresh}
              />
            ) : (
              <div className="glass-card rounded-2xl p-8 border border-white/5 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center mb-3">
                  <TrendingUp size={20} className="text-sky-400/50" />
                </div>
                <p className="text-sm font-semibold text-white mb-1">No Active Investment</p>
                <p className="text-xs text-slate-500 mb-4 max-w-xs">
                  Contact support or deposit funds to activate an investment plan.
                </p>
                <Button render={<Link href="/dashboard/deposit" />} size="sm"
                  className="bg-sky-500 hover:bg-sky-400 text-white text-xs">
                  <ArrowDownToLine size={12} className="mr-1" /> Make a Deposit
                </Button>
              </div>
            )}
          </div>

          {/* Copy Trading */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Users size={14} className="text-sky-400" /> Copy Trading
              </h2>
              {activeCopyTrades.length > 0 && (
                <span className="text-xs text-slate-500">{activeCopyTrades.length} active</span>
              )}
            </div>
            {activeCopyTrades.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeCopyTrades.map(trade => (
                  <CopyTraderCard key={`${trade.id}-${refresh}`} trade={trade} onRefresh={handleRefresh} />
                ))}
              </div>
            ) : (
              <div className="glass-card rounded-2xl p-8 border border-white/5 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center mb-3">
                  <Users size={20} className="text-sky-400/50" />
                </div>
                <p className="text-sm font-semibold text-white mb-1">No Copy Trades Active</p>
                <p className="text-xs text-slate-500 max-w-xs">
                  Our team can assign top traders to copy on your behalf.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Chart + Activity ──────────────────────────────── */}
        <div className="space-y-5">
          {/* Chart */}
          <div className="glass-card rounded-2xl p-5 border border-sky-500/10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-white">Portfolio Growth</h2>
                <p className="text-[11px] text-slate-500">Last 30 days</p>
              </div>
              <Activity size={14} className="text-sky-400" />
            </div>
            <div className="h-48">
              <PortfolioChart data={chartData} />
            </div>
          </div>

          {/* Recent Activity */}
          <div className="glass-card rounded-2xl border border-sky-500/10 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Activity size={13} className="text-sky-400" /> Activity
              </h2>
            </div>
            <div className="divide-y divide-white/[0.04] max-h-80 overflow-y-auto">
              {activity.length === 0 ? (
                <div className="px-5 py-6 text-center text-xs text-slate-500">No activity yet</div>
              ) : (
                activity.map(item => (
                  <div key={item.id} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                    <ActivityIcon type={item.type} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-white truncate">{item.title}</div>
                      <div className="text-[10px] text-slate-500">{timeAgo(item.createdAt)}</div>
                    </div>
                    {item.amount != null && (
                      <div className={`text-xs font-semibold flex-shrink-0 ${ACTIVITY_COLORS[item.type] || "text-slate-300"}`}>
                        +{fmt(item.amount)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Serializers (Prisma Decimal → number) ────────────────────────────────────

function serializeInvestment(inv: any): Investment {
  return {
    id: inv.id,
    planName: inv.planName,
    amount: Number(inv.amount),
    totalEarned: Number(inv.totalEarned),
    minProfit: Number(inv.minProfit),
    maxProfit: Number(inv.maxProfit),
    profitInterval: inv.profitInterval,
    status: inv.status,
    nextProfitAt: inv.nextProfitAt ? new Date(inv.nextProfitAt).toISOString() : null,
  };
}

function serializeCopyTrade(t: any): CopyTrade {
  return {
    id: t.id,
    traderName: t.traderName,
    amount: Number(t.amount),
    totalEarned: Number(t.totalEarned),
    minProfit: Number(t.minProfit),
    maxProfit: Number(t.maxProfit),
    profitInterval: t.profitInterval,
    status: t.status,
    nextProfitAt: t.nextProfitAt ? new Date(t.nextProfitAt).toISOString() : null,
  };
}

function serializeActivity(a: any): ActivityItem {
  return {
    id: a.id,
    type: a.type,
    title: a.title,
    amount: a.amount !== null ? Number(a.amount) : null,
    currency: a.currency,
    createdAt: new Date(a.createdAt).toISOString(),
  };
}
