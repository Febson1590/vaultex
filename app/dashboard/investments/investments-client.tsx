"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, CheckCircle, PauseCircle, XCircle, Clock,
  Plus, ArrowDownToLine, DollarSign, Loader2, ChevronRight,
} from "lucide-react";
import { userStartInvestment, addInvestmentFunds } from "@/lib/actions/investment";
import { formatCurrency } from "@/lib/utils";
import { KycBanner } from "@/components/dashboard/kyc-banner";
import type { KycStatus } from "@/lib/kyc";

interface Plan {
  id: string; name: string; description: string | null;
  minAmount: number; minProfit: number; maxProfit: number;
  profitInterval: number; maxInterval: number; isActive: boolean;
}
interface ActiveInvestment {
  planName: string; amount: number; totalEarned: number;
  minProfit: number; maxProfit: number; profitInterval: number;
  maxInterval: number; status: string;
}
interface Props { plans: Plan[]; investment: ActiveInvestment | null; usdBalance: number; kycStatus: KycStatus }

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string; Icon: typeof CheckCircle }> = {
  ACTIVE:    { label: "Active",    color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", Icon: CheckCircle },
  PAUSED:    { label: "Paused",    color: "text-yellow-400",  bg: "bg-yellow-500/10",  border: "border-yellow-500/30",  Icon: PauseCircle },
  CANCELLED: { label: "Cancelled", color: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/30",     Icon: XCircle },
};

function PlanCard({ plan, onSelect }: { plan: Plan; onSelect: (p: Plan) => void }) {
  return (
    <div onClick={() => onSelect(plan)}
      className="glass-card rounded-2xl border border-sky-500/15 hover:border-sky-500/40 transition-all cursor-pointer group overflow-hidden">
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-base font-bold text-white group-hover:text-sky-300 transition-colors">{plan.name}</h3>
            {plan.description && <p className="text-xs text-slate-500 mt-0.5">{plan.description}</p>}
          </div>
          <ChevronRight size={16} className="text-slate-600 group-hover:text-sky-400 transition-colors mt-0.5 flex-shrink-0" />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-white/[0.04] rounded-xl p-3">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Min Investment</div>
            <div className="text-sm font-bold text-white">{formatCurrency(plan.minAmount)}</div>
          </div>
          <div className="bg-white/[0.04] rounded-xl p-3">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Profit / Cycle</div>
            <div className="text-sm font-bold text-emerald-400">{plan.minProfit}%–{plan.maxProfit}%</div>
          </div>
          <div className="bg-white/[0.04] rounded-xl p-3 col-span-2">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Random Cycle</div>
            <div className="text-sm font-bold text-sky-400">Every {plan.profitInterval}s–{plan.maxInterval}s</div>
          </div>
        </div>
      </div>
      <div className="px-5 py-3 border-t border-white/[0.05] bg-sky-500/[0.03] group-hover:bg-sky-500/[0.06] transition-colors">
        <span className="text-xs font-semibold text-sky-400 flex items-center gap-1">
          <DollarSign size={11} /> Invest in this plan
        </span>
      </div>
    </div>
  );
}

function InvestModal({ plan, usdBalance, onClose, onSuccess }: {
  plan: Plan; usdBalance: number; onClose: () => void; onSuccess: () => void;
}) {
  const [amount, setAmount] = useState(String(plan.minAmount));
  const [isPending, start] = useTransition();
  const val = parseFloat(amount) || 0;
  const canAfford = val <= usdBalance;
  const meetsMin = val >= plan.minAmount;

  function submit() {
    if (!meetsMin) { toast.error(`Minimum is ${formatCurrency(plan.minAmount)}`); return; }
    if (!canAfford) { toast.error("Insufficient USD balance"); return; }
    start(async () => {
      const r = await userStartInvestment({ planId: plan.id, amount: val });
      if ('error' in r) { toast.error(r.error); return; }
      toast.success("Investment activated!"); onSuccess();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-card border border-sky-500/20 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold text-white mb-1">Invest in {plan.name}</h3>
        <p className="text-xs text-slate-500 mb-5">{plan.minProfit}%–{plan.maxProfit}% every {plan.profitInterval}s–{plan.maxInterval}s</p>
        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-center">
            <div className="text-[10px] text-slate-500 mb-0.5">Balance</div>
            <div className="text-sm font-bold text-white">{formatCurrency(usdBalance)}</div>
          </div>
          <div className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-center">
            <div className="text-[10px] text-slate-500 mb-0.5">Min Amount</div>
            <div className="text-sm font-bold text-sky-400">{formatCurrency(plan.minAmount)}</div>
          </div>
        </div>
        <div className="mb-5">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Amount (USD)</label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <input type="number" autoFocus step="100"
              className="w-full bg-white/[0.06] border border-white/[0.15] rounded-lg pl-7 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-sky-500/60"
              value={amount} onChange={e => setAmount(e.target.value)} min={plan.minAmount} />
          </div>
          {val > 0 && !canAfford && <p className="text-[11px] text-red-400 mt-1">Insufficient balance</p>}
          {val > 0 && !meetsMin && <p className="text-[11px] text-yellow-400 mt-1">Below minimum of {formatCurrency(plan.minAmount)}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 border-white/10 text-slate-300 hover:text-white" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button className="flex-1 bg-sky-500 hover:bg-sky-400 text-white font-semibold" onClick={submit} disabled={isPending || !canAfford || !meetsMin}>
            {isPending ? <Loader2 size={14} className="animate-spin mr-1" /> : null}Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}

function AddFundsModal({ investment, usdBalance, onClose, onSuccess }: {
  investment: ActiveInvestment; usdBalance: number; onClose: () => void; onSuccess: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [isPending, start] = useTransition();

  function submit() {
    const val = parseFloat(amount);
    if (!val || val <= 0) { toast.error("Enter a valid amount"); return; }
    if (val > usdBalance) { toast.error("Insufficient USD balance"); return; }
    start(async () => {
      const r = await addInvestmentFunds(val);
      if ('error' in r) { toast.error(r.error); return; }
      toast.success("Funds added!"); onSuccess();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-card border border-sky-500/20 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold text-white mb-1">Add Funds</h3>
        <p className="text-xs text-slate-500 mb-4">Adding to <span className="text-white font-medium">{investment.planName}</span></p>
        <div className="mb-4 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 flex justify-between">
          <span className="text-xs text-slate-500">Available Balance</span>
          <span className="text-sm font-bold text-white">{formatCurrency(usdBalance)}</span>
        </div>
        <div className="mb-5">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Amount (USD)</label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <input type="number" autoFocus step="100"
              className="w-full bg-white/[0.06] border border-white/[0.15] rounded-lg pl-7 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-sky-500/60"
              value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 1000" />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 border-white/10 text-slate-300 hover:text-white" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold" onClick={submit} disabled={isPending}>
            {isPending ? <Loader2 size={14} className="animate-spin mr-1" /> : <DollarSign size={14} className="mr-1" />}Add Funds
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function InvestmentsClient({ plans, investment, usdBalance, kycStatus }: Props) {
  const isRestricted = kycStatus !== "approved";
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showAddFunds, setShowAddFunds] = useState(false);

  function handleSuccess() {
    setSelectedPlan(null);
    setShowAddFunds(false);
    window.location.reload();
  }

  const cfg = investment ? (STATUS_CFG[investment.status] ?? STATUS_CFG.CANCELLED) : null;
  const roi = investment && investment.amount > 0 ? (investment.totalEarned / investment.amount) * 100 : 0;
  const isActive = investment?.status === "ACTIVE";

  return (
    <div className="space-y-6 max-w-3xl">
      {isRestricted && <KycBanner kycStatus={kycStatus} className="mb-4" />}
      <div>
        <h1 className="text-2xl font-bold text-white">Investments</h1>
        <p className="text-sm text-slate-500 mt-0.5">Choose a plan and grow your portfolio automatically</p>
      </div>

      {investment && investment.status !== "CANCELLED" ? (
        <div className="space-y-5">
          <div className="glass-card rounded-2xl border border-sky-500/20 overflow-hidden">
            <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-white/[0.05]">
              <div>
                {cfg && (
                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border mb-2 ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                    <cfg.Icon size={11} /> {cfg.label}
                  </span>
                )}
                <h2 className="text-xl font-extrabold text-white">{investment.planName}</h2>
                <p className="text-sm text-slate-500 mt-0.5">{investment.minProfit}%–{investment.maxProfit}% per cycle</p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-3xl font-extrabold text-emerald-400">{formatCurrency(investment.totalEarned)}</div>
                <div className="text-xs text-slate-500 mt-0.5">total earned</div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/[0.04]">
              {[
                { label: "Invested",     value: formatCurrency(investment.amount),                                        color: "text-white" },
                { label: "Total Earned", value: formatCurrency(investment.totalEarned),                                   color: "text-emerald-400" },
                { label: "ROI",          value: `${roi >= 0 ? "+" : ""}${roi.toFixed(2)}%`,                               color: "text-sky-400" },
                { label: "Cycle",        value: `${investment.profitInterval}s–${investment.maxInterval}s`,               color: "text-slate-300" },
              ].map(s => (
                <div key={s.label} className="px-6 py-5 bg-[#040f1f]">
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">{s.label}</div>
                  <div className={`text-lg font-extrabold ${s.color}`}>{s.value}</div>
                </div>
              ))}
            </div>
            {isActive && (
              <div className="px-6 py-4 flex flex-wrap gap-3 border-t border-white/[0.05]">
                <button onClick={() => setShowAddFunds(true)}
                  disabled={isRestricted}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-bold transition-colors shadow-lg shadow-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
                  <Plus size={14} /> {isRestricted ? "Verification Required" : "Add Funds"}
                </button>
                <a href="/dashboard/support">
                  <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.09] text-slate-300 hover:text-white text-sm font-medium transition-colors">
                    Upgrade Plan
                  </button>
                </a>
              </div>
            )}
          </div>
          <div className="glass-card rounded-xl p-5 border border-white/[0.07]">
            <div className="flex items-start gap-3">
              <Clock size={16} className="text-sky-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-white mb-0.5">How your investment works</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Your plan earns <span className="text-white">{investment.minProfit}%–{investment.maxProfit}%</span> per cycle,
                  at a random interval between <span className="text-white">{investment.profitInterval}s</span> and{" "}
                  <span className="text-white">{investment.maxInterval}s</span>. Profits go directly to your USD wallet.
                  Contact <a href="/dashboard/support" className="text-sky-400 hover:text-sky-300">support</a> to upgrade.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {plans.length === 0 ? (
            <div className="glass-card rounded-2xl p-14 text-center border border-white/[0.07]">
              <div className="w-16 h-16 rounded-2xl bg-sky-500/[0.08] flex items-center justify-center mx-auto mb-5">
                <TrendingUp size={28} className="text-sky-400/50" />
              </div>
              <h2 className="text-lg font-bold text-white mb-2">No Plans Available Yet</h2>
              <p className="text-sm text-slate-500 mb-7 max-w-sm mx-auto leading-relaxed">
                Investment plans haven&apos;t been configured. Make a deposit and contact support.
              </p>
              <a href={isRestricted ? "#" : "/dashboard/deposit"} onClick={e => { if (isRestricted) { e.preventDefault(); toast.error("Complete identity verification to continue."); } }}>
                <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-bold transition-colors shadow-lg shadow-sky-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isRestricted}>
                  <ArrowDownToLine size={14} /> {isRestricted ? "Verification Required" : "Make a Deposit"}
                </button>
              </a>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-5 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                <span className="text-sm text-slate-400">Your USD Balance</span>
                <span className="text-base font-extrabold text-white">{formatCurrency(usdBalance)}</span>
              </div>
              {usdBalance === 0 && (
                <div className="px-4 py-3 rounded-xl bg-yellow-500/[0.08] border border-yellow-500/20 text-sm text-yellow-400 flex items-center gap-2">
                  <ArrowDownToLine size={14} className="flex-shrink-0" />
                  <span>You need to <a href={isRestricted ? "#" : "/dashboard/deposit"} onClick={e => { if (isRestricted) { e.preventDefault(); toast.error("Complete identity verification to continue."); } }} className="font-bold underline underline-offset-2">make a deposit</a> before investing.</span>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                {plans.map(plan => <PlanCard key={plan.id} plan={plan} onSelect={p => {
                  if (isRestricted) { toast.error("Complete identity verification to continue."); return; }
                  setSelectedPlan(p);
                }} />)}
              </div>
            </>
          )}
        </div>
      )}

      {selectedPlan && (
        <InvestModal plan={selectedPlan} usdBalance={usdBalance} onClose={() => setSelectedPlan(null)} onSuccess={handleSuccess} />
      )}
      {showAddFunds && investment && (
        <AddFundsModal investment={investment} usdBalance={usdBalance} onClose={() => setShowAddFunds(false)} onSuccess={handleSuccess} />
      )}
    </div>
  );
}
