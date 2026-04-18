"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Sparkles, Loader2, ArrowDownToLine,
  AlertTriangle,
} from "lucide-react";
import { userStartInvestment } from "@/lib/actions/investment";
import { formatCurrency } from "@/lib/utils";
import { KycBanner } from "@/components/dashboard/kyc-banner";
import type { KycStatus } from "@/lib/kyc";

/* ─── Types ────────────────────────────────────────────────────────── */

interface Plan {
  id: string;
  name: string;
  description: string | null;
  minAmount: number;
  maxAmount: number | null;
  minProfit: number;
  maxProfit: number;
  profitInterval: number;
  maxInterval: number;
  isActive: boolean;
  isPopular: boolean;
}

interface Props {
  plans:       Plan[];
  usdBalance:  number;
  kycStatus:   KycStatus;
}

/* ─── Helpers ──────────────────────────────────────────────────────── */

function fmtRange(min: number, max: number | null) {
  if (max === null) return `${formatCurrency(min)}+`;
  return `${formatCurrency(min)} – ${formatCurrency(max)}`;
}

function fmtCycle(min: number, max: number) {
  if (min === max) return `Every ${min}s`;
  return `Every ${min}–${max}s`;
}

/* ══════════════════════════════════════════════════════════════════════
   Investment Plans page
══════════════════════════════════════════════════════════════════════ */

export default function InvestmentsClient({ plans, usdBalance, kycStatus }: Props) {
  const router = useRouter();
  const isRestricted = kycStatus !== "approved";

  const [selectedPlan,  setSelectedPlan]  = useState<Plan | null>(null);
  /** Plan id currently in its brief "highlighted" state after a click. */
  const [activePlanId,  setActivePlanId]  = useState<string | null>(null);

  function handleSelect(plan: Plan) {
    if (isRestricted) {
      toast.error("Complete identity verification to continue.");
      return;
    }
    setActivePlanId(plan.id);
    // Clear the highlight after a short delay regardless of what the modal does
    setTimeout(() => setActivePlanId(null), 450);
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
        <h1 className="text-2xl font-bold text-white">Investment Plans</h1>
        <p className="text-sm text-slate-500 mt-1">
          Choose a plan to start investing.
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
              highlighted={activePlanId === plan.id}
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
            // Navigate back to the dashboard so the user sees their active plan
            router.push("/dashboard");
          }}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Plan card
══════════════════════════════════════════════════════════════════════ */

function PlanCard({
  plan, highlighted, disabled, onSelect,
}: {
  plan:         Plan;
  highlighted:  boolean;
  disabled:     boolean;
  onSelect:     () => void;
}) {
  return (
    <div
      className={`
        relative rounded-2xl overflow-hidden transition-all duration-200
        ${highlighted
          ? "border-sky-400/60 bg-sky-500/[0.05] shadow-lg shadow-sky-500/10"
          : "border-white/[0.06] hover:border-white/[0.12]"
        }
        border
      `}
      style={{ background: highlighted ? undefined : "rgba(10,18,34,0.7)" }}
    >
      {/* ── Popular badge — ribbon in top-right ─────────────────── */}
      {plan.isPopular && (
        <span
          className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30"
        >
          <Sparkles size={10} />
          Most Popular
        </span>
      )}

      <div className="p-5 sm:p-6">

        {/* Plan name + description */}
        <h3 className="text-[18px] font-bold text-white leading-tight">{plan.name}</h3>
        {plan.description && (
          <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">{plan.description}</p>
        )}

        {/* Return rate — the single most prominent number on the card */}
        <div className="mt-4">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1">
            Return rate
          </div>
          <div className="text-[22px] sm:text-[24px] font-bold text-emerald-400 tabular-nums">
            {plan.minProfit}% – {plan.maxProfit}%
            <span className="text-[12px] text-slate-500 font-normal ml-1.5">per cycle</span>
          </div>
        </div>

        {/* Meta grid — min/max + cycle */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <MetaBlock label="Investment range" value={fmtRange(plan.minAmount, plan.maxAmount)} />
          <MetaBlock label="Cycle speed" value={fmtCycle(plan.profitInterval, plan.maxInterval)} />
        </div>

        {/* CTA — full-width on mobile */}
        <Button
          onClick={onSelect}
          disabled={disabled}
          className="w-full mt-5 h-11 bg-sky-500 hover:bg-sky-400 text-white font-semibold text-[13px] disabled:opacity-50"
        >
          {disabled ? "Verification Required" : "Select Plan"}
        </Button>
      </div>
    </div>
  );
}

/* ── Small meta-field block used inside plan cards ─────────────────── */

function MetaBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.02] border border-white/[0.05] px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-0.5">
        {label}
      </div>
      <div className="text-[13px] font-semibold text-slate-200 tabular-nums">
        {value}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Empty state
══════════════════════════════════════════════════════════════════════ */

function EmptyState() {
  return (
    <div className="rounded-2xl border border-white/[0.06] p-12 text-center"
      style={{ background: "rgba(10,18,34,0.7)" }}>
      <div className="w-14 h-14 rounded-2xl bg-sky-500/[0.08] flex items-center justify-center mx-auto mb-4">
        <Sparkles size={22} className="text-sky-400/60" />
      </div>
      <h2 className="text-base font-bold text-white mb-2">No plans available yet</h2>
      <p className="text-[13px] text-slate-500 max-w-sm mx-auto leading-relaxed">
        Investment plans haven&apos;t been configured by the platform admin yet. Please check back later
        or contact support for details.
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
          <p className="text-[11px] text-slate-500 mt-0.5">
            {plan.minProfit}% – {plan.maxProfit}% per cycle · {fmtCycle(plan.profitInterval, plan.maxInterval)}
          </p>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">

          {/* Balance + min */}
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

          {/* Amount input */}
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
          </div>

          {/* Deposit nudge when empty balance */}
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
