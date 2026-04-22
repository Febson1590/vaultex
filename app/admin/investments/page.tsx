"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Loader2, TrendingUp, Plus, PauseCircle, PlayCircle,
  XCircle, ChevronDown, Pencil, DollarSign, ToggleLeft, ToggleRight,
  Trash2, Info,
} from "lucide-react";
import {
  adminAssignInvestment, adminEditInvestment, adminAddFundsToInvestment,
  adminToggleInvestment, adminCancelInvestment, adminGetAllInvestments,
  adminGetAllUsers, adminGetInvestmentPlans, adminCreatePlan, adminUpdatePlan,
  adminDeletePlan,
} from "@/lib/actions/investment";
import {
  secondsToDisplay, displayToSeconds, type DurationUnit, UNIT_LABELS,
  resolvePlanSecs, planCycleLabel,
} from "@/lib/duration";

interface UserInvestment {
  id: string; userId: string; planId?: string | null; planName: string; amount: number; totalEarned: number;
  minProfit: number; maxProfit: number; profitInterval: number; maxInterval: number;
  minLossRatio: number; maxLossRatio: number; minLoss: number; maxLoss: number;
  status: string; startedAt: string; user: { name: string | null; email: string };
}
interface Plan {
  id: string; name: string; description: string | null;
  minAmount: number; maxAmount: number | null;
  minProfit: number; maxProfit: number;
  minDurationHours: number | null; maxDurationHours: number | null;
  profitInterval: number; maxInterval: number;
  minLossRatio: number; maxLossRatio: number;
  minLoss: number; maxLoss: number;
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

/**
 * Paired numeric + unit selector for duration fields. Canonical storage
 * is always seconds — see lib/duration.ts. This widget is used in BOTH
 * the Plan modal and the User-Investment edit modal so the two forms
 * stay structurally identical (same fields, same labels, same logic).
 */
function DurationField({
  label, value, unit, onValueChange, onUnitChange, placeholder, error,
}: {
  label:         string;
  value:         string;
  unit:          DurationUnit;
  onValueChange: (v: string) => void;
  onUnitChange:  (u: DurationUnit) => void;
  placeholder?:  string;
  error?:        string;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="mt-1 flex gap-2">
        <input
          type="number" min={0} step="0.01"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder={placeholder}
          className={inputCls + " flex-1"}
        />
        <div className="relative shrink-0">
          <select
            value={unit}
            onChange={(e) => onUnitChange(e.target.value as DurationUnit)}
            className={inputCls + " appearance-none pr-8 w-[110px]"}
          >
            <option value="minutes" className="bg-[#0d1e3a]">{UNIT_LABELS.minutes}</option>
            <option value="hours"   className="bg-[#0d1e3a]">{UNIT_LABELS.hours}</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>
      {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
    </div>
  );
}

// ── Plan Modal ────────────────────────────────────────────────────────────────
function PlanModal({ plan, onClose, onSuccess }: { plan?: Plan; onClose: () => void; onSuccess: () => void }) {
  // Duration fields are stored as seconds (profitInterval / maxInterval).
  // resolvePlanSecs folds legacy hour columns into seconds so an old
  // plan opens in the editor with its real values, not an empty form.
  const resolvedSecs  = plan ? resolvePlanSecs(plan) : { minSecs: 0, maxSecs: 0 };
  const minDurDisplay = secondsToDisplay(resolvedSecs.minSecs);
  const maxDurDisplay = secondsToDisplay(resolvedSecs.maxSecs);

  const [form, setForm] = useState({
    name:             plan?.name ?? "",
    description:      plan?.description ?? "",
    minAmount:        String(plan?.minAmount ?? 100),
    maxAmount:        plan?.maxAmount !== null && plan?.maxAmount !== undefined ? String(plan.maxAmount) : "",
    minProfit:        String(plan?.minProfit ?? 0.5),
    maxProfit:        String(plan?.maxProfit ?? 1.5),
    minDurationValue: plan ? String(minDurDisplay.value) : "",
    minDurationUnit:  plan ? minDurDisplay.unit : ("hours" as DurationUnit),
    maxDurationValue: plan ? String(maxDurDisplay.value) : "",
    maxDurationUnit:  plan ? maxDurDisplay.unit : ("hours" as DurationUnit),
    minLossRatio:     String(plan?.minLossRatio ?? 0),
    maxLossRatio:     String(plan?.maxLossRatio ?? 0),
    minLoss:          String(plan?.minLoss ?? 0),
    maxLoss:          String(plan?.maxLoss ?? 0),
    isPopular:        plan?.isPopular ?? false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => { const { [k as string]: _drop, ...rest } = e; return rest; });
  }

  function validate(): { ok: boolean; errs: Record<string, string> } {
    const errs: Record<string, string> = {};
    const nonNeg = (s: string) => parseFloat(s) >= 0;
    const pct01_100 = (s: string) => {
      const n = parseFloat(s);
      return !Number.isNaN(n) && n >= 0 && n <= 100;
    };

    if (!form.name.trim()) errs.name = "Plan name is required";

    if (!nonNeg(form.minAmount)) errs.minAmount = "Must be 0 or more";
    if (form.maxAmount.trim() && !nonNeg(form.maxAmount)) errs.maxAmount = "Must be 0 or more";
    if (form.maxAmount.trim() && parseFloat(form.maxAmount) < parseFloat(form.minAmount))
      errs.maxAmount = "Max must be ≥ min amount";

    if (!nonNeg(form.minProfit)) errs.minProfit = "Must be 0 or more";
    if (!nonNeg(form.maxProfit)) errs.maxProfit = "Must be 0 or more";
    if (parseFloat(form.maxProfit) < parseFloat(form.minProfit))
      errs.maxProfit = "Max must be ≥ min profit";

    // Duration is REQUIRED — it drives the tick scheduler.
    const minSecs = displayToSeconds(parseFloat(form.minDurationValue), form.minDurationUnit);
    const maxSecs = displayToSeconds(parseFloat(form.maxDurationValue), form.maxDurationUnit);
    if (!form.minDurationValue.trim() || minSecs <= 0) errs.minDurationValue = "Enter a positive value";
    if (!form.maxDurationValue.trim() || maxSecs <= 0) errs.maxDurationValue = "Enter a positive value";
    if (!errs.minDurationValue && !errs.maxDurationValue && maxSecs < minSecs)
      errs.maxDurationValue = "Max must be ≥ min duration";

    if (!pct01_100(form.minLossRatio)) errs.minLossRatio = "Must be between 0 and 100";
    if (!pct01_100(form.maxLossRatio)) errs.maxLossRatio = "Must be between 0 and 100";
    if (!errs.minLossRatio && !errs.maxLossRatio &&
        parseFloat(form.maxLossRatio) < parseFloat(form.minLossRatio))
      errs.maxLossRatio = "Max must be ≥ min loss ratio";

    if (!nonNeg(form.minLoss)) errs.minLoss = "Must be 0 or more";
    if (!nonNeg(form.maxLoss)) errs.maxLoss = "Must be 0 or more";
    if (parseFloat(form.maxLoss) < parseFloat(form.minLoss))
      errs.maxLoss = "Max must be ≥ min loss";

    return { ok: Object.keys(errs).length === 0, errs };
  }

  async function submit() {
    const { ok, errs } = validate();
    setErrors(errs);
    if (!ok) { toast.error("Please fix the highlighted fields"); return; }

    const minSecs = displayToSeconds(parseFloat(form.minDurationValue), form.minDurationUnit);
    const maxSecs = displayToSeconds(parseFloat(form.maxDurationValue), form.maxDurationUnit);

    setLoading(true);
    const payload = {
      name:             form.name.trim(),
      description:      form.description || undefined,
      minAmount:        parseFloat(form.minAmount),
      maxAmount:        form.maxAmount.trim() ? parseFloat(form.maxAmount) : null,
      minProfit:        parseFloat(form.minProfit),
      maxProfit:        parseFloat(form.maxProfit),
      // Canonical seconds storage. Legacy hour columns are left null;
      // migration pass in seed.ts copies any prior hour values into
      // profitInterval automatically.
      profitInterval:   minSecs,
      maxInterval:      maxSecs,
      minDurationHours: null,
      maxDurationHours: null,
      minLossRatio:     parseFloat(form.minLossRatio) || 0,
      maxLossRatio:     parseFloat(form.maxLossRatio) || 0,
      minLoss:          parseFloat(form.minLoss)      || 0,
      maxLoss:          parseFloat(form.maxLoss)      || 0,
      isPopular:        form.isPopular,
    };
    const r = plan ? await adminUpdatePlan(plan.id, payload) : await adminCreatePlan(payload);
    setLoading(false);
    if (r.error) { toast.error(r.error); return; }
    toast.success(plan ? "Plan updated!" : "Plan created!");
    onSuccess(); onClose();
  }

  /** Inline field error renderer. */
  const err = (key: string) =>
    errors[key] ? (
      <p className="text-[11px] text-red-400 mt-1">{errors[key]}</p>
    ) : null;

  // Mobile-scroll-safe shell:
  //   - outer: fixed full-screen, scrolls vertically (`overflow-y-auto`),
  //            aligns top on mobile, centers on sm+ ⇒ tall forms reachable.
  //   - inner: uses `my-4 sm:my-auto` for breathing room while scrolling.
  return (
    <div
      className="fixed inset-0 z-50 flex justify-center items-start sm:items-center bg-black/70 backdrop-blur-sm overflow-y-auto p-4"
      onClick={onClose}
    >
      <div
        className="glass-card border border-sky-500/20 rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-2xl my-4 sm:my-auto"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-white mb-5">
          {plan ? "Edit Plan" : "Create Investment Plan"}
        </h3>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Plan Name</label>
            <input className={inputCls + " mt-1"} value={form.name}
              onChange={e => set("name", e.target.value)} placeholder="e.g. Growth Plan" />
            {err("name")}
          </div>
          <div>
            <label className={labelCls}>Description (optional)</label>
            <input className={inputCls + " mt-1"} value={form.description}
              onChange={e => set("description", e.target.value)} placeholder="Short description…" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Min Amount (USD)</label>
              <input type="number" min={0} className={inputCls + " mt-1"}
                value={form.minAmount} onChange={e => set("minAmount", e.target.value)} />
              {err("minAmount")}
            </div>
            <div>
              <label className={labelCls}>Max Amount (USD) <span className="text-slate-600">— optional</span></label>
              <input type="number" min={0} className={inputCls + " mt-1"}
                value={form.maxAmount} onChange={e => set("maxAmount", e.target.value)}
                placeholder="Leave empty for no cap" />
              {err("maxAmount")}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Min Profit (%)</label>
              <input type="number" step="0.01" min={0} className={inputCls + " mt-1"}
                value={form.minProfit} onChange={e => set("minProfit", e.target.value)} />
              {err("minProfit")}
            </div>
            <div>
              <label className={labelCls}>Max Profit (%)</label>
              <input type="number" step="0.01" min={0} className={inputCls + " mt-1"}
                value={form.maxProfit} onChange={e => set("maxProfit", e.target.value)} />
              {err("maxProfit")}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <DurationField
              label="Min Duration"
              value={form.minDurationValue}
              unit={form.minDurationUnit}
              onValueChange={(v) => set("minDurationValue", v)}
              onUnitChange={(u) => set("minDurationUnit", u)}
              placeholder="e.g. 5"
              error={errors.minDurationValue}
            />
            <DurationField
              label="Max Duration"
              value={form.maxDurationValue}
              unit={form.maxDurationUnit}
              onValueChange={(v) => set("maxDurationValue", v)}
              onUnitChange={(u) => set("maxDurationUnit", u)}
              placeholder="e.g. 15"
              error={errors.maxDurationValue}
            />
          </div>
          <p className="text-[11px] text-slate-500 -mt-2 inline-flex items-center gap-1.5">
            <Info size={11} className="text-sky-500/70" />
            Each tick fires after a random wait between min and max duration. Stored internally as seconds.
          </p>

          {/* Loss simulation — fewer losses, more profits */}
          <div className="pt-4 mt-1 border-t border-white/[0.06]">
            <div className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider mb-2">
              Loss simulation
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Min Loss Ratio (%)</label>
                <input type="number" step="0.01" min={0} max={100} className={inputCls + " mt-1"}
                  value={form.minLossRatio} onChange={e => set("minLossRatio", e.target.value)}
                  placeholder="e.g. 8" />
                {err("minLossRatio")}
              </div>
              <div>
                <label className={labelCls}>Max Loss Ratio (%)</label>
                <input type="number" step="0.01" min={0} max={100} className={inputCls + " mt-1"}
                  value={form.maxLossRatio} onChange={e => set("maxLossRatio", e.target.value)}
                  placeholder="e.g. 12" />
                {err("maxLossRatio")}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className={labelCls}>Min Loss (%)</label>
                <input type="number" step="0.01" min={0} className={inputCls + " mt-1"}
                  value={form.minLoss} onChange={e => set("minLoss", e.target.value)}
                  placeholder="e.g. 0.10" />
                {err("minLoss")}
              </div>
              <div>
                <label className={labelCls}>Max Loss (%)</label>
                <input type="number" step="0.01" min={0} className={inputCls + " mt-1"}
                  value={form.maxLoss} onChange={e => set("maxLoss", e.target.value)}
                  placeholder="e.g. 0.30" />
                {err("maxLoss")}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
              Each tick the engine picks a random loss-ratio in [<span className="text-amber-400 font-semibold">Min</span>,{" "}
              <span className="text-amber-400 font-semibold">Max</span>]% and rolls it as the probability of a loss.
              Keep Max below 50 so profits outnumber losses. Loss magnitude is a random % between Min Loss and Max Loss,
              applied to the invested amount. Back-to-back losses are capped at 2 in a row.
            </p>
          </div>

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
            {loading ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
            {plan ? "Save" : "Create"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Investment Modal (assign / edit user investment) ──────────────────────────
// Structurally identical to PlanModal: same fields, same labels, same
// DurationField + Loss-simulation block. An extra plan picker at the
// top lets the admin prefill from any existing plan and then override
// individual values per user. All values submitted to the server are in
// the canonical unit (seconds for duration, percent for everything else).
function InvestmentModal({ users, plans, investment, isEdit, onClose, onSuccess }: {
  users: UserOption[]; plans: Plan[]; investment?: UserInvestment; isEdit: boolean;
  onClose: () => void; onSuccess: () => void;
}) {
  // Same resolver the plan modal + admin list use — keeps every
  // surface perfectly aligned for a given row.
  const resolvedInvSecs = investment ? resolvePlanSecs(investment as any) : { minSecs: 0, maxSecs: 0 };
  const initMinDur      = secondsToDisplay(resolvedInvSecs.minSecs);
  const initMaxDur      = secondsToDisplay(resolvedInvSecs.maxSecs);

  const [form, setForm] = useState({
    userId:           investment?.userId ?? "",
    planId:           investment?.planId ?? "",
    planName:         investment?.planName ?? "",
    amount:           investment ? String(investment.amount) : "",
    minProfit:        String(investment?.minProfit ?? 0.5),
    maxProfit:        String(investment?.maxProfit ?? 1.5),
    minDurationValue: investment ? String(initMinDur.value) : "",
    minDurationUnit:  investment ? initMinDur.unit : ("hours" as DurationUnit),
    maxDurationValue: investment ? String(initMaxDur.value) : "",
    maxDurationUnit:  investment ? initMaxDur.unit : ("hours" as DurationUnit),
    minLossRatio:     String(investment?.minLossRatio ?? 0),
    maxLossRatio:     String(investment?.maxLossRatio ?? 0),
    minLoss:          String(investment?.minLoss ?? 0),
    maxLoss:          String(investment?.maxLoss ?? 0),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => { const { [k as string]: _drop, ...rest } = e; return rest; });
  }

  /** When the admin picks a plan, pull all of that plan's defaults into
   *  the form so they don't have to retype anything. Admin is free to
   *  override any individual field afterwards. */
  function applyPlan(planId: string) {
    const p = plans.find(pp => pp.id === planId);
    // Resolve seconds through the same helper used by the admin list
    // so legacy hour-only plans still prefill correctly when chosen.
    const pSecs = p ? resolvePlanSecs(p) : { minSecs: 0, maxSecs: 0 };
    const pMin  = secondsToDisplay(pSecs.minSecs);
    const pMax  = secondsToDisplay(pSecs.maxSecs);
    setForm(f => ({
      ...f,
      planId:           planId,
      planName:         p?.name ?? f.planName,
      minProfit:        p ? String(p.minProfit) : f.minProfit,
      maxProfit:        p ? String(p.maxProfit) : f.maxProfit,
      minDurationValue: p ? String(pMin.value) : f.minDurationValue,
      minDurationUnit:  p ? pMin.unit          : f.minDurationUnit,
      maxDurationValue: p ? String(pMax.value) : f.maxDurationValue,
      maxDurationUnit:  p ? pMax.unit          : f.maxDurationUnit,
      minLossRatio:     p ? String(p.minLossRatio) : f.minLossRatio,
      maxLossRatio:     p ? String(p.maxLossRatio) : f.maxLossRatio,
      minLoss:          p ? String(p.minLoss)      : f.minLoss,
      maxLoss:          p ? String(p.maxLoss)      : f.maxLoss,
      amount:           (!isEdit && p && !f.amount) ? String(p.minAmount) : f.amount,
    }));
    setErrors({});
  }

  function validate(): { ok: boolean; errs: Record<string, string> } {
    const errs: Record<string, string> = {};
    const nonNeg = (s: string) => parseFloat(s) >= 0;
    const pct01_100 = (s: string) => {
      const n = parseFloat(s);
      return !Number.isNaN(n) && n >= 0 && n <= 100;
    };

    if (!isEdit && !form.userId) errs.userId = "Select a user";
    if (!form.planName.trim())   errs.planName = "Plan name is required";
    if (!form.amount || parseFloat(form.amount) <= 0) errs.amount = "Enter a valid amount";

    if (!nonNeg(form.minProfit)) errs.minProfit = "Must be 0 or more";
    if (!nonNeg(form.maxProfit)) errs.maxProfit = "Must be 0 or more";
    if (parseFloat(form.maxProfit) < parseFloat(form.minProfit))
      errs.maxProfit = "Max must be ≥ min profit";

    const minSecs = displayToSeconds(parseFloat(form.minDurationValue), form.minDurationUnit);
    const maxSecs = displayToSeconds(parseFloat(form.maxDurationValue), form.maxDurationUnit);
    if (!form.minDurationValue.trim() || minSecs <= 0) errs.minDurationValue = "Enter a positive value";
    if (!form.maxDurationValue.trim() || maxSecs <= 0) errs.maxDurationValue = "Enter a positive value";
    if (!errs.minDurationValue && !errs.maxDurationValue && maxSecs < minSecs)
      errs.maxDurationValue = "Max must be ≥ min duration";

    if (!pct01_100(form.minLossRatio)) errs.minLossRatio = "Must be between 0 and 100";
    if (!pct01_100(form.maxLossRatio)) errs.maxLossRatio = "Must be between 0 and 100";
    if (!errs.minLossRatio && !errs.maxLossRatio &&
        parseFloat(form.maxLossRatio) < parseFloat(form.minLossRatio))
      errs.maxLossRatio = "Max must be ≥ min loss ratio";

    if (!nonNeg(form.minLoss)) errs.minLoss = "Must be 0 or more";
    if (!nonNeg(form.maxLoss)) errs.maxLoss = "Must be 0 or more";
    if (parseFloat(form.maxLoss) < parseFloat(form.minLoss))
      errs.maxLoss = "Max must be ≥ min loss";

    return { ok: Object.keys(errs).length === 0, errs };
  }

  async function submit() {
    const { ok, errs } = validate();
    setErrors(errs);
    if (!ok) { toast.error("Please fix the highlighted fields"); return; }

    const minSecs = displayToSeconds(parseFloat(form.minDurationValue), form.minDurationUnit);
    const maxSecs = displayToSeconds(parseFloat(form.maxDurationValue), form.maxDurationUnit);

    const common = {
      planName:       form.planName.trim(),
      amount:         parseFloat(form.amount),
      minProfit:      parseFloat(form.minProfit),
      maxProfit:      parseFloat(form.maxProfit),
      profitInterval: minSecs,
      maxInterval:    maxSecs,
      minLossRatio:   parseFloat(form.minLossRatio) || 0,
      maxLossRatio:   parseFloat(form.maxLossRatio) || 0,
      minLoss:        parseFloat(form.minLoss)      || 0,
      maxLoss:        parseFloat(form.maxLoss)      || 0,
    };

    setLoading(true);
    if (isEdit && investment) {
      // Pass the plan link through on edits so the admin table + user
      // dashboard stay accurate after a plan switch. An empty picker
      // value means "custom override — no plan link".
      const r = await adminEditInvestment(investment.userId, {
        ...common,
        planId: form.planId ? form.planId : null,
      });
      setLoading(false);
      if (r.error) { toast.error(r.error); return; }
      toast.success("Investment updated!");
    } else {
      const r = await adminAssignInvestment({
        userId: form.userId,
        planId: form.planId || undefined,
        ...common,
      });
      setLoading(false);
      if (r.error) { toast.error(r.error); return; }
      toast.success("Investment assigned!");
    }
    onSuccess(); onClose();
  }

  const err = (k: string) => errors[k] ? <p className="text-[11px] text-red-400 mt-1">{errors[k]}</p> : null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center items-start sm:items-center overflow-y-auto p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-card border border-sky-500/20 rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-2xl my-4 sm:my-auto"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-white mb-1">
          {isEdit ? "Edit User Investment" : "Assign Investment"}
        </h3>
        <p className="text-[11.5px] text-slate-500 mb-5">
          {isEdit
            ? "These are the live settings for this user's investment. Pick a plan to reset, or override values directly."
            : "Pick a plan to auto-fill defaults, then tweak any value before assigning."}
        </p>

        <div className="space-y-4">
          {!isEdit && (
            <div>
              <label className={labelCls}>User</label>
              <div className="relative mt-1">
                <select
                  value={form.userId}
                  onChange={e => set("userId", e.target.value)}
                  className={inputCls + " appearance-none pr-8"}
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
              {err("userId")}
            </div>
          )}
          {isEdit && investment && (
            <div>
              <label className={labelCls}>User</label>
              <div className="mt-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm">
                <span className="text-white font-medium">{investment.user.name || "—"}</span>
                <span className="text-slate-500 ml-2">{investment.user.email}</span>
              </div>
            </div>
          )}

          {/* Plan picker — prefills every field below */}
          <div>
            <label className={labelCls}>Plan {isEdit && <span className="text-slate-600">— reset defaults</span>}</label>
            <div className="relative mt-1">
              <select
                value={form.planId}
                onChange={(e) => applyPlan(e.target.value)}
                className={inputCls + " appearance-none pr-8"}
              >
                <option value="" className="bg-[#0d1e3a]">
                  {isEdit ? "Custom (keep current values)" : "Custom — fill fields manually"}
                </option>
                {plans.filter(p => p.isActive).map(p => (
                  <option key={p.id} value={p.id} className="bg-[#0d1e3a]">{p.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            <p className="text-[10.5px] text-slate-500 mt-1">
              Picking a plan copies its profit, duration and loss settings below — you can still override any value.
            </p>
          </div>

          <div>
            <label className={labelCls}>Plan Name</label>
            <input className={inputCls + " mt-1"} value={form.planName} onChange={e => set("planName", e.target.value)} placeholder="e.g. Growth Plan" />
            {err("planName")}
          </div>

          <div>
            <label className={labelCls}>Amount (USD)</label>
            <input type="number" min={0} className={inputCls + " mt-1"} value={form.amount} onChange={e => set("amount", e.target.value)} />
            {err("amount")}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Min Profit (%)</label>
              <input type="number" step="0.01" min={0} className={inputCls + " mt-1"} value={form.minProfit} onChange={e => set("minProfit", e.target.value)} />
              {err("minProfit")}
            </div>
            <div>
              <label className={labelCls}>Max Profit (%)</label>
              <input type="number" step="0.01" min={0} className={inputCls + " mt-1"} value={form.maxProfit} onChange={e => set("maxProfit", e.target.value)} />
              {err("maxProfit")}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <DurationField
              label="Min Duration"
              value={form.minDurationValue}
              unit={form.minDurationUnit}
              onValueChange={(v) => set("minDurationValue", v)}
              onUnitChange={(u) => set("minDurationUnit", u)}
              placeholder="e.g. 5"
              error={errors.minDurationValue}
            />
            <DurationField
              label="Max Duration"
              value={form.maxDurationValue}
              unit={form.maxDurationUnit}
              onValueChange={(v) => set("maxDurationValue", v)}
              onUnitChange={(u) => set("maxDurationUnit", u)}
              placeholder="e.g. 15"
              error={errors.maxDurationValue}
            />
          </div>
          <p className="text-[11px] text-slate-500 -mt-2 inline-flex items-center gap-1.5">
            <Info size={11} className="text-sky-500/70" />
            Stored internally as seconds. Engine calculations are unchanged.
          </p>

          {/* Loss simulation — same layout as PlanModal */}
          <div className="pt-4 mt-1 border-t border-white/[0.06]">
            <div className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider mb-2">
              Loss simulation
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Min Loss Ratio (%)</label>
                <input type="number" step="0.01" min={0} max={100} className={inputCls + " mt-1"} value={form.minLossRatio} onChange={e => set("minLossRatio", e.target.value)} />
                {err("minLossRatio")}
              </div>
              <div>
                <label className={labelCls}>Max Loss Ratio (%)</label>
                <input type="number" step="0.01" min={0} max={100} className={inputCls + " mt-1"} value={form.maxLossRatio} onChange={e => set("maxLossRatio", e.target.value)} />
                {err("maxLossRatio")}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className={labelCls}>Min Loss (%)</label>
                <input type="number" step="0.01" min={0} className={inputCls + " mt-1"} value={form.minLoss} onChange={e => set("minLoss", e.target.value)} />
                {err("minLoss")}
              </div>
              <div>
                <label className={labelCls}>Max Loss (%)</label>
                <input type="number" step="0.01" min={0} className={inputCls + " mt-1"} value={form.maxLoss} onChange={e => set("maxLoss", e.target.value)} />
                {err("maxLoss")}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <Button variant="outline" className="flex-1 border-white/10 text-slate-300 hover:text-white" onClick={onClose} disabled={loading}>Cancel</Button>
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
    <div className="fixed inset-0 z-50 flex justify-center items-start sm:items-center overflow-y-auto p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
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
      minAmount:        Number(p.minAmount),
      maxAmount:        p.maxAmount !== null && p.maxAmount !== undefined ? Number(p.maxAmount) : null,
      minProfit:        Number(p.minProfit),
      maxProfit:        Number(p.maxProfit),
      minDurationHours: p.minDurationHours ?? null,
      maxDurationHours: p.maxDurationHours ?? null,
      minLossRatio:     Number(p.minLossRatio ?? 0),
      maxLossRatio:     Number(p.maxLossRatio ?? 0),
      minLoss:          Number(p.minLoss ?? 0),
      maxLoss:          Number(p.maxLoss ?? 0),
      maxInterval:      p.maxInterval ?? p.profitInterval,
    })));
    setInvestments(invs.map((i: any) => ({
      ...i,
      amount:       Number(i.amount),
      totalEarned:  Number(i.totalEarned),
      minProfit:    Number(i.minProfit),
      maxProfit:    Number(i.maxProfit),
      minLossRatio: Number(i.minLossRatio ?? 0),
      maxLossRatio: Number(i.maxLossRatio ?? 0),
      minLoss:      Number(i.minLoss ?? 0),
      maxLoss:      Number(i.maxLoss ?? 0),
      maxInterval:  i.maxInterval ?? i.profitInterval,
      planId:       i.planId ?? null,
      startedAt:    new Date(i.startedAt).toISOString(),
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
    const inUse = plan._count.userInvestments;
    const warning = inUse > 0
      ? `Delete "${plan.name}"?\n\nThis plan is still referenced by ${inUse} user investment${inUse === 1 ? "" : "s"}. Those investments will be kept (with their name, amount and earnings preserved) but will no longer be linked to a plan definition. This cannot be undone.`
      : `Delete "${plan.name}" permanently? This cannot be undone.`;
    if (!confirm(warning)) return;
    setProcessing(plan.id);
    const r = await adminDeletePlan(plan.id);
    if (r.error) toast.error(r.error);
    else {
      const d = (r as { detached?: number }).detached ?? 0;
      toast.success(d > 0 ? `Plan deleted — ${d} user investment${d === 1 ? "" : "s"} detached` : "Plan deleted");
      load();
    }
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
                        {planCycleLabel(plan)}
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
                          <Button size="sm" disabled={processing === plan.id}
                            onClick={() => deletePlan(plan)}
                            title={plan._count.userInvestments > 0
                              ? `Delete — ${plan._count.userInvestments} user investment(s) will be detached`
                              : "Delete plan"}
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
      {showAssign && <InvestmentModal users={users} plans={plans} isEdit={false} onClose={() => setShowAssign(false)} onSuccess={load} />}
      {editInv && <InvestmentModal users={users} plans={plans} investment={editInv} isEdit={true} onClose={() => setEditInv(null)} onSuccess={load} />}
      {fundsTarget && <AddFundsModal investment={fundsTarget} onClose={() => setFundsTarget(null)} onSuccess={load} />}
    </div>
  );
}
