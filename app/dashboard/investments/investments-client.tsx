"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Loader2, ArrowDownToLine,
  AlertTriangle, CheckCircle2, Sparkles, Calendar,
} from "lucide-react";
import { userStartInvestment } from "@/lib/actions/investment";
import { formatCurrency } from "@/lib/utils";
import { KycBanner } from "@/components/dashboard/kyc-banner";
import type { KycStatus } from "@/lib/kyc";

/* ─── Types ────────────────────────────────────────────────────────── */

interface Plan {
  id:              string;
  name:            string;
  description:     string | null;
  minAmount:       number;
  maxAmount:       number | null;
  minProfit:       number;
  maxProfit:       number;
  minDurationHours: number | null;
  maxDurationHours: number | null;
  profitInterval:  number;
  maxInterval:     number;
  isActive:        boolean;
  isPopular:       boolean;
}

interface Props {
  plans:       Plan[];
  usdBalance:  number;
  kycStatus:   KycStatus;
}

/* ─── Helpers ──────────────────────────────────────────────────────── */

function fmtPct(n: number) {
  return Number.isInteger(n) ? `${n}.0%` : `${n}%`;
}

function fmtDuration(min: number | null, max: number | null) {
  if (min === null || max === null) return null;
  if (min === max) return `${min} Hours`;
  return `${min}-${max} Hours`;
}

/* ══════════════════════════════════════════════════════════════════════
   Investment Plans page
══════════════════════════════════════════════════════════════════════ */

