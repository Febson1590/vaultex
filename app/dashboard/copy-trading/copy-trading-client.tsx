"use client";

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Users, TrendingUp, ArrowDownToLine, DollarSign,
  Loader2, ChevronRight, StopCircle,
} from "lucide-react";
import { userStartCopyTrade, stopCopyTrade, getAvailableTraders } from "@/lib/actions/investment";
import { formatCurrency } from "@/lib/utils";

interface Trader {
  id: string; name: string; avatarUrl: string | null; specialty: string | null;
  winRate: number; totalROI: number; followers: number; minCopyAmount: number;
  minProfit: number; maxProfit: number; profitInterval: number; maxInterval: number;
}
interface ActiveTrade {
  id: string; traderName: string; traderId: string; amount: number; totalEarned: number;
  minProfit: number; maxProfit: number; profitInterval: number; maxInterval: number; status: string;
}
interface Props { activeTrades: ActiveTrade[]; stoppedTrades: ActiveTrade[]; usdBalance: number }

function Avatar({ name, avatarUrl, size = "md" }: { name: string; avatarUrl: string | null; size?: "sm" | "md" | "lg" }) {
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const cls = size === "lg" ? "w-14 h-14 text-sm" : size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-xs";
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className={`${cls} rounded-xl object-cover flex-shrink-0 border border-white/10`} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />;
  }
  return (
    <div className={`${cls} rounded-xl flex items-center justify-center font-bold text-white flex-shrink-0`}
      style={{ background: `hsl(${hue} 55% 22%)`, border: `1px solid hsl(${hue} 55% 32%)` }}>
      {name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
    </div>
  );
}

