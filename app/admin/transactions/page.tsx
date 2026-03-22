import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { formatCurrency, formatDateTime, getStatusBg } from "@/lib/utils";
import { ArrowDownLeft, ArrowUpRight, RefreshCw, TrendingUp, TrendingDown, Gift, Wrench, DollarSign } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Transactions" };

const TX_ICONS: Record<string, any> = {
  DEPOSIT: ArrowDownLeft,
  WITHDRAWAL: ArrowUpRight,
  BUY: TrendingUp,
  SELL: TrendingDown,
  FEE: DollarSign,
  BONUS: Gift,
  ADJUSTMENT: Wrench,
};

const TX_COLORS: Record<string, string> = {
  DEPOSIT: "text-emerald-400",
  WITHDRAWAL: "text-red-400",
  BUY: "text-sky-400",
  SELL: "text-orange-400",
  FEE: "text-slate-400",
  BONUS: "text-yellow-400",
  ADJUSTMENT: "text-violet-400",
};

export default async function AdminTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") redirect("/login");

  const params = await searchParams;
  const typeFilter = params.type;

  const transactions = await db.transaction.findMany({
    where: typeFilter ? { type: typeFilter as any } : undefined,
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  const totalAmount = transactions.reduce((s, t) => s + Number(t.amount), 0);

  const TX_TYPES = ["DEPOSIT", "WITHDRAWAL", "BUY", "SELL", "FEE", "BONUS", "ADJUSTMENT"];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Transactions</h1>
        <p className="text-sm text-slate-500 mt-0.5">Complete ledger of all platform transactions</p>
      </div>

      {/* Type filters */}
      <div className="flex flex-wrap gap-2">
        <a href="/admin/transactions" className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${!typeFilter ? "bg-sky-500/20 border-sky-500/40 text-sky-400" : "border-white/10 text-slate-400 hover:border-white/20"}`}>All</a>
        {TX_TYPES.map((type) => (
          <a key={type} href={`/admin/transactions?type=${type}`}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${typeFilter === type ? "bg-sky-500/20 border-sky-500/40 text-sky-400" : "border-white/10 text-slate-400 hover:border-white/20"}`}>
            {type}
          </a>
        ))}
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <span className="text-sm font-semibold text-white">{transactions.length} transactions</span>
          <span className="text-xs text-slate-500">Total: {formatCurrency(totalAmount)}</span>
        </div>

        {transactions.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">No transactions found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full premium-table">
              <thead>
                <tr className="border-b border-white/5">
                  {["User", "Type", "Currency", "Amount", "Fee", "Status", "Description", "Date"].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-slate-500 px-4 py-3 uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const Icon = TX_ICONS[tx.type] || RefreshCw;
                  const color = TX_COLORS[tx.type] || "text-slate-400";
                  return (
                    <tr key={tx.id} className="border-b border-white/5 hover:bg-white/2">
                      <td className="px-4 py-3">
                        <div className="text-sm text-white">{tx.user?.name}</div>
                        <div className="text-xs text-slate-500">{tx.user?.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className={`flex items-center gap-1.5 ${color}`}>
                          <Icon size={13} />
                          <span className="text-xs font-semibold">{tx.type}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 font-mono">{tx.currency}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-white">{formatCurrency(Number(tx.amount))}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{Number(tx.fee) > 0 ? formatCurrency(Number(tx.fee)) : "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getStatusBg(tx.status)}`}>{tx.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 max-w-[200px] truncate">{tx.description || "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDateTime(tx.createdAt)}</td>
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
