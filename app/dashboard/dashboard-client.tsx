"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PortfolioChart } from "@/components/dashboard/portfolio-chart";
import { addInvestmentFunds, stopCopyTrade } from "@/lib/actions/investment";
import {
  TrendingUp, DollarSign, Activity, Zap,
  ArrowUpRight, Plus, ShieldAlert, Loader2,
  Clock, Users, StopCircle,
  ArrowDownToLine, ArrowUpFromLine, RefreshCw, Wallet,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────────────

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
  isVerified: boolean;
  investment: Investment | null;
  copyTrades: CopyTrade[];
  activity: ActivityItem[];
  chartData: { date: string; value: number }[];
  wallets: WalletBalance[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 2,
  }).format(n);
}

function fmtShort(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  return fmt(n);
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

// ─── Countdown hook ──────────────────────────────────────────────────────────────────────────

function useCountdown(nextProfitAt: string | null) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    function calc() {
      if (!nextProfitAt) return setSecs(0);
      setSecs(Math.max(0, Math.floor((new Date(nextProfitAt).getTime() - Date.now()) / 1000)));
    }
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [nextProfitAt]);
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return { display: `${m}:${s}`, secs };
}

// ─── CountdownBadge ─────────────────────────────────────────────────────────────────────────

function CountdownBadge({ nextProfitAt, label = "Next profit in" }: {
  nextProfitAt: string | null;
  label?: string;
}) {
  const { display, secs } = useCountdown(nextProfitAt);
  const isClose = secs > 0 && secs <= 10;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-mono font-semibold ${
      isClose ? "text-emerald-300 animate-pulse" : "text-slate-300"
    }`}>
      <Clock size={11} className={isClose ? "text-emerald-400" : "text-slate-400"} />
      {label}: {secs === 0 ? "Due…" : display}
    </span>
  );
}

// ─── Add Funds Modal ────────────────────────────────────────────────────────────────────────

function AddFundsModal({ usdBalance, onClose, onSuccess }: {
  usdBalance: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    const n = parseFloat(amount);
    if (!n || n <= 0) { toast.error("Enter a valid amount"); return; }
    if (n > usdBalance) { toast.error("Insufficient balance"); return; }
    setLoading(true);
    const r = await addInvestmentFunds(n);
    setLoading(false);
    if (r.error) { toast.error(r.error); return; }
    toast.success(`$${n.toLocaleString()} added to your investment`);
    onSuccess();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-sky-500/25"
        style={{ background: "rgba(7,15,30,0.98)" }}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-white mb-1">Add Funds to Investment</h3>
        <p className="text-xs text-slate-400 mb-5">
          Available: <span className="text-white font-semibold">{fmt(usdBalance)}</span>
        </p>
        <input
          type="number"
          placeholder="USD amount"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          autoFocus
          className="w-full bg-white/[0.07] border border-white/[0.18] rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-sky-500/60 mb-4"
        />
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 border-white/10 text-slate-300 hover:text-white h-10" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1 bg-sky-500 hover:bg-sky-400 text-white font-bold h-10"
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

// ─── Portfolio Overview ────────────────────────────────────────────────────────────────────────

function PortfolioOverview({
  usdBalance,
  totalPortfolio,
  totalEarned,
  chartData,
}: {
  usdBalance: number;
  totalPortfolio: number;
  totalEarned: number;
  chartData: { date: string; value: number }[];
}) {
  // Compute chart gain (last vs first value)
  const chartGain =
    chartData.length >= 2
      ? chartData[chartData.length - 1].value - chartData[0].value
      : 0;

  return (
    <div
      className="rounded-2xl border border-sky-500/15 overflow-hidden"
      style={{ background: "rgba(7,15,30,0.85)" }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between px-5 pt-5 pb-2">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Total Balance</p>
          <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {fmt(usdBalance)}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Link href="/dashboard/deposit">
              <Button size="sm" className="h-8 px-4 bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-lg shadow-sky-500/30">
                <ArrowDownToLine size={12} className="mr-1.5" />
                Deposit
              </Button>
            </Link>
            {totalPortfolio > usdBalance && (
              <span className="text-xs text-slate-500">
                Portfolio: <span className="text-slate-300 font-semibold">{fmt(totalPortfolio)}</span>
              </span>
            )}
          </div>
        </div>

        {/* Gain summary */}
        <div className="text-right flex-shrink-0">
          <div className={`text-lg font-extrabold ${chartGain >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {chartGain >= 0 ? "+" : ""}{fmt(chartGain)}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">30-day growth</div>
          {totalEarned > 0 && (
            <div className="text-xs font-semibold text-sky-400 mt-1">{fmt(totalEarned)} earned</div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="h-40 px-2 pb-3">
        <PortfolioChart data={chartData} />
      </div>
    </div>
  );
}

// ─── Wallet Strip ────────────────────────────────────────────────────────────────────────────────

const CURRENCY_META: Record<string, { color: string; symbol: string }> = {
  USD:  { color: "#0ea5e9", symbol: "$"  },
  USDT: { color: "#10b981", symbol: "₮"  },
  BTC:  { color: "#f59e0b", symbol: "₿"  },
  ETH:  { color: "#6366f1", symbol: "Ξ"  },
  BNB:  { color: "#eab308", symbol: "Ƀ"  },
  SOL:  { color: "#8b5cf6", symbol: "◎"  },
};

function WalletStrip({ wallets }: { wallets: WalletBalance[] }) {
  if (wallets.length === 0) return null;
  return (
    <div className="rounded-2xl border border-sky-500/15 overflow-hidden" style={{ background: "rgba(7,15,30,0.85)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.05]">
        <div className="flex items-center gap-2">
          <Wallet size={14} className="text-sky-400" />
          <span className="text-sm font-bold text-white">Wallets</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/deposit">
            <span className="text-xs text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-1">
              <ArrowDownToLine size={11} /> Deposit
            </span>
          </Link>
          <Link href="/dashboard/withdraw">
            <span className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1">
              <ArrowUpFromLine size={11} /> Withdraw
            </span>
          </Link>
        </div>
      </div>
      {/* Wallet grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.04]">
        {wallets.map(w => {
          const meta = CURRENCY_META[w.currency] ?? { color: "#64748b", symbol: "" };
          const isFiat = w.currency === "USD" || w.currency === "USDT";
          return (
            <div key={w.id} className="px-5 py-4">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                  style={{ background: `${meta.color}18`, border: `1px solid ${meta.color}35`, color: meta.color }}
                >
                  {meta.symbol || w.currency.slice(0, 1)}
                </div>
                <span className="text-xs font-semibold text-slate-400">{w.currency}</span>
              </div>
              <div className="text-base font-extrabold text-white">
                {isFiat
                  ? fmt(w.balance)
                  : `${w.balance.toFixed(6)}`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Active Investment ──────────────────────────────────────────────────────────────────────────

function ActiveInvestment({
  investment,
  usdBalance,
  onRefresh,
}: {
  investment: Investment | null;
  usdBalance: number;
  onRefresh: () => void;
}) {
  const [showAddFunds, setShowAddFunds] = useState(false);
  const roiPct = investment && investment.amount > 0
    ? (investment.totalEarned / investment.amount) * 100
    : 0;

  return (
    <div className="rounded-2xl border border-sky-500/15 overflow-hidden" style={{ background: "rgba(7,15,30,0.85)" }}>
      {/* Section header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-sky-400" />
          <span className="text-sm font-bold text-white">Active Investment</span>
        </div>
        {investment && investment.status === "ACTIVE" && (
          <CountdownBadge nextProfitAt={investment.nextProfitAt} />
        )}
      </div>

      {investment && investment.status !== "CANCELLED" ? (
        <div className="px-5 py-4 space-y-4">
          {/* Plan row */}
          <div className="flex items-center gap-3">
            {/* Icon */}
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.25) 0%, rgba(234,88,12,0.25) 100%)", border: "1px solid rgba(245,158,11,0.3)" }}>
              <TrendingUp size={18} className="text-amber-400" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-base font-extrabold text-white truncate">{investment.planName}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  investment.status === "ACTIVE"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                }`}>
                  {investment.status}
                </span>
                <span className="text-[11px] text-slate-500">
                  {investment.minProfit}%–{investment.maxProfit}% / cycle
                </span>
              </div>
            </div>

            {/* Earnings on right */}
            <div className="text-right flex-shrink-0">
              <div className="text-xl font-extrabold text-emerald-400">{fmt(investment.totalEarned)}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">total earned</div>
            </div>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl px-3 py-2.5 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Invested</div>
              <div className="text-sm font-extrabold text-white">{fmt(investment.amount)}</div>
            </div>
            <div className="rounded-xl px-3 py-2.5 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">ROI</div>
              <div className="text-sm font-extrabold text-sky-400">{fmtPct(roiPct)}</div>
            </div>
            <div className="rounded-xl px-3 py-2.5 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Interval</div>
              <div className="text-sm font-extrabold text-white">{investment.profitInterval}s</div>
            </div>
          </div>

          {/* Action buttons */}
          {investment.status === "ACTIVE" && (
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                className="flex-1 h-10 bg-sky-500/[0.12] hover:bg-sky-500/[0.22] text-sky-300 border border-sky-500/30 font-bold text-xs"
                onClick={() => setShowAddFunds(true)}
              >
                <Plus size={13} className="mr-1.5" /> Add Funds
              </Button>
              <Button
                size="sm"
                className="flex-1 h-10 bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-lg shadow-sky-500/20"
                render={<Link href="/dashboard/support" />}
              >
                <Zap size={13} className="mr-1.5" /> Upgrade Plan
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-10 w-10 px-0 border-white/10 text-slate-400 hover:text-white hover:bg-white/5 flex-shrink-0"
                onClick={onRefresh}
                title="Refresh"
              >
                <RefreshCw size={13} />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="px-5 py-10 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/10 flex items-center justify-center mb-4">
            <TrendingUp size={22} className="text-sky-400/50" />
          </div>
          <p className="text-sm font-bold text-white mb-1">No Active Investment</p>
          <p className="text-xs text-slate-500 mb-5 max-w-xs">
            Deposit funds and our team will activate an investment plan for you.
          </p>
          <Link href="/dashboard/deposit">
            <Button size="sm" className="bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs h-9">
              <ArrowDownToLine size={12} className="mr-1.5" /> Make a Deposit
            </Button>
          </Link>
        </div>
      )}

      {showAddFunds && investment && (
        <AddFundsModal
          usdBalance={usdBalance}
          onClose={() => setShowAddFunds(false)}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );
}

// ─── Copy Trading ─────────────────────────────────────────────────────────────────────────────

function CopyTradingSection({
  trades,
  onRefresh,
}: {
  trades: CopyTrade[];
  onRefresh: () => void;
}) {
  const [stopping, setStopping] = useState<string | null>(null);
  const active = trades.filter(t => t.status !== "STOPPED");

  async function handleStop(id: string, name: string) {
    setStopping(id);
    const r = await stopCopyTrade(id);
    setStopping(null);
    if (r.error) { toast.error(r.error); return; }
    toast.success(`Stopped copying ${name}`);
    onRefresh();
  }

  return (
    <div className="rounded-2xl border border-sky-500/15 overflow-hidden" style={{ background: "rgba(7,15,30,0.85)" }}>
      {/* Section header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-sky-400" />
          <span className="text-sm font-bold text-white">Copy Trading</span>
        </div>
        {active.length > 0 && (
          <span className="text-xs text-slate-500">{active.length} active</span>
        )}
      </div>

      {active.length === 0 ? (
        <div className="px-5 py-10 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/10 flex items-center justify-center mb-4">
            <Users size={22} className="text-sky-400/50" />
          </div>
          <p className="text-sm font-bold text-white mb-1">No Copy Trades Active</p>
          <p className="text-xs text-slate-500 max-w-xs">
            Our experts can assign top traders to copy on your behalf.
          </p>
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 items-center px-5 py-2 border-b border-white/[0.03]">
            <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Amount</span>
            <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Trader</span>
            <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest text-right">Earned</span>
            <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest text-right">ROI</span>
            <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest text-right">Action</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-white/[0.04]">
            {active.map(trade => {
              const roiPct = trade.amount > 0 ? (trade.totalEarned / trade.amount) * 100 : 0;
              const hue = [...trade.traderName].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
              const isStop = stopping === trade.id;

              return (
                <div
                  key={trade.id}
                  className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 items-center px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
                >
                  {/* Amount copied */}
                  <div className="text-sm font-bold text-sky-400 tabular-nums w-20">
                    {fmtShort(trade.amount)}
                  </div>

                  {/* Trader name + countdown */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                        style={{
                          background: `hsl(${hue} 55% 22%)`,
                          border: `1px solid hsl(${hue} 55% 32%)`,
                        }}
                      >
                        {trade.traderName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">{trade.traderName}</div>
                        {trade.status === "ACTIVE" && (
                          <div className="text-[10px] text-slate-500 mt-0.5 tabular-nums">
                            <CountdownBadge nextProfitAt={trade.nextProfitAt} label="Next" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Earned */}
                  <div className="text-sm font-extrabold text-emerald-400 tabular-nums text-right">
                    {fmt(trade.totalEarned)}
                  </div>

                  {/* ROI */}
                  <div className="text-xs font-bold text-sky-400 tabular-nums text-right">
                    {fmtPct(roiPct)}
                  </div>

                  {/* Stop button */}
                  <div className="text-right">
                    <Button
                      size="sm"
                      disabled={isStop}
                      onClick={() => handleStop(trade.id, trade.traderName)}
                      className="h-7 px-2.5 text-[11px] font-bold bg-red-500/[0.12] hover:bg-red-500/[0.22] text-red-400 border border-red-500/25 hover:border-red-500/40"
                    >
                      {isStop
                        ? <Loader2 size={11} className="animate-spin" />
                        : <><StopCircle size={11} className="mr-1" />Stop</>
                      }
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Recent Activity ────────────────────────────────────────────────────────────────────────

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
  INVESTMENT_PROFIT:     "bg-emerald-500",
  COPY_TRADE_PROFIT:     "bg-sky-500",
  INVESTMENT_STARTED:    "bg-violet-500",
  COPY_TRADE_STARTED:    "bg-blue-500",
  INVESTMENT_FUNDS_ADDED:"bg-yellow-500",
  INVESTMENT_UPGRADED:   "bg-orange-500",
  INVESTMENT_CANCELLED:  "bg-red-500",
  COPY_TRADE_STOPPED:    "bg-red-500",
};

function RecentActivity({ activity }: { activity: ActivityItem[] }) {
  return (
    <div className="rounded-2xl border border-sky-500/15 overflow-hidden" style={{ background: "rgba(7,15,30,0.85)" }}>
      <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.05]">
        <Activity size={14} className="text-sky-400" />
        <span className="text-sm font-bold text-white">Recent Activity</span>
      </div>

      {activity.length === 0 ? (
        <div className="px-5 py-8 text-center text-xs text-slate-500">No activity yet</div>
      ) : (
        <div className="divide-y divide-white/[0.04] max-h-72 overflow-y-auto">
          {activity.map(item => (
            <div key={item.id} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors">
              {/* Dot */}
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ACT_DOT[item.type] || "bg-slate-500"}`} />

              {/* Title + time */}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white truncate">{item.title}</div>
                <div className="text-[10px] text-slate-600 mt-0.5">{timeAgo(item.createdAt)}</div>
              </div>

              {/* Amount */}
              {item.amount != null && item.amount > 0 && (
                <div className={`text-xs font-extrabold flex-shrink-0 tabular-nums ${ACT_COLOR[item.type] || "text-slate-300"}`}>
                  +{fmt(item.amount)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────────────────────

export default function DashboardClient({
  user,
  usdBalance: initBalance,
  totalPortfolio,
  totalEarned: initEarned,
  isVerified,
  investment: initInvestment,
  copyTrades: initCopyTrades,
  activity: initActivity,
  chartData,
  wallets,
}: DashboardClientProps) {
  const [usdBalance, setUsdBalance]     = useState(initBalance);
  const [investment, setInvestment]     = useState<Investment | null>(initInvestment);
  const [copyTrades, setCopyTrades]     = useState<CopyTrade[]>(initCopyTrades);
  const [activity, setActivity]         = useState<ActivityItem[]>(initActivity);
  const [tick, setTick]                 = useState(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalEarned =
    (investment ? investment.totalEarned : 0) +
    copyTrades.filter(t => t.status !== "STOPPED").reduce((s, t) => s + t.totalEarned, 0);

  // 15-second profit poll
  const pollProfit = useCallback(async () => {
    try {
      const res = await fetch("/api/investment/profit", { method: "POST" });
      if (!res.ok) return;
      const data = await res.json();

      if (data.credited?.length > 0) {
        data.credited.forEach((c: { label: string; amount: number }) => {
          toast.success(`+${fmt(c.amount)} — ${c.label}`, { duration: 5000 });
        });
      }
      if (data.investment !== undefined) setInvestment(data.investment ? ser(data.investment) : null);
      if (data.copyTrades)  setCopyTrades(data.copyTrades.map(serCopy));
      if (data.activity)    setActivity(data.activity.map(serAct));
      if (data.usdBalance !== undefined) setUsdBalance(data.usdBalance);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    pollingRef.current = setInterval(pollProfit, 15_000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [pollProfit]);

  function refresh() {
    setTick(t => t + 1);
    pollProfit();
  }

  const activeCopyTrades = copyTrades.filter(t => t.status !== "STOPPED");

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* KYC banner */}
      {!isVerified && (
        <div
          className="rounded-xl px-4 py-3 flex items-center justify-between gap-4 border border-yellow-500/20"
          style={{ background: "rgba(234,179,8,0.06)" }}
        >
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-yellow-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-yellow-300">Identity Verification Required</p>
              <p className="text-xs text-slate-400 mt-0.5">Complete KYC to unlock full access and higher limits.</p>
            </div>
          </div>
          <Link href="/dashboard/verification" className="flex-shrink-0">
            <Button size="sm" className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs h-8 px-3">
              Verify Now
            </Button>
          </Link>
        </div>
      )}

      {/* ── LAYOUT ──────────────────────────────────────────────────────────────── */}
      {/* Mobile/Tablet: single column | Desktop: 2-col */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4 sm:gap-5">

        {/* ── Left column ─────────────────────────────────────────────────────────────── */}
        <div className="space-y-4 sm:space-y-5">

          {/* 1. Portfolio Overview */}
          <PortfolioOverview
            usdBalance={usdBalance}
            totalPortfolio={totalPortfolio}
            totalEarned={totalEarned}
            chartData={chartData}
          />

          {/* 1b. Wallet Balances (merged from Wallets page) */}
          <WalletStrip wallets={wallets} />

          {/* 2. Active Investment */}
          <ActiveInvestment
            key={tick}
            investment={investment}
            usdBalance={usdBalance}
            onRefresh={refresh}
          />

          {/* 3. Copy Trading — on mobile shows here in left col */}
          <div className="xl:hidden">
            <CopyTradingSection key={`mob-${tick}`} trades={copyTrades} onRefresh={refresh} />
          </div>

          {/* 4. Activity — on mobile shows here */}
          <div className="xl:hidden">
            <RecentActivity activity={activity} />
          </div>
        </div>

        {/* ── Right column (desktop only) ───────────────────────────────────────────────────── */}
        <div className="hidden xl:flex flex-col gap-5">
          {/* Stat summary pills */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "USD Balance",   value: fmt(usdBalance),        color: "text-white",       icon: DollarSign,  bg: "bg-sky-500/10",     ic: "text-sky-400" },
              { label: "Total Earned",  value: fmt(totalEarned),       color: "text-emerald-400", icon: TrendingUp,  bg: "bg-emerald-500/10", ic: "text-emerald-400" },
              { label: "Portfolio",     value: fmt(totalPortfolio),    color: "text-white",       icon: Wallet,      bg: "bg-violet-500/10",  ic: "text-violet-400" },
              { label: "Active",        value: `${(investment && investment.status === "ACTIVE" ? 1 : 0) + activeCopyTrades.length}`, color: "text-sky-400", icon: Zap, bg: "bg-sky-500/10", ic: "text-sky-400" },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-4 border border-sky-500/10" style={{ background: "rgba(7,15,30,0.85)" }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{s.label}</span>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${s.bg}`}>
                    <s.icon size={13} className={s.ic} />
                  </div>
                </div>
                <div className={`text-base font-extrabold ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* 3. Copy Trading — desktop right col */}
          <CopyTradingSection key={`dt-${tick}`} trades={copyTrades} onRefresh={refresh} />

          {/* 4. Activity — desktop right col */}
          <RecentActivity activity={activity} />
        </div>
      </div>
    </div>
  );
}

// ─── Serialisers (Prisma Decimal / Date → plain JS) ─────────────────────────────────────

function ser(inv: any): Investment {
  return {
    id: inv.id, planName: inv.planName,
    amount: Number(inv.amount), totalEarned: Number(inv.totalEarned),
    minProfit: Number(inv.minProfit), maxProfit: Number(inv.maxProfit),
    profitInterval: inv.profitInterval, status: inv.status,
    nextProfitAt: inv.nextProfitAt ? new Date(inv.nextProfitAt).toISOString() : null,
  };
}

function serCopy(t: any): CopyTrade {
  return {
    id: t.id, traderName: t.traderName,
    amount: Number(t.amount), totalEarned: Number(t.totalEarned),
    minProfit: Number(t.minProfit), maxProfit: Number(t.maxProfit),
    profitInterval: t.profitInterval, status: t.status,
    nextProfitAt: t.nextProfitAt ? new Date(t.nextProfitAt).toISOString() : null,
  };
}

function serAct(a: any): ActivityItem {
  return {
    id: a.id, type: a.type, title: a.title,
    amount: a.amount !== null ? Number(a.amount) : null,
    currency: a.currency,
    createdAt: new Date(a.createdAt).toISOString(),
  };
}