function CopyModal({ trader, usdBalance, onClose, onSuccess }: {
  trader: Trader; usdBalance: number; onClose: () => void; onSuccess: () => void;
}) {
  const [amount, setAmount] = useState(String(trader.minCopyAmount));
  const [isPending, start] = useTransition();
  const val = parseFloat(amount) || 0;
  const ok = val >= trader.minCopyAmount && val <= usdBalance;

  function submit() {
    if (val < trader.minCopyAmount) { toast.error(`Minimum is ${formatCurrency(trader.minCopyAmount)}`); return; }
    if (val > usdBalance) { toast.error("Insufficient USD balance"); return; }
    start(async () => {
      const r = await userStartCopyTrade({ traderId: trader.id, amount: val });
      if (r.error) { toast.error(r.error); return; }
      toast.success(`Now copying ${trader.name}!`); onSuccess();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-card border border-sky-500/20 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <Avatar name={trader.name} avatarUrl={trader.avatarUrl} size="md" />
          <div>
            <h3 className="text-base font-bold text-white">{trader.name}</h3>
            <p className="text-xs text-slate-500">{trader.specialty || "Crypto Trader"}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { label: "Win Rate", value: `${trader.winRate}%`,   color: "text-emerald-400" },
            { label: "Total ROI", value: `+${trader.totalROI}%`, color: "text-sky-400" },
            { label: "Min Copy",  value: formatCurrency(trader.minCopyAmount), color: "text-white" },
          ].map(s => (
            <div key={s.label} className="px-2 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-center">
              <div className="text-[10px] text-slate-500 mb-0.5">{s.label}</div>
              <div className={`text-xs font-bold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>
        <div className="mb-4 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 flex justify-between">
          <span className="text-xs text-slate-500">Your USD Balance</span>
          <span className="text-sm font-bold text-white">{formatCurrency(usdBalance)}</span>
        </div>
        <div className="mb-5">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Copy Amount (USD)</label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <input type="number" autoFocus step="100"
              className="w-full bg-white/[0.06] border border-white/[0.15] rounded-lg pl-7 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-sky-500/60"
              value={amount} onChange={e => setAmount(e.target.value)} min={trader.minCopyAmount} />
          </div>
          {val > 0 && val > usdBalance && <p className="text-[11px] text-red-400 mt-1">Insufficient balance</p>}
          {val > 0 && val < trader.minCopyAmount && <p className="text-[11px] text-yellow-400 mt-1">Below minimum of {formatCurrency(trader.minCopyAmount)}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 border-white/10 text-slate-300 hover:text-white" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button className="flex-1 bg-sky-500 hover:bg-sky-400 text-white font-semibold" onClick={submit} disabled={isPending || !ok}>
            {isPending ? <Loader2 size={14} className="animate-spin mr-1" /> : <DollarSign size={14} className="mr-1" />}Start Copying
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function CopyTradingClient({ activeTrades: initActive, stoppedTrades, usdBalance }: Props) {
  const [traders, setTraders] = useState<Trader[]>([]);
  const [loadingTraders, setLoadingTraders] = useState(true);
  const [activeTrades, setActiveTrades] = useState<ActiveTrade[]>(initActive);
  const [selectedTrader, setSelectedTrader] = useState<Trader | null>(null);
  const [stoppingId, setStoppingId] = useState<string | null>(null);
  const [, start] = useTransition();

  useEffect(() => {
    getAvailableTraders().then((data: any[]) => {
      setTraders(data.map(t => ({
        ...t, winRate: Number(t.winRate), totalROI: Number(t.totalROI),
        minCopyAmount: Number(t.minCopyAmount), minProfit: Number(t.minProfit),
        maxProfit: Number(t.maxProfit), maxInterval: t.maxInterval ?? t.profitInterval,
      })));
      setLoadingTraders(false);
    });
  }, []);

  function handleSuccess() { setSelectedTrader(null); window.location.reload(); }

  async function handleStop(tradeId: string) {
    if (!confirm("Stop copying this trader?")) return;
    setStoppingId(tradeId);
    start(async () => {
      const r = await stopCopyTrade(tradeId);
      if (r.error) toast.error(r.error);
      else { toast.success("Copy trade stopped"); setActiveTrades(p => p.filter(t => t.id !== tradeId)); }
      setStoppingId(null);
    });
  }

  const copyingIds = new Set(activeTrades.map(t => t.traderId));
  const totalEarned = activeTrades.reduce((s, t) => s + t.totalEarned, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Copy Trading</h1>
          <p className="text-sm text-slate-500 mt-0.5">Mirror top traders and earn automatically</p>
        </div>
        {activeTrades.length > 0 && (
          <div className="text-right flex-shrink-0">
            <div className="text-2xl font-extrabold text-emerald-400">{formatCurrency(totalEarned)}</div>
            <div className="text-xs text-slate-500 mt-0.5">{activeTrades.length} active trader{activeTrades.length !== 1 ? "s" : ""}</div>
          </div>
        )}
      </div>

      {activeTrades.length > 0 && (
        <div className="glass-card rounded-2xl overflow-hidden border border-sky-500/15">
          <div className="px-5 py-4 border-b border-white/[0.05] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-bold text-white">Active Copies</span>
            <span className="ml-auto text-xs text-slate-500">{activeTrades.length} running</span>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {activeTrades.map(trade => {
              const roi = trade.amount > 0 ? (trade.totalEarned / trade.amount) * 100 : 0;
              return (
                <div key={trade.id} className="flex items-center gap-3 px-5 py-4 hover:bg-white/[0.02] transition-colors">
                  <Avatar name={trade.traderName} avatarUrl={null} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white truncate">{trade.traderName}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{trade.minProfit}%–{trade.maxProfit}% / {trade.profitInterval}s–{trade.maxInterval}s</div>
                  </div>
                  <div className="text-right hidden sm:block flex-shrink-0">
                    <div className="text-xs text-slate-500 mb-0.5">Copying</div>
                    <div className="text-sm font-bold text-sky-400">{formatCurrency(trade.amount)}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-slate-500 mb-0.5">Earned</div>
                    <div className="text-sm font-extrabold text-emerald-400">{formatCurrency(trade.totalEarned)}</div>
                  </div>
                  <div className="text-right hidden sm:block flex-shrink-0 w-14">
                    <div className="text-xs text-slate-500 mb-0.5">ROI</div>
                    <div className="text-sm font-bold text-sky-400">{roi >= 0 ? "+" : ""}{roi.toFixed(2)}%</div>
                  </div>
                  <button disabled={stoppingId === trade.id} onClick={() => handleStop(trade.id)}
                    className="flex-shrink-0 p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors disabled:opacity-50"
                    title="Stop copying">
                    {stoppingId === trade.id ? <Loader2 size={14} className="animate-spin" /> : <StopCircle size={14} />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Users size={14} className="text-sky-400" /> Available Traders
          {loadingTraders && <Loader2 size={12} className="animate-spin text-slate-500" />}
        </h2>

        {!loadingTraders && traders.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center border border-white/[0.07]">
            <div className="w-16 h-16 rounded-2xl bg-sky-500/[0.08] flex items-center justify-center mx-auto mb-5">
              <Users size={28} className="text-sky-400/50" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">No Traders Available</h3>
            <p className="text-sm text-slate-500 mb-7 max-w-sm mx-auto">Our team is setting up trader profiles. Make a deposit to get started.</p>
            <a href="/dashboard/deposit">
              <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-bold transition-colors shadow-lg shadow-sky-500/25">
                <ArrowDownToLine size={14} /> Make a Deposit
              </button>
            </a>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {traders.map(trader => {
              const alreadyCopying = copyingIds.has(trader.id);
              return (
                <div key={trader.id}
                  className={`glass-card rounded-2xl border transition-all overflow-hidden ${alreadyCopying ? "border-emerald-500/30 opacity-80" : "border-sky-500/15 hover:border-sky-500/40 cursor-pointer group"}`}
                  onClick={() => !alreadyCopying && setSelectedTrader(trader)}>
                  <div className="px-5 pt-5 pb-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={trader.name} avatarUrl={trader.avatarUrl} size="lg" />
                        <div>
                          <div className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors">{trader.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{trader.specialty || "Crypto Trader"}</div>
                          <div className="text-xs text-slate-600 mt-0.5">{trader.followers.toLocaleString()} followers</div>
                        </div>
                      </div>
                      {alreadyCopying
                        ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex-shrink-0">Copying</span>
                        : <ChevronRight size={16} className="text-slate-600 group-hover:text-sky-400 transition-colors mt-1 flex-shrink-0" />
                      }
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white/[0.04] rounded-xl p-2.5">
                        <div className="text-[10px] text-slate-500 mb-0.5">Win Rate</div>
                        <div className="text-sm font-bold text-emerald-400">{trader.winRate}%</div>
                      </div>
                      <div className="bg-white/[0.04] rounded-xl p-2.5">
                        <div className="text-[10px] text-slate-500 mb-0.5">Total ROI</div>
                        <div className="text-sm font-bold text-sky-400">+{trader.totalROI}%</div>
                      </div>
                      <div className="bg-white/[0.04] rounded-xl p-2.5">
                        <div className="text-[10px] text-slate-500 mb-0.5">Profit/Cycle</div>
                        <div className="text-sm font-bold text-white">{trader.minProfit}%–{trader.maxProfit}%</div>
                      </div>
                      <div className="bg-white/[0.04] rounded-xl p-2.5">
                        <div className="text-[10px] text-slate-500 mb-0.5">Min Copy</div>
                        <div className="text-sm font-bold text-white">{formatCurrency(trader.minCopyAmount)}</div>
                      </div>
                    </div>
                  </div>
                  <div className={`px-5 py-3 border-t border-white/[0.05] transition-colors ${alreadyCopying ? "bg-emerald-500/[0.05]" : "bg-sky-500/[0.03] group-hover:bg-sky-500/[0.06]"}`}>
                    <span className={`text-xs font-semibold flex items-center gap-1 ${alreadyCopying ? "text-emerald-400" : "text-sky-400"}`}>
                      <TrendingUp size={11} /> {alreadyCopying ? "Already copying this trader" : "Click to start copying"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {stoppedTrades.length > 0 && (
        <div className="glass-card rounded-2xl overflow-hidden border border-white/[0.07]">
          <div className="px-5 py-4 border-b border-white/[0.05]">
            <span className="text-sm font-semibold text-slate-500">Past Copies</span>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {stoppedTrades.map(trade => {
              const roi = trade.amount > 0 ? (trade.totalEarned / trade.amount) * 100 : 0;
              return (
                <div key={trade.id} className="flex items-center gap-3 px-5 py-4 opacity-60">
                  <Avatar name={trade.traderName} avatarUrl={null} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-400 truncate">{trade.traderName}</div>
                    <div className="text-xs text-slate-600">Stopped</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-slate-600 mb-0.5">Earned</div>
                    <div className="text-sm font-bold text-slate-400">{formatCurrency(trade.totalEarned)}</div>
                  </div>
                  <div className="text-right hidden sm:block flex-shrink-0 w-14">
                    <div className="text-xs text-slate-600 mb-0.5">ROI</div>
                    <div className="text-sm font-bold text-slate-500">{roi >= 0 ? "+" : ""}{roi.toFixed(2)}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedTrader && (
        <CopyModal trader={selectedTrader} usdBalance={usdBalance} onClose={() => setSelectedTrader(null)} onSuccess={handleSuccess} />
      )}
    </div>
  );
}
