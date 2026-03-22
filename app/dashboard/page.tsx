import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { formatCurrency, formatPercent, formatDateTime, getStatusBg } from "@/lib/utils";
import { StatCard } from "@/components/dashboard/stat-card";
import { PortfolioChart } from "@/components/dashboard/portfolio-chart";
import { AllocationChart } from "@/components/dashboard/allocation-chart";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  DollarSign, TrendingUp, Wallet, Activity,
  ArrowUpRight, ArrowDownRight, ArrowRight, Plus, ShieldAlert,
} from "lucide-react";
import { getPortfolioPerformance } from "@/lib/actions/user";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

const ASSET_COLORS: Record<string, string> = {
  BTC: "#f59e0b",
  ETH: "#6366f1",
  SOL: "#8b5cf6",
  USDT: "#10b981",
  BNB: "#f59e0b",
  XRP: "#06b6d4",
  ADA: "#3b82f6",
  AVAX: "#ef4444",
  USD: "#0ea5e9",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const [user, wallets, holdings, transactions, notifications, marketAssets, chartData] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, include: { verifications: { orderBy: { submittedAt: "desc" }, take: 1 } } }),
    db.wallet.findMany({ where: { userId } }),
    db.assetHolding.findMany({ where: { userId }, include: { asset: true } }),
    db.transaction.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 8 }),
    db.notification.findMany({ where: { userId, isRead: false }, orderBy: { createdAt: "desc" }, take: 5 }),
    db.marketAsset.findMany({ where: { isActive: true }, orderBy: { rank: "asc" }, take: 5 }),
    getPortfolioPerformance(userId),
  ]);

  if (!user) redirect("/login");

  // Portfolio calculations
  const usdWallet = wallets.find((w) => w.currency === "USD");
  const cashBalance = Number(usdWallet?.balance || 0);

  const holdingsValue = holdings.reduce((sum, h) => {
    return sum + Number(h.quantity) * Number(h.asset.currentPrice);
  }, 0);

  const totalInvested = holdings.reduce((sum, h) => sum + Number(h.totalInvested), 0);
  const totalPortfolio = cashBalance + holdingsValue;
  const totalPnL = holdingsValue - totalInvested;
  const pnlPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

  // Allocation data
  const allocationData = [
    { name: "USD Cash", value: totalPortfolio > 0 ? (cashBalance / totalPortfolio) * 100 : 0, color: ASSET_COLORS["USD"] },
    ...holdings.map((h) => ({
      name: h.asset.symbol,
      value: totalPortfolio > 0 ? ((Number(h.quantity) * Number(h.asset.currentPrice)) / totalPortfolio) * 100 : 0,
      color: ASSET_COLORS[h.asset.symbol] || "#64748b",
    })),
  ].filter((d) => d.value > 0);

  const kycStatus = user.verifications[0]?.status || "NOT_SUBMITTED";
  const isVerified = kycStatus === "APPROVED";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {user.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Here's your portfolio overview</p>
        </div>
        <div className="flex items-center gap-2">
          {!isVerified && (
            <Button render={<Link href="/dashboard/verification" />} variant="outline" size="sm" className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 text-xs">
              <ShieldAlert size={13} className="mr-1" /> Verify Identity
            </Button>
          )}
          <Button render={<Link href="/dashboard/trade" />} size="sm" className="bg-sky-500 hover:bg-sky-400 text-white text-xs">
            <Plus size={13} className="mr-1" /> New Trade
          </Button>
        </div>
      </div>

      {/* KYC banner */}
      {!isVerified && (
        <div className="glass-card rounded-xl p-4 border border-yellow-500/20 bg-yellow-500/5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-yellow-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-300">Identity Verification Required</p>
              <p className="text-xs text-slate-400">Complete KYC verification to unlock full trading features and higher deposit limits.</p>
            </div>
          </div>
          <Button render={<Link href="/dashboard/verification" />} size="sm" className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold flex-shrink-0 text-xs">
            Verify Now
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Portfolio"
          value={formatCurrency(totalPortfolio)}
          subtitle="incl. cash"
          icon={DollarSign}
        />
        <StatCard
          title="Available Cash"
          value={formatCurrency(cashBalance)}
          subtitle="USD balance"
          icon={Wallet}
          iconColor="text-emerald-400"
        />
        <StatCard
          title="Holdings Value"
          value={formatCurrency(holdingsValue)}
          subtitle="crypto assets"
          icon={Activity}
          iconColor="text-violet-400"
        />
        <StatCard
          title="Total P&L"
          value={formatCurrency(Math.abs(totalPnL))}
          subtitle={`${formatPercent(pnlPercent)} overall`}
          change={pnlPercent}
          icon={TrendingUp}
          iconColor={totalPnL >= 0 ? "text-emerald-400" : "text-red-400"}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Portfolio chart */}
        <div className="lg:col-span-2 glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-white">Portfolio Performance</h2>
              <p className="text-xs text-slate-500 mt-0.5">Last 30 days</p>
            </div>
          </div>
          <div className="h-56">
            <PortfolioChart data={chartData} />
          </div>
        </div>

        {/* Allocation */}
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-white">Allocation</h2>
          </div>
          {allocationData.length > 0 ? (
            <div className="h-56">
              <AllocationChart data={allocationData} />
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center">
              <p className="text-sm text-slate-500">No holdings yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Holdings + Transactions + Market row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Holdings */}
        <div className="lg:col-span-2 glass-card rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-white/5">
            <h2 className="text-sm font-semibold text-white">My Holdings</h2>
            <Link href="/dashboard/portfolio" className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {holdings.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-500 mb-3">No holdings yet</p>
              <Button render={<Link href="/dashboard/trade" />} size="sm" className="bg-sky-500 hover:bg-sky-400 text-white text-xs">
                Start Trading
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {holdings.map((h) => {
                const currentValue = Number(h.quantity) * Number(h.asset.currentPrice);
                const pnl = currentValue - Number(h.totalInvested);
                const pnlPct = Number(h.totalInvested) > 0 ? (pnl / Number(h.totalInvested)) * 100 : 0;
                return (
                  <div key={h.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-white/2 transition-colors">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: `${ASSET_COLORS[h.asset.symbol] || "#64748b"}20`, border: `1px solid ${ASSET_COLORS[h.asset.symbol] || "#64748b"}40` }}
                      >
                        {h.asset.symbol.slice(0, 2)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">{h.asset.symbol}</div>
                        <div className="text-xs text-slate-500">{Number(h.quantity).toFixed(6)} {h.asset.symbol}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-white">{formatCurrency(currentValue)}</div>
                      <div className={`text-xs font-medium flex items-center gap-0.5 justify-end ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {pnl >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                        {formatPercent(pnlPct)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Market + Recent Transactions */}
        <div className="space-y-5">
          {/* Market */}
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <h2 className="text-sm font-semibold text-white">Market</h2>
              <Link href="/markets" className="text-xs text-sky-400 hover:text-sky-300">View all</Link>
            </div>
            <div className="divide-y divide-white/5">
              {marketAssets.map((asset) => {
                const change = Number(asset.priceChange24h);
                return (
                  <div key={asset.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-white/2 transition-colors">
                    <div>
                      <div className="text-xs font-semibold text-white">{asset.symbol}</div>
                      <div className="text-[10px] text-slate-500">{asset.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold text-white">{formatCurrency(Number(asset.currentPrice))}</div>
                      <div className={`text-[10px] font-medium ${change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {formatPercent(change)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <h2 className="text-sm font-semibold text-white">Recent Activity</h2>
              <Link href="/dashboard/transactions" className="text-xs text-sky-400 hover:text-sky-300">All</Link>
            </div>
            <div className="divide-y divide-white/5">
              {transactions.slice(0, 5).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <div className="text-xs font-medium text-white">{tx.type}</div>
                    <div className="text-[10px] text-slate-500">{formatDateTime(tx.createdAt)}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs font-semibold ${tx.type === "DEPOSIT" || tx.type === "BUY" || tx.type === "BONUS" ? "text-emerald-400" : "text-red-400"}`}>
                      {tx.type === "WITHDRAWAL" || tx.type === "SELL" ? "-" : "+"}{Number(tx.amount).toFixed(4)} {tx.currency}
                    </div>
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-500">No transactions yet</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
