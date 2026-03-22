import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import {
  TrendingUp, ArrowDownToLine, Plus, Clock,
  CheckCircle, PauseCircle, XCircle,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Investments — VaultEx" };

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof CheckCircle }> = {
  ACTIVE:    { label: "Active",    color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", icon: CheckCircle },
  PAUSED:    { label: "Paused",    color: "text-yellow-400",  bg: "bg-yellow-500/10",  border: "border-yellow-500/30",  icon: PauseCircle },
  CANCELLED: { label: "Cancelled", color: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/30",     icon: XCircle },
};

export default async function InvestmentsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const investment = await db.userInvestment.findUnique({ where: { userId } });

  const inv = investment
    ? {
        id: investment.id,
        planName: investment.planName,
        amount: Number(investment.amount),
        totalEarned: Number(investment.totalEarned),
        minProfit: Number(investment.minProfit),
        maxProfit: Number(investment.maxProfit),
        profitInterval: investment.profitInterval,
        status: investment.status,
        nextProfitAt: investment.nextProfitAt?.toISOString() ?? null,
      }
    : null;

  const roi = inv && inv.amount > 0 ? (inv.totalEarned / inv.amount) * 100 : 0;
  const cfg = inv ? (STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.CANCELLED) : null;
  const isActive = inv?.status === "ACTIVE";

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Investments</h1>
        <p className="text-sm text-slate-500 mt-0.5">Your active investment plan and earnings overview</p>
      </div>

      {inv && inv.status !== "CANCELLED" ? (
        <div className="space-y-4">
          {/* Main card */}
          <div className="glass-card rounded-2xl border border-sky-500/20 overflow-hidden">
            {/* Top header */}
            <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-white/[0.05]">
              <div>
                {cfg && (
                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border mb-2 ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                    <cfg.icon size={11} />
                    {cfg.label}
                  </span>
                )}
                <h2 className="text-xl font-extrabold text-white">{inv.planName}</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {inv.minProfit}%–{inv.maxProfit}% profit every {inv.profitInterval}s
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-3xl font-extrabold text-emerald-400">
                  {formatCurrency(inv.totalEarned)}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">total earned</div>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/[0.04]">
              {[
                { label: "Invested",     value: formatCurrency(inv.amount),                             color: "text-white" },
                { label: "Total Earned", value: formatCurrency(inv.totalEarned),                        color: "text-emerald-400" },
                { label: "ROI",          value: `${roi >= 0 ? "+" : ""}${roi.toFixed(2)}%`,             color: "text-sky-400" },
                { label: "Cycle",        value: `${inv.profitInterval}s`,                               color: "text-slate-300" },
              ].map(s => (
                <div key={s.label} className="px-6 py-5 bg-[#040f1f]">
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">{s.label}</div>
                  <div className={`text-lg font-extrabold ${s.color}`}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Actions */}
            {isActive && (
              <div className="px-6 py-4 flex flex-wrap gap-3 border-t border-white/[0.05]">
                <Link href="/dashboard/deposit">
                  <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-bold transition-colors shadow-lg shadow-sky-500/20">
                    <Plus size={14} /> Add Funds
                  </button>
                </Link>
                <Link href="/dashboard/support">
                  <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.09] text-slate-300 hover:text-white text-sm font-medium transition-colors">
                    Upgrade Plan
                  </button>
                </Link>
              </div>
            )}
          </div>

          {/* Info card */}
          <div className="glass-card rounded-xl p-5 border border-white/[0.07]">
            <div className="flex items-start gap-3">
              <Clock size={16} className="text-sky-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-white mb-0.5">How your investment works</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Your plan generates between <span className="text-white">{inv.minProfit}%</span> and{" "}
                  <span className="text-white">{inv.maxProfit}%</span> profit per cycle (every{" "}
                  <span className="text-white">{inv.profitInterval} seconds</span>). Earnings are added to your
                  USD wallet automatically. Contact support to upgrade or modify your plan.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-14 text-center border border-white/[0.07]">
          <div className="w-16 h-16 rounded-2xl bg-sky-500/[0.08] flex items-center justify-center mx-auto mb-5">
            <TrendingUp size={28} className="text-sky-400/50" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">No Active Investment Plan</h2>
          <p className="text-sm text-slate-500 mb-7 max-w-sm mx-auto leading-relaxed">
            Make a deposit and our team will activate an investment plan tailored to your goals.
          </p>
          <Link href="/dashboard/deposit">
            <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-bold transition-colors shadow-lg shadow-sky-500/25">
              <ArrowDownToLine size={14} /> Make a Deposit
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}
