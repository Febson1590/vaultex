"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Loader2, Users, Plus, StopCircle, ChevronDown, UserPlus, Edit2,
} from "lucide-react";
import {
  adminCreateCopyTrader,
  adminUpdateCopyTrader,
  adminAssignCopyTrade,
  adminStopCopyTrade,
  adminGetAllCopyTraders,
  adminGetAllCopyTrades,
  adminGetAllUsers,
} from "@/lib/actions/investment";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CopyTrader {
  id: string;
  name: string;
  specialty: string | null;
  winRate: number;
  totalROI: number;
  followers: number;
  minCopyAmount: number;
  profitInterval: number;
  minProfit: number;
  maxProfit: number;
  isActive: boolean;
  userCopyTrades: { id: string }[];
}
interface CopyTrade {
  id: string;
  traderName: string;
  amount: number;
  totalEarned: number;
  status: string;
  startedAt: string;
  user: { name: string | null; email: string };
  trader: { name: string };
}
interface UserOption { id: string; name: string | null; email: string }

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:  "bg-emerald-500/10 border-emerald-500/25 text-emerald-400",
  PAUSED:  "bg-yellow-500/10 border-yellow-500/25 text-yellow-400",
  STOPPED: "bg-red-500/10 border-red-500/25 text-red-400",
};

