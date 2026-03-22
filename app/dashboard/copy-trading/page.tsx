import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { Users, ArrowDownToLine, TrendingUp } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Copy Trading — VaultEx" };

export default async function CopyTradingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const copyTrades = await db.userCopyTrade.findMany({
    where: { userId },
    orderBy: { startedAt: "desc" },
  });

  const serialized = copyTrades.map(t => ({
    id: t.id,
    traderName: t.traderName,
    amount: Number(t.amount),
    totalEarned: Number(t.totalEarned),
    minProfit: Number(t.minProfit),
    maxProfit: Number(t.maxProfit),
    profitInterval: t.profitInterval,
    status: t.status,
    startedAt: t.startedAt.toISOString(),
  }));

  const active = serialized.filter(t => t.status !== "STOPPED");
  const totalEarned = active.reduce((s, t) => s + t.totalEarned, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Copy Trading</h1>
          <p className="text-sm text-slate-500 mt-0.5">Automatically mirror top trader strategies</p>
        </div>
        {active.length > 0 && (
          <div className="text-right flex-shrink-0">
            <div className="text-2xl font-extrabold text-emerald-400">{formatCurrency(totalEarned)}</div>
            <div className="text-xs text-slate-500 mt-0.5">{active.length} active trader{active.length !== 1 ? "s" : ""}</div>
          </div>
        )}
      </div>

      {serialized.length === 0 ? (
        /* Empty state */
        <div className="glass-card rounded-2xl p-14 text-center border border-white/[0.07]">
          <div className="w-16 h-16 rounded-2xl bg-sky-500/[0.08] flex items-center justify-center mx-auto mb-5">
            <Users size={28} className="text-sky-400/50" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">No Copy Trades Active</h2>
          <p className="text-sm text-slate-500 mb-7 max-w-sm mx-auto leading-relaxed">
            Our team assigns top-performing traders to copy on your behalf. Make a deposit to get started.
          </p>
          <Link href="/dashboard/deposit">
            <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-bold transition-colors shadow-lg shadow-sky-500/25">
              <ArrowDownToLine size={14} /> Make a Deposit
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Active traders */}
          {active.length > 0 && (
            <div className="glass-card rounded-2xl overflow-hidden border border-sky-500/15">
              <div className="px-5 py-4 border-b border-white/[0.05] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-bold text-white">Active Traders</span>
                <span className="ml-auto text-xs text-slate-500">{active.length} running</span>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {active.map(trade => {
                  const roi = trade.amount > 0 ? (trade.totalEarned / trade.amount) * 100 : 0;
                  const hue = [...trade.traderName].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
                  return (
                    <div key={trade.id} className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors">
                      {/* Avatar */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: `hsl(${hue} 50% 20%)`, border: `1px solid hsl(${hue} 50% 30%)` }}
                      >
                        {trade.traderName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                      </div>

                      {/* Name + rate */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white truncate">{trade.traderName}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {trade.minProfit}%–{trade.maxProfit}% / {trade.profitInterval}s
                        </div>
                      </div>

                      {/* Amount copied */}
                      <div className="text-right hidden sm:block flex-shrink-0">
                        <div className="text-xs text-slate-500 mb-0.5">Copying</div>
                        <div className="text-sm font-bold text-sky-400">{formatCurrency(trade.amount)}</div>
                      </div>

                      {/* Earned */}
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs text-slate-500 mb-0.5">Earned</div>
                        <div className="text-sm font-extrabold text-emerald-400">{formatCurrency(trade.totalEarned)}</div>
                      </div>

                      {/* ROI */}
                      <div className="text-right hidden sm:block flex-shrink-0 w-16">
                        <div className="text-xs text-slate-500 mb-0.5">ROI</div>
                        <div className="text-sm font-bold text-sky-400">{roi >= 0 ? "+" : ""}{roi.toFixed(2)}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stopped traders */}
          {serialized.filter(t => t.status === "STOPPED").length > 0 && (
            <div className="glass-card rounded-2xl overflow-hidden border border-white/[0.07]">
              <div className="px-5 py-4 border-b border-white/[0.05]">
                <span className="text-sm font-semibold text-slate-500">Past Traders</span>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {serialized.filter(t => t.status === "STOPPED").map(trade => {
                  const roi = trade.amount > 0 ? (trade.totalEarned / trade.amount) * 100 : 0;
                  const hue = [...trade.traderName].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
                  return (
                    <div key={trade.id} className="flex items-center gap-4 px-5 py-4 opacity-60">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: `hsl(${hue} 30% 15%)`, border: `1px solid hsl(${hue} 30% 22%)` }}
                      >
                        {trade.traderName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-400 truncate">{trade.traderName}</div>
                        <div className="text-xs text-slate-600">Stopped</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs text-slate-600 mb-0.5">Earned</div>
                        <div className="text-sm font-bold text-slate-400">{formatCurrency(trade.totalEarned)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="glass-card rounded-xl p-5 border border-white/[0.07]">
            <div className="flex items-start gap-3">
              <TrendingUp size={16} className="text-sky-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-white mb-0.5">How copy trading works</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Our team selects professional traders and allocates a portion of your balance to copy their
                  strategies automatically. Profits are credited to your USD wallet every cycle. Contact{" "}
                  <Link href="/dashboard/support" className="text-sky-400 hover:text-sky-300 transition-colors">
                    support
                  </Link>{" "}
                  to add or adjust copy traders.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
