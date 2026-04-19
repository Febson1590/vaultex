"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Loader2, TrendingUp, Plus, PauseCircle, PlayCircle,
  XCircle, ChevronDown, Pencil, DollarSign, ToggleLeft, ToggleRight,
  Trash2,
} from "lucide-react";
import {
  adminAssignInvestment, adminEditInvestment, adminAddFundsToInvestment,
  adminToggleInvestment, adminCancelInvestment, adminGetAllInvestments,
  adminGetAllUsers, adminGetInvestmentPlans, adminCreatePlan, adminUpdatePlan,
  adminDeletePlan,
} from "@/lib/actions/investment";

interface UserInvestment {
  id: string; userId: string; planName: string; amount: number; totalEarned: number;
  minProfit: number; maxProfit: number; profitInterval: number; maxInterval: number;
  status: string; startedAt: string; user: { name: string | null; email: string };
}
interface Plan {
  id: string; name: string; description: string | null;
  minAmount: number; maxAmount: number | null;
  minProfit: number; maxProfit: number;
  minDurationDays: number | null; maxDurationDays: number | null;
  profitInterval: number; maxInterval: number;
  isActive: boolean; isPopular: boolean;
  _count: { userInvestments: number };
}
interface UserOption { id: string; name: string | null; email: string }

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}
const STATUS_COLORS: Record<string, string> = {
  ACTIVE:    "bg-emerald-500/10 border-emerald-500/25 text-emerald-400",
  PAUSED:    "bg-yellow-500/10 border-yellow-500/25 text-yellow-400",
  COMPLETED: "bg-sky-500/10 border-sky-500/25 text-sky-400",
  CANCELLED: "bg-red-500/10 border-red-500/25 text-red-400",
};
const inputCls = "w-full bg-white/[0.06] border border-white/[0.15] rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-sky-500/60";
const labelCls = "text-xs font-medium text-slate-400 uppercase tracking-wider";

