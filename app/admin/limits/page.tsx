"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Loader2, SlidersHorizontal, Save, ArrowDownToLine, ArrowUpFromLine,
} from "lucide-react";
import {
  adminGetFinancialLimits,
  adminUpdateFinancialLimits,
} from "@/lib/actions/admin";

/* ─── Styling shared with other admin forms ──────────────────────────── */

const inputCls =
  "w-full bg-white/[0.06] border border-white/[0.15] rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-sky-500/60";
const labelCls = "text-xs font-medium text-slate-400 uppercase tracking-wider";

/* ─── Form state ─────────────────────────────────────────────────────── */

interface FormState {
  minDeposit:           string;
  maxDeposit:           string;
  minWithdrawal:        string;
  maxWithdrawal:        string;
  withdrawalFeePercent: string;
  withdrawalFeeFixed:   string;
  processingTimeText:   string;
}

const EMPTY: FormState = {
  minDeposit:           "",
  maxDeposit:           "",
  minWithdrawal:        "",
  maxWithdrawal:        "",
  withdrawalFeePercent: "",
  withdrawalFeeFixed:   "",
  processingTimeText:   "",
};

export default function AdminLimitsPage() {
  const [form, setForm]       = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  async function load() {
    setLoading(true);
    const r = await adminGetFinancialLimits();
    if ("error" in r && r.error) {
      toast.error(r.error);
    } else if ("limits" in r && r.limits) {
      setForm({
        minDeposit:           String(r.limits.minDeposit    ?? ""),
        maxDeposit:           r.limits.maxDeposit != null ? String(r.limits.maxDeposit) : "",
        minWithdrawal:        String(r.limits.minWithdrawal ?? ""),
        maxWithdrawal:        r.limits.maxWithdrawal != null ? String(r.limits.maxWithdrawal) : "",
        withdrawalFeePercent: String(r.limits.withdrawalFeePercent ?? 0),
        withdrawalFeeFixed:   String(r.limits.withdrawalFeeFixed   ?? 0),
        processingTimeText:   r.limits.processingTimeText ?? "",
      });
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function parseOptional(s: string): number | null {
    const t = s.trim();
    if (t === "") return null;
    const n = parseFloat(t);
    return isFinite(n) ? n : null;
  }

  async function save() {
    const minDeposit    = parseOptional(form.minDeposit);
    const maxDeposit    = parseOptional(form.maxDeposit);
    const minWithdrawal = parseOptional(form.minWithdrawal);
    const maxWithdrawal = parseOptional(form.maxWithdrawal);
    const feePercent    = parseOptional(form.withdrawalFeePercent) ?? 0;
    const feeFixed      = parseOptional(form.withdrawalFeeFixed)   ?? 0;

    if (minDeposit    === null || minDeposit    < 0) { toast.error("Enter a valid minimum deposit");    return; }
    if (minWithdrawal === null || minWithdrawal < 0) { toast.error("Enter a valid minimum withdrawal"); return; }

    setSaving(true);
    const r = await adminUpdateFinancialLimits({
      minDeposit,
      maxDeposit,                                // null means "no cap"
      minWithdrawal,
      maxWithdrawal,
      withdrawalFeePercent: feePercent,
      withdrawalFeeFixed:   feeFixed,
      processingTimeText:   form.processingTimeText || undefined,
    });
    setSaving(false);

    if ("error" in r && r.error) {
      toast.error(r.error);
    } else {
      toast.success("Limits updated");
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <SlidersHorizontal size={18} className="text-sky-400" />
          Deposit &amp; Withdrawal Limits
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Set the minimum / maximum amounts (USD) and withdrawal fees for all users.
        </p>
      </div>

      {loading ? (
        <div className="glass-card rounded-xl p-12 text-center text-slate-500 text-sm">
          <Loader2 size={16} className="inline animate-spin mr-2" />
          Loading current limits…
        </div>
      ) : (
        <div className="space-y-4">

          {/* Deposit card */}
          <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
                <ArrowDownToLine size={14} className="text-emerald-400" />
              </div>
              <div>
                <h2 className="text-[14px] font-bold text-white">Deposit Limits</h2>
                <p className="text-[11.5px] text-slate-500">
                  Applied to every cryptocurrency deposit unless a wallet overrides the minimum.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Min Deposit (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  className={inputCls + " mt-1"}
                  value={form.minDeposit}
                  onChange={(e) => set("minDeposit", e.target.value)}
                  placeholder="10"
                />
              </div>
              <div>
                <label className={labelCls}>
                  Max Deposit (USD) <span className="text-slate-600">— optional</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  className={inputCls + " mt-1"}
                  value={form.maxDeposit}
                  onChange={(e) => set("maxDeposit", e.target.value)}
                  placeholder="Leave empty for no cap"
                />
              </div>
            </div>
          </div>

          {/* Withdrawal card */}
          <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-sky-500/10 border border-sky-500/25 flex items-center justify-center">
                <ArrowUpFromLine size={14} className="text-sky-400" />
              </div>
              <div>
                <h2 className="text-[14px] font-bold text-white">Withdrawal Limits</h2>
                <p className="text-[11.5px] text-slate-500">
                  Users can&apos;t submit a withdrawal below the minimum or above the maximum.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Min Withdrawal (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  className={inputCls + " mt-1"}
                  value={form.minWithdrawal}
                  onChange={(e) => set("minWithdrawal", e.target.value)}
                  placeholder="10"
                />
              </div>
              <div>
                <label className={labelCls}>
                  Max Withdrawal (USD) <span className="text-slate-600">— optional</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  className={inputCls + " mt-1"}
                  value={form.maxWithdrawal}
                  onChange={(e) => set("maxWithdrawal", e.target.value)}
                  placeholder="Leave empty for no cap"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Fee Percent (%)</label>
                <input
                  type="number"
                  step="0.01"
                  className={inputCls + " mt-1"}
                  value={form.withdrawalFeePercent}
                  onChange={(e) => set("withdrawalFeePercent", e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <label className={labelCls}>Flat Fee (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  className={inputCls + " mt-1"}
                  value={form.withdrawalFeeFixed}
                  onChange={(e) => set("withdrawalFeeFixed", e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Processing Time</label>
              <input
                type="text"
                className={inputCls + " mt-1"}
                value={form.processingTimeText}
                onChange={(e) => set("processingTimeText", e.target.value)}
                placeholder="e.g. 1–3 business days"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Shown on user-facing pages and emails. Purely informational.
              </p>
            </div>
          </div>

          {/* Save */}
          <div className="flex justify-end">
            <Button
              onClick={save}
              disabled={saving}
              className="bg-sky-500 hover:bg-sky-400 text-white font-semibold h-10 px-5"
            >
              {saving ? (
                <><Loader2 size={14} className="mr-1.5 animate-spin" /> Saving…</>
              ) : (
                <><Save size={14} className="mr-1.5" /> Save Limits</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