export default function InvestmentsClient({ plans, usdBalance, kycStatus }: Props) {
  const router = useRouter();
  const isRestricted = kycStatus !== "approved";

  const [selectedPlan,  setSelectedPlan]  = useState<Plan | null>(null);

  function handleSelect(plan: Plan) {
    if (isRestricted) {
      toast.error("Complete identity verification to continue.");
      return;
    }
    setSelectedPlan(plan);
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">

      {/* ── Header ───────────────────────────────────────────────── */}
      <div>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft size={14} />
          Back
        </button>
        <h1 className="text-[26px] sm:text-[28px] font-black text-white tracking-tight uppercase">
          Investment Plans
        </h1>
        <p className="text-[13.5px] text-slate-400 mt-2 leading-relaxed max-w-lg">
          Choose an investment plan that fits your goals and risk tolerance.
          Invest any amount within the plan limits and earn profit daily.
        </p>
      </div>

      {/* ── KYC banner ───────────────────────────────────────────── */}
      {isRestricted && <KycBanner kycStatus={kycStatus} />}

      {/* ── Plans list ───────────────────────────────────────────── */}
      {plans.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              disabled={isRestricted}
              onSelect={() => handleSelect(plan)}
            />
          ))}
        </div>
      )}

      {/* ── Invest modal ─────────────────────────────────────────── */}
      {selectedPlan && (
        <InvestModal
          plan={selectedPlan}
          usdBalance={usdBalance}
          onClose={() => setSelectedPlan(null)}
          onSuccess={() => {
            setSelectedPlan(null);
            router.push("/dashboard");
          }}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Plan card — matches the uploaded mockup
   - Diagonal "POPULAR" ribbon on the popular plan (top-left)
   - Plan name + "Starts at $X"
   - Profit range on the right
   - Duration row with calendar icon
   - Invest Now CTA
══════════════════════════════════════════════════════════════════════ */

function PlanCard({
  plan, disabled, onSelect,
}: {
  plan:     Plan;
  disabled: boolean;
  onSelect: () => void;
}) {
  const duration = fmtDuration(plan.minDurationHours, plan.maxDurationHours);

  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-white/[0.07] transition-colors hover:border-white/[0.12]"
      style={{ background: "rgba(10,18,34,0.75)" }}
    >
      {/* Diagonal POPULAR ribbon — top-right. Placed on the right so it
          doesn't block the plan name or "Starts at $X" text on the left. */}
      {plan.isPopular && (
        <span
          aria-label="Most popular plan"
          className="absolute top-0 right-0 overflow-hidden pointer-events-none select-none"
          style={{ width: 96, height: 96 }}
        >
          <span
            className="absolute text-[8.5px] sm:text-[9px] font-black tracking-[0.18em] text-[#0A1226]"
            style={{
              top:          22,
              right:        -32,
              width:        130,
              transform:    "rotate(45deg)",
              transformOrigin: "center",
              textAlign:    "center",
              background:   "linear-gradient(180deg, #f5c24e 0%, #d99a2b 100%)",
              padding:      "4px 0",
              boxShadow:    "0 2px 6px rgba(0,0,0,0.4)",
            }}
          >
            POPULAR
          </span>
        </span>
      )}

      <div
        className={`px-5 py-5 sm:p-6 ${plan.isPopular ? "pt-10 sm:pt-6 sm:pr-[88px]" : ""}`}
      >
        {/* Top row — name / starts-at  +  profit range.
            Stacks vertically on the smallest screens, side-by-side from sm. */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
          <div className="min-w-0">
            <h3 className="text-[19px] sm:text-[22px] font-bold text-white leading-tight truncate">
              {plan.name}
            </h3>
            <div className="text-[12.5px] sm:text-[13px] text-slate-400 mt-1">
              Starts at{" "}
              <span className="text-white font-semibold tabular-nums">
                {formatCurrency(plan.minAmount)}
              </span>
              {plan.maxAmount !== null && (
                <span className="text-slate-500 hidden sm:inline">
                  {" "}· up to {formatCurrency(plan.maxAmount)}
                </span>
              )}
            </div>
          </div>

          <div className="sm:text-right flex-shrink-0">
            <div className="text-[14px] sm:text-[17px] font-bold tabular-nums whitespace-nowrap">
              <span className="text-amber-400">{fmtPct(plan.minProfit)}</span>
              <span className="text-slate-500 mx-1">–</span>
              <span className="text-emerald-400">{fmtPct(plan.maxProfit)}</span>
            </div>
            <div className="text-[9.5px] sm:text-[10px] uppercase tracking-widest text-slate-500 font-semibold mt-0.5">
              Daily Return
            </div>
          </div>
        </div>

        {/* Max amount shown on its own line on mobile */}
        {plan.maxAmount !== null && (
          <div className="sm:hidden text-[11.5px] text-slate-500 mt-1">
            up to {formatCurrency(plan.maxAmount)}
          </div>
        )}

        {/* Optional description */}
        {plan.description && (
          <p className="text-[12.5px] text-slate-500 mt-3 leading-relaxed">
            {plan.description}
          </p>
        )}

        {/* Divider */}
        <div className="my-4 border-t border-white/[0.05]" />

        {/* Bottom row — duration  +  Invest Now.
            Stacks vertically under 420px; otherwise side-by-side. */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 text-[12.5px] sm:text-[13px] text-slate-300 min-w-0">
            <span
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: "rgba(14,165,233,0.10)",
                border:     "1px solid rgba(14,165,233,0.25)",
              }}
            >
              <Calendar size={13} className="text-sky-400" />
            </span>
            <span className="text-slate-400 flex-shrink-0">Daily Profit</span>
            <span className="text-white font-semibold tabular-nums truncate">
              {duration ?? "—"}
            </span>
          </div>

          <Button
            onClick={onSelect}
            disabled={disabled}
            className="h-10 px-5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-[13px] disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
          >
            {disabled ? "Verify first" : "Invest Now"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Empty state
══════════════════════════════════════════════════════════════════════ */

function EmptyState() {
  return (
    <div
      className="rounded-2xl border border-white/[0.06] p-12 text-center"
      style={{ background: "rgba(10,18,34,0.7)" }}
    >
      <div className="w-14 h-14 rounded-2xl bg-sky-500/[0.08] flex items-center justify-center mx-auto mb-4">
        <Sparkles size={22} className="text-sky-400/60" />
      </div>
      <h2 className="text-base font-bold text-white mb-2">No plans available yet</h2>
      <p className="text-[13px] text-slate-500 max-w-sm mx-auto leading-relaxed">
        Investment plans haven&apos;t been configured by the platform admin yet. Please check
        back later or contact support for details.
      </p>
      <Link href="/dashboard/support" className="inline-block mt-5">
        <Button variant="outline" className="border-white/10 text-slate-300 hover:text-white h-10 px-5">
          Contact Support
        </Button>
      </Link>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Invest modal (funding flow)
══════════════════════════════════════════════════════════════════════ */

function InvestModal({
  plan, usdBalance, onClose, onSuccess,
}: {
  plan:        Plan;
  usdBalance:  number;
  onClose:     () => void;
  onSuccess:   () => void;
}) {
  const [amount, setAmount]   = useState(String(plan.minAmount));
  const [isPending, start]    = useTransition();

  const val       = parseFloat(amount) || 0;
  const meetsMin  = val >= plan.minAmount;
  const exceedsMax = plan.maxAmount !== null && val > plan.maxAmount;
  const canAfford = val <= usdBalance;
  const needsDeposit = usdBalance < plan.minAmount;
  const duration = fmtDuration(plan.minDurationHours, plan.maxDurationHours);

  function submit() {
    if (!meetsMin) {
      toast.error(`Minimum is ${formatCurrency(plan.minAmount)}`);
      return;
    }
    if (exceedsMax) {
      toast.error(`Maximum is ${formatCurrency(plan.maxAmount!)}`);
      return;
    }
    if (!canAfford) {
      toast.error("Insufficient USD balance");
      return;
    }
    start(async () => {
      const r = await userStartInvestment({ planId: plan.id, amount: val });
      if ("error" in r) { toast.error(r.error); return; }
      toast.success("Investment activated");
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
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-white/[0.05]">
          <h3 className="text-base font-bold text-white">Invest in {plan.name}</h3>
          <p className="text-[11.5px] text-slate-500 mt-1 leading-relaxed">
            <span className="text-emerald-400 font-semibold tabular-nums">
              {fmtPct(plan.minProfit)} – {fmtPct(plan.maxProfit)}
            </span>{" "}
            daily return
            {duration && (
              <>
                {" "}·{" "}
                <span className="text-white font-medium tabular-nums">{duration}</span>
              </>
            )}
          </p>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08]">
              <div className="text-[9px] uppercase tracking-widest text-slate-500 font-semibold mb-0.5">Balance</div>
              <div className="text-[13px] font-semibold text-white tabular-nums">{formatCurrency(usdBalance)}</div>
            </div>
            <div className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08]">
              <div className="text-[9px] uppercase tracking-widest text-slate-500 font-semibold mb-0.5">Min amount</div>
              <div className="text-[13px] font-semibold text-sky-400 tabular-nums">{formatCurrency(plan.minAmount)}</div>
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
                min={plan.minAmount}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-white/[0.05] border border-white/[0.12] rounded-lg pl-7 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-sky-500/50"
              />
            </div>
            {val > 0 && !meetsMin && (
              <p className="text-[11px] text-yellow-400 mt-1.5">
                Below minimum of {formatCurrency(plan.minAmount)}
              </p>
            )}
            {val > 0 && exceedsMax && (
              <p className="text-[11px] text-yellow-400 mt-1.5">
                Above maximum of {formatCurrency(plan.maxAmount!)}
              </p>
            )}
            {val > 0 && !canAfford && !needsDeposit && (
              <p className="text-[11px] text-red-400 mt-1.5">Insufficient balance</p>
            )}
            {val > 0 && meetsMin && !exceedsMax && canAfford && (
              <p className="text-[11px] text-emerald-400 mt-1.5 inline-flex items-center gap-1">
                <CheckCircle2 size={12} /> Ready to activate
              </p>
            )}
          </div>

          {needsDeposit && (
            <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 bg-yellow-500/[0.05] border border-yellow-500/20">
              <AlertTriangle size={13} className="text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-[11.5px] text-slate-300 leading-relaxed">
                You need at least <span className="font-semibold text-white">{formatCurrency(plan.minAmount)}</span>{" "}
                in your USD wallet to start this plan.{" "}
                <Link href="/dashboard/deposit" className="text-sky-400 hover:text-sky-300 font-semibold">
                  Make a deposit
                </Link>.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
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
              <><Loader2 size={14} className="animate-spin mr-1.5" /> Activating…</>
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