// ── Plan Modal ────────────────────────────────────────────────────────────────
function PlanModal({ plan, onClose, onSuccess }: { plan?: Plan; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: plan?.name ?? "", description: plan?.description ?? "",
    minAmount: String(plan?.minAmount ?? 100),
    maxAmount: plan?.maxAmount !== null && plan?.maxAmount !== undefined ? String(plan.maxAmount) : "",
    minProfit: String(plan?.minProfit ?? 0.5), maxProfit: String(plan?.maxProfit ?? 1.5),
    minDurationDays: plan?.minDurationDays !== null && plan?.minDurationDays !== undefined ? String(plan.minDurationDays) : "",
    maxDurationDays: plan?.maxDurationDays !== null && plan?.maxDurationDays !== undefined ? String(plan.maxDurationDays) : "",
    profitInterval: String(plan?.profitInterval ?? 60), maxInterval: String(plan?.maxInterval ?? 60),
    isPopular: plan?.isPopular ?? false,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  function set(k: string, v: string | boolean) { setForm(f => ({ ...f, [k]: v })); }

  async function submit() {
    if (!form.name.trim()) { toast.error("Name required"); return; }
    setLoading(true);
    const maxAmountParsed = form.maxAmount.trim() ? parseFloat(form.maxAmount) : null;
    const minDur = form.minDurationDays.trim() ? parseInt(form.minDurationDays) : null;
    const maxDur = form.maxDurationDays.trim() ? parseInt(form.maxDurationDays) : null;
    if (minDur !== null && maxDur !== null && maxDur < minDur) {
      toast.error("Max duration must be ≥ min duration");
      return;
    }
    const payload = {
      name: form.name.trim(), description: form.description || undefined,
      minAmount: parseFloat(form.minAmount),
      maxAmount: maxAmountParsed,
      minProfit: parseFloat(form.minProfit), maxProfit: parseFloat(form.maxProfit),
      minDurationDays: minDur, maxDurationDays: maxDur,
      profitInterval: parseInt(form.profitInterval), maxInterval: parseInt(form.maxInterval),
      isPopular: form.isPopular,
    };
    const r = plan ? await adminUpdatePlan(plan.id, payload) : await adminCreatePlan(payload);
    setLoading(false);
    if (r.error) { toast.error(r.error); return; }
    toast.success(plan ? "Plan updated!" : "Plan created!");
    onSuccess(); onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-card border border-sky-500/20 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold text-white mb-5">{plan ? "Edit Plan" : "Create Investment Plan"}</h3>
        <div className="space-y-4">
          <div><label className={labelCls}>Plan Name</label><input className={inputCls + " mt-1"} value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Growth Plan" /></div>
          <div><label className={labelCls}>Description (optional)</label><input className={inputCls + " mt-1"} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Short description…" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Min Amount (USD)</label><input type="number" className={inputCls + " mt-1"} value={form.minAmount} onChange={e => set("minAmount", e.target.value)} /></div>
            <div><label className={labelCls}>Max Amount (USD) <span className="text-slate-600">— optional</span></label><input type="number" className={inputCls + " mt-1"} value={form.maxAmount} onChange={e => set("maxAmount", e.target.value)} placeholder="Leave empty for no cap" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Min Profit (%)</label><input type="number" step="0.01" className={inputCls + " mt-1"} value={form.minProfit} onChange={e => set("minProfit", e.target.value)} /></div>
            <div><label className={labelCls}>Max Profit (%)</label><input type="number" step="0.01" className={inputCls + " mt-1"} value={form.maxProfit} onChange={e => set("maxProfit", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Min Duration (days)</label><input type="number" min={1} className={inputCls + " mt-1"} value={form.minDurationDays} onChange={e => set("minDurationDays", e.target.value)} placeholder="e.g. 30" /></div>
            <div><label className={labelCls}>Max Duration (days)</label><input type="number" min={1} className={inputCls + " mt-1"} value={form.maxDurationDays} onChange={e => set("maxDurationDays", e.target.value)} placeholder="e.g. 50" /></div>
          </div>
          <p className="text-[11px] text-slate-500">Advertised plan horizon shown on the user-facing plan cards.</p>

          {/* Advanced (cycle cadence in seconds) */}
          <button
            type="button"
            onClick={() => setShowAdvanced(v => !v)}
            className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 underline-offset-2 hover:underline self-start"
          >
            {showAdvanced ? "Hide advanced" : "Advanced — profit cycle cadence"}
          </button>
          {showAdvanced && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Min Interval (s)</label><input type="number" className={inputCls + " mt-1"} value={form.profitInterval} onChange={e => set("profitInterval", e.target.value)} /></div>
                <div><label className={labelCls}>Max Interval (s)</label><input type="number" className={inputCls + " mt-1"} value={form.maxInterval} onChange={e => set("maxInterval", e.target.value)} /></div>
              </div>
              <p className="text-[11px] text-slate-500">Profit credits fire at a random time between Min and Max interval. Leave at 60s unless you know what you&apos;re doing.</p>
            </>
          )}

          {/* Most Popular toggle */}
          <label className="flex items-center gap-2 cursor-pointer mt-2">
            <input
              type="checkbox"
              checked={form.isPopular}
              onChange={(e) => set("isPopular", e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-white/5 text-sky-500 focus:ring-sky-500 focus:ring-offset-0"
            />
            <span className="text-xs text-slate-300">
              Mark as <strong className="text-sky-400">Most Popular</strong>{" "}
              <span className="text-slate-500">(only one plan can hold this badge)</span>
            </span>
          </label>
        </div>
        <div className="flex gap-2 mt-6">
          <Button variant="outline" className="flex-1 border-white/10 text-slate-300 hover:text-white" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-sky-500 hover:bg-sky-400 text-white font-semibold" onClick={submit} disabled={loading}>
            {loading ? <Loader2 size={14} className="animate-spin mr-1" /> : null}{plan ? "Save" : "Create"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Investment Modal (assign / edit user investment) ──────────────────────────
function InvestmentModal({ users, investment, isEdit, onClose, onSuccess }: {
  users: UserOption[]; investment?: UserInvestment; isEdit: boolean;
  onClose: () => void; onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    userId: investment?.userId ?? "", planName: investment?.planName ?? "Growth Plan",
    amount: String(investment?.amount ?? ""),
    minProfit: String(investment?.minProfit ?? 0.5), maxProfit: String(investment?.maxProfit ?? 1.5),
    profitInterval: String(investment?.profitInterval ?? 60),
    maxInterval: String(investment?.maxInterval ?? 60),
  });
  const [loading, setLoading] = useState(false);
  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function submit() {
    if (!isEdit && !form.userId) { toast.error("Select a user"); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error("Enter a valid amount"); return; }
    setLoading(true);
    if (isEdit && investment) {
      const r = await adminEditInvestment(investment.userId, {
        planName: form.planName, amount: parseFloat(form.amount),
        minProfit: parseFloat(form.minProfit), maxProfit: parseFloat(form.maxProfit),
        profitInterval: parseInt(form.profitInterval), maxInterval: parseInt(form.maxInterval),
      });
      setLoading(false);
      if (r.error) { toast.error(r.error); return; }
      toast.success("Investment updated!");
    } else {
      const r = await adminAssignInvestment({
        userId: form.userId, planName: form.planName, amount: parseFloat(form.amount),
        minProfit: parseFloat(form.minProfit), maxProfit: parseFloat(form.maxProfit),
        profitInterval: parseInt(form.profitInterval), maxInterval: parseInt(form.maxInterval),
      });
      setLoading(false);
      if (r.error) { toast.error(r.error); return; }
      toast.success("Investment assigned!");
    }
    onSuccess(); onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-card border border-sky-500/20 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold text-white mb-5">{isEdit ? "Edit Investment" : "Assign Investment"}</h3>
        <div className="space-y-4">
          {!isEdit && (
            <div><label className={labelCls}>User</label>
              <div className="relative mt-1">
                <select value={form.userId} onChange={e => set("userId", e.target.value)} className={inputCls + " appearance-none pr-8"}>
                  <option value="" className="bg-[#0d1e3a]">Select user…</option>
                  {users.map(u => <option key={u.id} value={u.id} className="bg-[#0d1e3a]">{u.name || "—"} ({u.email})</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          )}
          {isEdit && investment && (
            <div><label className={labelCls}>User</label>
              <div className="mt-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm">
                <span className="text-white font-medium">{investment.user.name || "—"}</span>
                <span className="text-slate-500 ml-2">{investment.user.email}</span>
              </div>
            </div>
          )}
          <div><label className={labelCls}>Plan Name</label><input className={inputCls + " mt-1"} value={form.planName} onChange={e => set("planName", e.target.value)} /></div>
          <div><label className={labelCls}>Amount (USD)</label><input type="number" className={inputCls + " mt-1"} value={form.amount} onChange={e => set("amount", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Min Profit (%)</label><input type="number" step="0.01" className={inputCls + " mt-1"} value={form.minProfit} onChange={e => set("minProfit", e.target.value)} /></div>
            <div><label className={labelCls}>Max Profit (%)</label><input type="number" step="0.01" className={inputCls + " mt-1"} value={form.maxProfit} onChange={e => set("maxProfit", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Min Interval (s)</label><input type="number" className={inputCls + " mt-1"} value={form.profitInterval} onChange={e => set("profitInterval", e.target.value)} /></div>
            <div><label className={labelCls}>Max Interval (s)</label><input type="number" className={inputCls + " mt-1"} value={form.maxInterval} onChange={e => set("maxInterval", e.target.value)} /></div>
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <Button variant="outline" className="flex-1 border-white/10 text-slate-300 hover:text-white" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-sky-500 hover:bg-sky-400 text-white font-semibold" onClick={submit} disabled={loading}>
            {loading ? <Loader2 size={14} className="animate-spin mr-1" /> : null}{isEdit ? "Save" : "Assign"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Add Funds Modal ───────────────────────────────────────────────────────────
function AddFundsModal({ investment, onClose, onSuccess }: { investment: UserInvestment; onClose: () => void; onSuccess: () => void }) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit() {
    const val = parseFloat(amount);
    if (!val || val <= 0) { toast.error("Enter a valid amount"); return; }
    setLoading(true);
    const r = await adminAddFundsToInvestment(investment.userId, val);
    setLoading(false);
    if (r.error) { toast.error(r.error); return; }
    toast.success(`${fmt(val)} added`); onSuccess(); onClose();
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-card border border-sky-500/20 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold text-white mb-1">Add Funds</h3>
        <p className="text-xs text-slate-500 mb-4">No wallet deduction — directly adds to investment balance.</p>
        <div className="mb-4 px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/10">
          <div className="text-sm text-white font-medium">{investment.user.name || "—"}</div>
          <div className="text-xs text-slate-500">{investment.user.email} · <span className="text-sky-400">{investment.planName}</span></div>
          <div className="text-xs text-slate-400 mt-0.5">Current: <span className="text-white font-semibold">{fmt(investment.amount)}</span></div>
        </div>
        <div className="mb-5"><label className={labelCls}>Amount (USD)</label>
          <input type="number" className={inputCls + " mt-1"} value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 border-white/10 text-slate-300 hover:text-white" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold" onClick={submit} disabled={loading}>
            {loading ? <Loader2 size={14} className="animate-spin mr-1" /> : <DollarSign size={14} className="mr-1" />}Add Funds
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminInvestmentsPage() {
  const [tab, setTab] = useState<"plans" | "users">("plans");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [investments, setInvestments] = useState<UserInvestment[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [showAssign, setShowAssign] = useState(false);
  const [editInv, setEditInv] = useState<UserInvestment | null>(null);
  const [fundsTarget, setFundsTarget] = useState<UserInvestment | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [plns, invs, usrs] = await Promise.all([
      adminGetInvestmentPlans(), adminGetAllInvestments(), adminGetAllUsers(),
    ]);
    setPlans(plns.map((p: any) => ({
      ...p,
      minAmount:       Number(p.minAmount),
      maxAmount:       p.maxAmount !== null && p.maxAmount !== undefined ? Number(p.maxAmount) : null,
      minProfit:       Number(p.minProfit),
      maxProfit:       Number(p.maxProfit),
      minDurationDays: p.minDurationDays ?? null,
      maxDurationDays: p.maxDurationDays ?? null,
      maxInterval:     p.maxInterval ?? p.profitInterval,
    })));
    setInvestments(invs.map((i: any) => ({
      ...i, amount: Number(i.amount), totalEarned: Number(i.totalEarned),
      minProfit: Number(i.minProfit), maxProfit: Number(i.maxProfit),
      maxInterval: i.maxInterval ?? i.profitInterval,
      startedAt: new Date(i.startedAt).toISOString(),
    })));
    setUsers(usrs);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function togglePlan(plan: Plan) {
    setProcessing(plan.id);
    const r = await adminUpdatePlan(plan.id, { isActive: !plan.isActive });
    if (r.error) toast.error(r.error);
    else { toast.success(plan.isActive ? "Plan deactivated" : "Plan activated"); load(); }
    setProcessing(null);
  }

  async function deletePlan(plan: Plan) {
    if (plan._count.userInvestments > 0) {
      toast.error(`Cannot delete — ${plan._count.userInvestments} user investment(s) still reference this plan.`);
      return;
    }
    if (!confirm(`Delete "${plan.name}" permanently? This cannot be undone.`)) return;
    setProcessing(plan.id);
    const r = await adminDeletePlan(plan.id);
    if (r.error) toast.error(r.error);
    else { toast.success("Plan deleted"); load(); }
    setProcessing(null);
  }

  async function handleToggleInv(userId: string, current: string) {
    setProcessing(userId);
    const newStatus = current === "ACTIVE" ? "PAUSED" : "ACTIVE";
    const r = await adminToggleInvestment(userId, newStatus as "ACTIVE" | "PAUSED");
    if (r.error) toast.error(r.error);
    else { toast.success(`Investment ${newStatus.toLowerCase()}`); load(); }
    setProcessing(null);
  }

  async function handleCancelInv(userId: string) {
    if (!confirm("Cancel this investment?")) return;
    setProcessing(userId);
    const r = await adminCancelInvestment(userId);
    if (r.error) toast.error(r.error);
    else { toast.success("Cancelled"); load(); }
    setProcessing(null);
  }

  const activeInv = investments.filter(i => i.status === "ACTIVE").length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp size={20} className="text-sky-400" /> Investments
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage investment plans and user portfolios</p>
        </div>
        <div className="flex gap-2">
          {tab === "plans" && (
            <Button onClick={() => setShowCreatePlan(true)} className="bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm h-9 px-4">
              <Plus size={14} className="mr-1.5" /> New Plan
            </Button>
          )}
          {tab === "users" && (
            <Button onClick={() => setShowAssign(true)} className="bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm h-9 px-4">
              <Plus size={14} className="mr-1.5" /> Assign Investment
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Plans",         value: plans.length,                                                  color: "text-white" },
          { label: "Active Plans",  value: plans.filter(p => p.isActive).length,                          color: "text-emerald-400" },
          { label: "Active Invs",   value: activeInv,                                                     color: "text-sky-400" },
          { label: "Total Earned",  value: fmt(investments.reduce((s, i) => s + i.totalEarned, 0)),       color: "text-emerald-400" },
        ].map(s => (
          <div key={s.label} className="glass-card rounded-xl p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{s.label}</div>
            <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 border-b border-white/5">
        {(["plans", "users"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors capitalize ${tab === t ? "text-sky-400 border-b-2 border-sky-400" : "text-slate-500 hover:text-white"}`}>
            {t === "plans" ? `Plans (${plans.length})` : `Users (${investments.length})`}
          </button>
        ))}
      </div>

      {/* Plans tab */}
      {tab === "plans" && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <span className="text-sm font-semibold text-white">{plans.length} Plan{plans.length !== 1 ? "s" : ""}</span>
          </div>
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Loading…
            </div>
          ) : plans.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">No plans yet. Create one to get started.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full premium-table">
                <thead>
                  <tr className="border-b border-white/5">
                    {["Plan","Range","Profit Range","Duration","Users","Status","Actions"].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-slate-500 px-4 py-3 uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {plans.map(plan => (
                    <tr key={plan.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="text-sm font-bold text-white">{plan.name}</div>
                          {plan.isPopular && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
                              POPULAR
                            </span>
                          )}
                        </div>
                        {plan.description && <div className="text-xs text-slate-500 mt-0.5 max-w-[180px] truncate">{plan.description}</div>}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-white whitespace-nowrap">
                        {fmt(plan.minAmount)}
                        {plan.maxAmount !== null && <span className="text-slate-500"> – {fmt(plan.maxAmount)}</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-emerald-400 whitespace-nowrap">{plan.minProfit}%–{plan.maxProfit}%</td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                        {plan.minDurationDays !== null && plan.maxDurationDays !== null
                          ? `${plan.minDurationDays}–${plan.maxDurationDays} days`
                          : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-white font-semibold">{plan._count.userInvestments}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${plan.isActive ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" : "bg-slate-500/10 border-slate-500/25 text-slate-400"}`}>
                          {plan.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Button size="sm" onClick={() => setEditPlan(plan)}
                            className="h-7 px-2 text-xs bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20">
                            <Pencil size={11} className="mr-1" />Edit
                          </Button>
                          <Button size="sm" disabled={processing === plan.id} onClick={() => togglePlan(plan)}
                            className={`h-7 px-2 text-xs border ${plan.isActive ? "bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border-yellow-500/20" : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20"}`}>
                            {processing === plan.id ? <Loader2 size={11} className="animate-spin" /> : plan.isActive ? <><ToggleLeft size={11} className="mr-1" />Disable</> : <><ToggleRight size={11} className="mr-1" />Enable</>}
                          </Button>
                          <Button size="sm" disabled={processing === plan.id || plan._count.userInvestments > 0}
                            onClick={() => deletePlan(plan)}
                            title={plan._count.userInvestments > 0 ? `${plan._count.userInvestments} user investment(s) reference this plan` : "Delete plan"}
                            className="h-7 px-2 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed">
                            {processing === plan.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Users tab */}
      {tab === "users" && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <span className="text-sm font-semibold text-white">{investments.length} Investment{investments.length !== 1 ? "s" : ""}</span>
          </div>
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Loading…
            </div>
          ) : investments.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">No investments yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full premium-table">
                <thead>
                  <tr className="border-b border-white/5">
                    {["User","Plan","Amount","Earned","Rate","Interval","Status","Actions"].map(h => (
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
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{inv.profitInterval}s–{inv.maxInterval}s</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[inv.status] || ""}`}>{inv.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {inv.status !== "CANCELLED" && (
                            <Button size="sm" onClick={() => setEditInv(inv)}
                              className="h-7 px-2 text-xs bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20">
                              <Pencil size={11} className="mr-1" />Edit
                            </Button>
                          )}
                          {(inv.status === "ACTIVE" || inv.status === "PAUSED") && (
                            <Button size="sm" onClick={() => setFundsTarget(inv)}
                              className="h-7 px-2 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">
                              <DollarSign size={11} className="mr-1" />Funds
                            </Button>
                          )}
                          {(inv.status === "ACTIVE" || inv.status === "PAUSED") && (
                            <Button size="sm" disabled={processing === inv.userId} onClick={() => handleToggleInv(inv.userId, inv.status)}
                              className={`h-7 px-2 text-xs border ${inv.status === "ACTIVE" ? "bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border-yellow-500/20" : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20"}`}>
                              {processing === inv.userId ? <Loader2 size={11} className="animate-spin" /> : inv.status === "ACTIVE" ? <><PauseCircle size={11} className="mr-1" />Pause</> : <><PlayCircle size={11} className="mr-1" />Resume</>}
                            </Button>
                          )}
                          {(inv.status === "ACTIVE" || inv.status === "PAUSED") && (
                            <Button size="sm" disabled={processing === inv.userId} onClick={() => handleCancelInv(inv.userId)}
                              className="h-7 px-2 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20">
                              <XCircle size={11} className="mr-1" />Cancel
                            </Button>
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
      )}

      {showCreatePlan && <PlanModal onClose={() => setShowCreatePlan(false)} onSuccess={load} />}
      {editPlan && <PlanModal plan={editPlan} onClose={() => setEditPlan(null)} onSuccess={load} />}
      {showAssign && <InvestmentModal users={users} isEdit={false} onClose={() => setShowAssign(false)} onSuccess={load} />}
      {editInv && <InvestmentModal users={users} investment={editInv} isEdit={true} onClose={() => setEditInv(null)} onSuccess={load} />}
      {fundsTarget && <AddFundsModal investment={fundsTarget} onClose={() => setFundsTarget(null)} onSuccess={load} />}
    </div>
  );
}
