import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { formatCurrency, truncateAddress } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Copy, ArrowDownToLine, ArrowUpFromLine, Plus } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Wallets" };

const CURRENCY_META: Record<string, { name: string; color: string; symbol: string }> = {
  USD: { name: "US Dollar", color: "#0ea5e9", symbol: "$" },
  BTC: { name: "Bitcoin", color: "#f59e0b", symbol: "₿" },
  ETH: { name: "Ethereum", color: "#6366f1", symbol: "Ξ" },
  USDT: { name: "Tether USD", color: "#10b981", symbol: "₮" },
};

export default async function WalletsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const wallets = await db.wallet.findMany({ where: { userId: session.user.id }, orderBy: { currency: "asc" } });
  const recentTx = await db.transaction.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" }, take: 10 });

  const totalUSD = wallets.reduce((sum, w) => {
    if (w.currency === "USD" || w.currency === "USDT") return sum + Number(w.balance);
    return sum;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Wallets</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your crypto and fiat balances</p>
        </div>
        <div className="flex gap-2">
          <Button render={<Link href="/dashboard/withdraw" />} variant="outline" size="sm" className="border-white/10 text-slate-300 hover:bg-white/5 text-xs">
            <ArrowUpFromLine size={13} className="mr-1" /> Withdraw
          </Button>
          <Button render={<Link href="/dashboard/deposit" />} size="sm" className="bg-sky-500 hover:bg-sky-400 text-white text-xs">
            <ArrowDownToLine size={13} className="mr-1" /> Deposit
          </Button>
        </div>
      </div>

      {/* Total balance */}
      <div className="glass-card rounded-xl p-6 border border-sky-500/20 bg-sky-500/5">
        <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Total Wallet Value</p>
        <div className="text-4xl font-bold text-white">{formatCurrency(wallets.reduce((s, w) => s + Number(w.balance), 0))}</div>
        <p className="text-xs text-slate-500 mt-1">Across all currency wallets</p>
      </div>

      {/* Wallet cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {wallets.map((wallet) => {
          const meta = CURRENCY_META[wallet.currency] || { name: wallet.currency, color: "#64748b", symbol: "" };
          return (
            <div key={wallet.id} className="glass-card glass-card-hover rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border"
                    style={{ background: `${meta.color}15`, borderColor: `${meta.color}30`, color: meta.color }}>
                    {meta.symbol || wallet.currency.slice(0, 1)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{wallet.currency}</div>
                    <div className="text-xs text-slate-500">{meta.name}</div>
                  </div>
                </div>
                {wallet.isLocked && (
                  <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded px-2 py-0.5">Locked</span>
                )}
              </div>

              <div className="mb-4">
                <div className="text-2xl font-bold text-white">
                  {wallet.currency === "USD" || wallet.currency === "USDT"
                    ? formatCurrency(Number(wallet.balance))
                    : `${Number(wallet.balance).toFixed(8)}`}
                </div>
                {wallet.currency !== "USD" && wallet.currency !== "USDT" && (
                  <div className="text-xs text-slate-500 mt-0.5">{wallet.currency}</div>
                )}
              </div>

              {wallet.address && (
                <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
                  <span className="text-xs text-slate-500 font-mono flex-1 truncate">{truncateAddress(wallet.address, 8)}</span>
                  <button className="text-slate-500 hover:text-sky-400 transition-colors flex-shrink-0">
                    <Copy size={12} />
                  </button>
                </div>
              )}

              <div className="flex gap-2 mt-3">
                <Button render={<Link href="/dashboard/deposit" />} variant="outline" size="sm" className="flex-1 border-white/10 text-slate-400 hover:bg-white/5 text-xs h-8">
                  Deposit
                </Button>
                <Button render={<Link href="/dashboard/withdraw" />} variant="outline" size="sm" className="flex-1 border-white/10 text-slate-400 hover:bg-white/5 text-xs h-8">
                  Withdraw
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent transactions */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Recent Wallet Activity</h2>
          <Link href="/dashboard/transactions" className="text-xs text-sky-400 hover:text-sky-300">View all</Link>
        </div>
        {recentTx.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">No transactions yet</div>
        ) : (
          <div className="divide-y divide-white/5">
            {recentTx.map((tx) => {
              const isCredit = ["DEPOSIT", "BUY", "BONUS", "ADJUSTMENT"].includes(tx.type) === false
                ? tx.type === "SELL" ? true : false
                : ["DEPOSIT", "BONUS"].includes(tx.type);
              return (
                <div key={tx.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-white/2 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isCredit ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                      {isCredit ? <ArrowDownToLine size={14} className="text-emerald-400" /> : <ArrowUpFromLine size={14} className="text-red-400" />}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{tx.description || tx.type}</div>
                      <div className="text-xs text-slate-500">{new Date(tx.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className={`text-sm font-semibold ${isCredit ? "text-emerald-400" : "text-red-400"}`}>
                    {isCredit ? "+" : "-"}{Number(tx.amount).toFixed(6)} {tx.currency}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
