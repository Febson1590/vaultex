import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { PortfolioChart } from "@/components/dashboard/portfolio-chart";
import { AllocationChart } from "@/components/dashboard/allocation-chart";
import { getPortfolioPerformance } from "@/lib/actions/user";
import { ArrowUpRight, ArrowDownRight, TrendingUp, DollarSign, Activity } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Portfolio" };

const ASSET_COLORS: Record<string, string> = {
  BTC: "#f59e0b", ETH: "#6366f1", SOL: "#8b5cf6", USDT: "#10b981",
  BNB: "#eab308", XRP: "#06b6d4", ADA: "#3b82f6", AVAX: "#ef4444", USD: "#0ea5e9",
};

export default async function PortfolioPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [wallets, holdings, chartData] = await Promise.all([
    db.wallet.findMany({ where: { userId } }),
    db.assetHolding.findMany({ where: { userId }, include: { asset: true } }),
    getPortfolioPerformance(userId),
  ]);

  const cashBalance = Number(wallets.find((w) => w.currency === "USD")?.balance || 0);
  const holdingsValue = holdings.reduce((s, h) => s + Number(h.quantity) * Number(h.asset.currentPrice), 0);
  const totalInvested = holdings.reduce((s, h) => s + Number(h.totalInvested), 0);
  const totalPortfolio = cashBalance + holdingsValue;
  const totalPnL = holdingsValue - totalInvested;
  const pnlPct = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

  const allocationData = [
    { name: "USD Cash", value: totalPortfolio > 0 ? (cashBalance / totalPortfolio) * 100 : 0, color: "#0ea5e9" },
    ...holdings.map((h) => ({
      name: h.asset.symbol,
      value: totalPortfolio > 0 ? ((Number(h.quantity) * Number(h.asset.currentPrice)) / totalPortfolio) * 100 : 0,
      color: ASSET_COLORS[h.asset.symbol] || "#64748b",
    })),
  ].filter((d) => d.value > 0.01);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Portfolio</h1>
        <p className="text-sm text-slate-500 mt-0.5">Your complete investment overview</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Portfolio Value", value: formatCurrency(totalPortfolio), icon: DollarSign, color: "text-sky-400" },
          { label: "Assets Under Management", value: formatCurrency(holdingsValue), icon: Activity, color: "text-violet-400" },
          { label: "Total P&L", value: `${totalPnL >= 0 ? "+" : ""}${formatCurrency(Math.abs(totalPnL))}`, icon: TrendingUp, color: totalPnL >= 0 ? "text-emerald-400" : "text-red-400" },
        ].map((card) => (
          <div key={card.label} className="glass-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 uppercase tracking-widest">{card.label}</span>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
            <div className={`text-2xl font-bold ${card.label.includes("P&L") ? (totalPnL >= 0 ? "text-emerald-400" : "text-red-400") : "text-white"}`}>
              {card.value}
            </div>
            {card.label.includes("P&L") && (
              <div className={`text-xs mt-1 ${pnlPct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {formatPercent(pnlPct)} overall return
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 glass-card rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Performance History (30 days)</h2>
          <div className="h-64"><PortfolioChart data={chartData} /></div>
        </div>
        <div className="glass-card rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Asset Allocation</h2>
          {allocationData.length > 0 ? (
            <div className="h-64"><AllocationChart data={allocationData} /></div>
          ) : (
            <div className="h-64 flex items-center justify-center text-sm text-slate-500">No holdings yet</div>
          )}
        </div>
      </div>

      {/* Holdings table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-5 border-b border-white/5">
          <h2 className="text-sm font-semibold text-white">Holdings Breakdown</h2>
        </div>
        {holdings.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            No crypto holdings yet. Head to the Trade page to place your first order.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full premium-table">
              <thead>
                <tr className="border-b border-white/5">
                  {["Asset", "Quantity", "Avg Buy Price", "Current Price", "Current Value", "Invested", "P&L", "Allocation"].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-slate-500 px-5 py-3 uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => {
                  const current = Number(h.quantity) * Number(h.asset.currentPrice);
                  const invested = Number(h.totalInvested);
                  const pnl = current - invested;
                  const pnlP = invested > 0 ? (pnl / invested) * 100 : 0;
                  const alloc = totalPortfolio > 0 ? (current / totalPortfolio) * 100 : 0;
                  return (
                    <tr key={h.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ background: `${ASSET_COLORS[h.asset.symbol] || "#64748b"}20`, border: `1px solid ${ASSET_COLORS[h.asset.symbol] || "#64748b"}40`, color: ASSET_COLORS[h.asset.symbol] || "#64748b" }}>
                            {h.asset.symbol.slice(0, 2)}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-white">{h.asset.name}</div>
                            <div className="text-xs text-slate-500">{h.asset.symbol}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-300">{Number(h.quantity).toFixed(6)}</td>
                      <td className="px-5 py-4 text-sm text-slate-300">{formatCurrency(Number(h.avgBuyPrice))}</td>
                      <td className="px-5 py-4 text-sm text-white font-medium">{formatCurrency(Number(h.asset.currentPrice))}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-white">{formatCurrency(current)}</td>
                      <td className="px-5 py-4 text-sm text-slate-300">{formatCurrency(invested)}</td>
                      <td className="px-5 py-4">
                        <div className={`flex items-center gap-1 text-sm font-medium ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {pnl >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                          {formatCurrency(Math.abs(pnl))}
                          <span className="text-xs">({formatPercent(pnlP)})</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-400">{alloc.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
