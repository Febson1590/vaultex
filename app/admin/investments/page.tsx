"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, TrendingUp, Plus, PauseCircle, PlayCircle, XCircle, ChevronDown } from "lucide-react";
import {
  adminAssignInvestment,
  adminToggleInvestment,
  adminCancelInvestment,
  adminGetAllInvestments,
  adminGetAllUsers,
} from "@/lib/actions/investment";

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserInvestment {
  id: string;
  userId: string;
  planName: string;
  amount: number;
  totalEarned: number;
  minProfit: number;
  maxProfit: number;
  profitInterval: number;
  status: string;
  startedAt: string;
  user: { name: string | null; email: string };
}
interface UserOption { id: string; name: string | null; email: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:    "bg-emerald-500/10 border-emerald-500/25 text-emerald-400",
  PAUSED:    "bg-yellow-500/10 border-yellow-500/25 text-yellow-400",
  COMPLETED: "bg-sky-500/10 border-sky-500/25 text-sky-400",
  CANCELLED: "bg-red-500/10 border-red-500/25 text-red-400",
};

// ─── Assign Modal ─────────────────────────────────────────────────────────────
function AssignModal({ users, onClose, onSuccess }: {
  users: UserOption[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    userId: "",
    planName: "Growth Plan",
    amount: "",
    minProfit: "0.5",
    maxProfit: "1.5",
    profitInterval: "60",
  });
  const [loading, setLoading] = useState(false);

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function submit() {
    if (!form.userId) { toast.error("Select a user"); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error("Enter a valid amount"); return; }
    setLoading(true);
    const r = await adminAssignInvestment({
      userId: form.userId,
      planName: form.planName,
      amount: parseFloat(form.amount),
      minProfit: parseFloat(form.minProfit),
      maxProfit: parseFloat(form.maxProfit),
      profitInterval: parseInt(form.profitInterval),
    });
    setLoading(false);
    if (r.error) { toast.error(r.error); return; }
    toast.success("Investment assigned!");
    onSuccess();
    onClose();
  }

  const inputCls = "w-full bg-white/[0.06] border border-white/[0.15] rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-sky-500/60";
  const labelCls = "text-xs font-medium text-slate-400 uppercase tracking-wider";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-card border border-sky-500/20 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold text-white mb-5">Assign Investment</h3>

        <div className="space-y-4">
          {/* User select */}
          <div>
            <label className={labelCls}>User</label>
            <div className="relative mt-1">
              <select
                value={form.userId}
                onChange={e => set("userId", e.target.value)}
                className={`${inputCls} appearance-none pr-8`}
              >
                <option value="" className="bg-[#0d1e3a]">Select user…</option>
                {users.map(u => (
                  <option key={u.id} value={u.id} className="bg-[#0d1e3a]">
                    {u.name || "—"} ({u.email})
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Plan name */}
          <div>
            <label className={labelCls}>Plan Name</label>
            <input className={`${inputCls} mt-1`} value={form.planName} onChange={e => set("planName", e.target.value)} placeholder="e.g. Growth Plan" />
          </div>

          {/* Amount */}
          <div>
            <label className={labelCls}>Investment Amount (USD)</label>
            <input type="number" className={`${inputCls} mt-1`} value={form.amount} onChange={e => set("amount", e.target.value)} placeholder="e.g. 5000" />
          </div>

          {/* Profit range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Min Profit (%)</label>
              <input type="number" step="0.01" className={`${inputCls} mt-1`} value={form.minProfit} onChange={e => set("minProfit", e.target.value)} placeholder="0.5" />
            </div>
            <div>
              <label className={labelCls}>Max Profit (%)</label>
              <input type="number" step="0.01" className={`${inputCls} mt-1`} value={form.maxProfit} onChange={e => set("maxProfit", e.target.value)} placeholder="1.5" />
            </div>
          </div>

          {/* Interval */}
          <div>
            <label className={labelCls}>Profit Interval (seconds)</label>
            <input type="number" className={`${inputCls} mt-1`} value={form.profitInterval} onChange={e => set("profitInterval", e.target.value)} placeholder="60" />
            <p className="text-[11px] text-slate-500 mt-1">e.g. 60 = every 1 min · 3600 = every hour</p>
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
export default function AdminInvestmentsPage() {
  const [investments, setInvestments] = useState<UserInvestment[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssign, setShowAssign] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [invs, usrs] = await Promise.all([adminGetAllInvestments(), adminGetAllUsers()]);
    setInvestments(invs.map((i: any) => ({
      ...i,
      amount: Number(i.amount),
      totalEarned: Number(i.totalEarned),
      minProfit: Number(i.minProfit),
      maxProfit: Number(i.maxProfit),
      startedAt: new Date(i.startedAt).toISOString(),
    })));
    setUsers(usrs);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleToggle(userId: string, current: string) {
    setProcessing(userId);
    const newStatus = current === "ACTIVE" ? "PAUSED" : "ACTIVE";
    const r = await adminToggleInvestment(userId, newStatus);
    if (r.error) toast.error(r.error);
    else { toast.success(`Investment ${newStatus.toLowerCase()}`); load(); }
    setProcessing(null);
  }

  async function handleCancel(userId: string) {
    if (!confirm("Cancel this user's investment?")) return;
    setProcessing(userId);
    const r = await adminCancelInvestment(userId);
    if (r.error) toast.error(r.error);
    else { toast.success("Investment cancelled"); load(); }
    setProcessing(null);
  }

  const active = investments.filter(i => i.status === "ACTIVE").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp size={20} className="text-sky-400" /> Investments
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage user investment plans</p>
        </div>
        <Button onClick={() => setShowAssign(true)} className="bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm h-9 px-4">
          <Plus size={14} className="mr-1.5" /> Assign Investment
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total", value: investments.length, color: "text-white" },
          { label: "Active", value: active, color: "text-emerald-400" },
          { label: "Paused", value: investments.filter(i => i.status === "PAUSED").length, color: "text-yellow-400" },
          { label: "Total Earned", value: fmt(investments.reduce((s, i) => s + i.totalEarned, 0)), color: "text-sky-400" },
        ].map(s => (
          <div key={s.label} className="glass-card rounded-xl p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{s.label}</div>
            <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <span className="text-sm font-semibold text-white">{investments.length} Investment{investments.length !== 1 ? "s" : ""}</span>
        </div>
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" /> Loading…
          </div>
        ) : investments.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">No investments yet. Assign one to get started.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full premium-table">
              <thead>
                <tr className="border-b border-white/5">
                  {["User", "Plan", "Amount", "Earned", "Rate", "Interval", "Status", "Actions"].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-slate-500 px-4 py-3 uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {investments.map(inv => (
                  <tr key={inv.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="text-sm text-white font-medium">{inv.user.name || "—"}</div>
                      <div className="text-xs text-slate-500">{inv.user.email}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300 font-medium">{inv.planName}</td>
                    <td className="px-4 py-3 text-sm font-bold text-white">{fmt(inv.amount)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-emerald-400">{fmt(inv.totalEarned)}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{inv.minProfit}%–{inv.maxProfit}%</td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{inv.profitInterval}s</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[inv.status] || ""}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {(inv.status === "ACTIVE" || inv.status === "PAUSED") && (
                          <>
                            <Button
                              size="sm"
                              disabled={processing === inv.userId}
                              onClick={() => handleToggle(inv.userId, inv.status)}
                              className={`h-7 px-2 text-xs border ${
                                inv.status === "ACTIVE"
                                  ? "bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border-yellow-500/20"
                                  : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                              }`}
                            >
                              {processing === inv.userId ? <Loader2 size={11} className="animate-spin" /> : (
                                inv.status === "ACTIVE"
                                  ? <><PauseCircle size={11} className="mr-1" />Pause</>
                                  : <><PlayCircle size={11} className="mr-1" />Resume</>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              disabled={processing === inv.userId}
                              onClick={() => handleCancel(inv.userId)}
                              className="h-7 px-2 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                            >
                              <XCircle size={11} className="mr-1" />Cancel
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAssign && (
        <AssignModal users={users} onClose={() => setShowAssign(false)} onSuccess={load} />
      )}
    </div>
  );
}