// ─── Create/Edit Trader Modal ─────────────────────────────────────────────────
function TraderModal({ trader, onClose, onSuccess }: {
  trader?: CopyTrader;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    name: trader?.name ?? "",
    specialty: trader?.specialty ?? "",
    winRate: String(trader?.winRate ?? "85"),
    totalROI: String(trader?.totalROI ?? "120"),
    followers: String(trader?.followers ?? "1200"),
    minCopyAmount: String(trader?.minCopyAmount ?? "100"),
    profitInterval: String(trader?.profitInterval ?? "60"),
    minProfit: String(trader?.minProfit ?? "0.3"),
    maxProfit: String(trader?.maxProfit ?? "1.2"),
    description: "",
  });
  const [loading, setLoading] = useState(false);

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function submit() {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setLoading(true);
    const payload = {
      name: form.name.trim(),
      specialty: form.specialty || undefined,
      winRate: parseFloat(form.winRate),
      totalROI: parseFloat(form.totalROI),
      followers: parseInt(form.followers),
      minCopyAmount: parseFloat(form.minCopyAmount),
      profitInterval: parseInt(form.profitInterval),
      minProfit: parseFloat(form.minProfit),
      maxProfit: parseFloat(form.maxProfit),
      description: form.description || undefined,
    };
    const r = trader
      ? await adminUpdateCopyTrader(trader.id, payload)
      : await adminCreateCopyTrader(payload);
    setLoading(false);
    if (r.error) { toast.error(r.error); return; }
    toast.success(trader ? "Trader updated!" : "Trader created!");
    onSuccess();
    onClose();
  }

  const inputCls = "w-full bg-white/[0.06] border border-white/[0.15] rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-sky-500/60";
  const labelCls = "text-xs font-medium text-slate-400 uppercase tracking-wider";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-card border border-sky-500/20 rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold text-white mb-5">{trader ? "Edit Trader" : "Create Copy Trader"}</h3>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Trader Name</label>
            <input className={`${inputCls} mt-1`} value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Alex Rivers" />
          </div>
          <div>
            <label className={labelCls}>Specialty</label>
            <input className={`${inputCls} mt-1`} value={form.specialty} onChange={e => set("specialty", e.target.value)} placeholder="e.g. BTC/ETH Scalping" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Win Rate (%)</label>
              <input type="number" className={`${inputCls} mt-1`} value={form.winRate} onChange={e => set("winRate", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Total ROI (%)</label>
              <input type="number" className={`${inputCls} mt-1`} value={form.totalROI} onChange={e => set("totalROI", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Followers</label>
              <input type="number" className={`${inputCls} mt-1`} value={form.followers} onChange={e => set("followers", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Min Copy (USD)</label>
              <input type="number" className={`${inputCls} mt-1`} value={form.minCopyAmount} onChange={e => set("minCopyAmount", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Min Profit (%)</label>
              <input type="number" step="0.01" className={`${inputCls} mt-1`} value={form.minProfit} onChange={e => set("minProfit", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Max Profit (%)</label>
              <input type="number" step="0.01" className={`${inputCls} mt-1`} value={form.maxProfit} onChange={e => set("maxProfit", e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Profit Interval (seconds)</label>
            <input type="number" className={`${inputCls} mt-1`} value={form.profitInterval} onChange={e => set("profitInterval", e.target.value)} />
            <p className="text-[11px] text-slate-500 mt-1">e.g. 60 = every 1 min · 3600 = every hour</p>
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <Button variant="outline" className="flex-1 border-white/10 text-slate-300 hover:text-white" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-sky-500 hover:bg-sky-400 text-white font-semibold" onClick={submit} disabled={loading}>
            {loading ? <Loader2 size={14} className="animate-spin mr-1" /> : null} {trader ? "Save" : "Create"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Assign Trade Modal ───────────────────────────────────────────────────────
function AssignTradeModal({ traders, users, onClose, onSuccess }: {
  traders: CopyTrader[];
  users: UserOption[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({ userId: "", traderId: "", amount: "" });
  const [loading, setLoading] = useState(false);

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function submit() {
    if (!form.userId) { toast.error("Select a user"); return; }
    if (!form.traderId) { toast.error("Select a trader"); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error("Enter a valid amount"); return; }
    setLoading(true);
    const r = await adminAssignCopyTrade({
      userId: form.userId,
      traderId: form.traderId,
      amount: parseFloat(form.amount),
    });
    setLoading(false);
    if (r.error) { toast.error(r.error); return; }
    toast.success("Copy trade assigned!");
    onSuccess();
    onClose();
  }

  const inputCls = "w-full bg-white/[0.06] border border-white/[0.15] rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-sky-500/60 appearance-none";
  const labelCls = "text-xs font-medium text-slate-400 uppercase tracking-wider";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-card border border-sky-500/20 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold text-white mb-5">Assign Copy Trade</h3>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>User</label>
            <div className="relative mt-1">
              <select value={form.userId} onChange={e => set("userId", e.target.value)} className={`${inputCls} pr-8`}>
                <option value="" className="bg-[#0d1e3a]">Select user…</option>
                {users.map(u => <option key={u.id} value={u.id} className="bg-[#0d1e3a]">{u.name || "—"} ({u.email})</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Trader</label>
            <div className="relative mt-1">
              <select value={form.traderId} onChange={e => set("traderId", e.target.value)} className={`${inputCls} pr-8`}>
                <option value="" className="bg-[#0d1e3a]">Select trader…</option>
                {traders.filter(t => t.isActive).map(t => (
                  <option key={t.id} value={t.id} className="bg-[#0d1e3a]">{t.name} ({t.winRate}% win rate)</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Copy Amount (USD)</label>
            <input type="number" className={`${inputCls} mt-1`} value={form.amount} onChange={e => set("amount", e.target.value)} placeholder="e.g. 2000" />
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <Button variant="outline" className="flex-1 border-white/10 text-slate-300 hover:text-white" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-sky-500 hover:bg-sky-400 text-white font-semibold" onClick={submit} disabled={loading}>
            {loading ? <Loader2 size={14} className="animate-spin mr-1" /> : null} Assign
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminCopyTradersPage() {
  const [traders, setTraders] = useState<CopyTrader[]>([]);
  const [trades, setTrades] = useState<CopyTrade[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTrader, setShowCreateTrader] = useState(false);
  const [editTrader, setEditTrader] = useState<CopyTrader | null>(null);
  const [showAssignTrade, setShowAssignTrade] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [tab, setTab] = useState<"traders" | "assignments">("traders");

  async function load() {
    setLoading(true);
    const [trs, tds, usrs] = await Promise.all([
      adminGetAllCopyTraders(),
      adminGetAllCopyTrades(),
      adminGetAllUsers(),
    ]);
    setTraders(trs.map((t: any) => ({
      ...t,
      winRate: Number(t.winRate),
      totalROI: Number(t.totalROI),
      minCopyAmount: Number(t.minCopyAmount),
      minProfit: Number(t.minProfit),
      maxProfit: Number(t.maxProfit),
    })));
    setTrades(tds.map((t: any) => ({
      ...t,
      amount: Number(t.amount),
      totalEarned: Number(t.totalEarned),
      startedAt: new Date(t.startedAt).toISOString(),
    })));
    setUsers(usrs);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleStop(tradeId: string) {
    if (!confirm("Stop this copy trade?")) return;
    setProcessing(tradeId);
    const r = await adminStopCopyTrade(tradeId);
    if (r.error) toast.error(r.error);
    else { toast.success("Copy trade stopped"); load(); }
    setProcessing(null);
  }

  const activeTrades = trades.filter(t => t.status === "ACTIVE").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users size={20} className="text-sky-400" /> Copy Traders
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage traders and user copy assignments</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAssignTrade(true)} variant="outline"
            className="border-sky-500/30 text-sky-400 hover:bg-sky-500/10 text-sm h-9 px-4">
            <UserPlus size={14} className="mr-1.5" /> Assign Trade
          </Button>
          <Button onClick={() => setShowCreateTrader(true)}
            className="bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm h-9 px-4">
            <Plus size={14} className="mr-1.5" /> New Trader
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Traders", value: traders.length, color: "text-white" },
          { label: "Active Traders", value: traders.filter(t => t.isActive).length, color: "text-emerald-400" },
          { label: "Active Copies", value: activeTrades, color: "text-sky-400" },
          { label: "Total Earned", value: fmt(trades.reduce((s, t) => s + t.totalEarned, 0)), color: "text-emerald-400" },
        ].map(s => (
          <div key={s.label} className="glass-card rounded-xl p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{s.label}</div>
            <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/5">
        {(["traders", "assignments"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors capitalize ${
              tab === t ? "text-sky-400 border-b-2 border-sky-400" : "text-slate-500 hover:text-white"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Traders tab */}
      {tab === "traders" && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <span className="text-sm font-semibold text-white">{traders.length} Trader{traders.length !== 1 ? "s" : ""}</span>
          </div>
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Loading…
            </div>
          ) : traders.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">No traders yet. Create one to get started.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full premium-table">
                <thead>
                  <tr className="border-b border-white/5">
                    {["Trader", "Specialty", "Win Rate", "ROI", "Followers", "Profit Range", "Interval", "Copies", "Actions"].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-slate-500 px-4 py-3 uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {traders.map(trader => (
                    <tr key={trader.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                            style={{
                              background: `hsl(${[...trader.name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360} 60% 25%)`,
                              border: `1px solid hsl(${[...trader.name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360} 60% 35%)`,
                            }}
                          >
                            {trader.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div className="text-sm font-semibold text-white">{trader.name}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{trader.specialty || "—"}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-emerald-400">{trader.winRate}%</td>
                      <td className="px-4 py-3 text-sm font-semibold text-sky-400">+{trader.totalROI}%</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{trader.followers.toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{trader.minProfit}%–{trader.maxProfit}%</td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{trader.profitInterval}s</td>
                      <td className="px-4 py-3 text-xs text-white font-semibold">{trader.userCopyTrades.length}</td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          onClick={() => setEditTrader(trader)}
                          className="h-7 px-2 text-xs bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20"
                        >
                          <Edit2 size={11} className="mr-1" />Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Assignments tab */}
      {tab === "assignments" && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <span className="text-sm font-semibold text-white">{trades.length} Assignment{trades.length !== 1 ? "s" : ""}</span>
          </div>
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Loading…
            </div>
          ) : trades.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">No assignments yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full premium-table">
                <thead>
                  <tr className="border-b border-white/5">
                    {["User", "Trader", "Amount", "Earned", "Status", "Started", "Actions"].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-slate-500 px-4 py-3 uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trades.map(trade => (
                    <tr key={trade.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <div className="text-sm text-white font-medium">{trade.user.name || "—"}</div>
                        <div className="text-xs text-slate-500">{trade.user.email}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300 font-medium">{trade.traderName}</td>
                      <td className="px-4 py-3 text-sm font-bold text-white">{fmt(trade.amount)}</td>
                      <td className="px-4 py-3 text-sm font-bold text-emerald-400">{fmt(trade.totalEarned)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[trade.status] || ""}`}>
                          {trade.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(trade.startedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {trade.status === "ACTIVE" && (
                          <Button
                            size="sm"
                            disabled={processing === trade.id}
                            onClick={() => handleStop(trade.id)}
                            className="h-7 px-2 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                          >
                            {processing === trade.id ? <Loader2 size={11} className="animate-spin" /> : <><StopCircle size={11} className="mr-1" />Stop</>}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showCreateTrader && <TraderModal onClose={() => setShowCreateTrader(false)} onSuccess={load} />}
      {editTrader && <TraderModal trader={editTrader} onClose={() => setEditTrader(null)} onSuccess={load} />}
      {showAssignTrade && <AssignTradeModal traders={traders} users={users} onClose={() => setShowAssignTrade(false)} onSuccess={load} />}
    </div>
  );
}
