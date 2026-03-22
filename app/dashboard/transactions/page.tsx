import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { formatDateTime, getStatusBg } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ArrowDownToLine, ArrowUpFromLine, TrendingUp, TrendingDown, Gift, Settings2 } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Transactions" };

const TX_ICONS: Record<string, any> = {
  DEPOSIT: ArrowDownToLine, WITHDRAWAL: ArrowUpFromLine,
  BUY: TrendingUp, SELL: TrendingDown, BONUS: Gift, ADJUSTMENT: Settings2, FEE: Settings2,
};

const TX_COLORS: Record<string, string> = {
  DEPOSIT: "text-emerald-400 bg-emerald-500/10",
  WITHDRAWAL: "text-red-400 bg-red-500/10",
  BUY: "text-sky-400 bg-sky-500/10",
  SELL: "text-orange-400 bg-orange-500/10",
  BONUS: "text-yellow-400 bg-yellow-500/10",
  ADJUSTMENT: "text-slate-400 bg-slate-500/10",
  FEE: "text-slate-400 bg-slate-500/10",
};

export default async function TransactionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const transactions = await db.transaction.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const deposits = transactions.filter((t) => t.type === "DEPOSIT");
  const withdrawals = transactions.filter((t) => t.type === "WITHDRAWAL");
  const trades = transactions.filter((t) => t.type === "BUY" || t.type === "SELL");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Transaction History</h1>
        <p className="text-sm text-slate-500 mt-0.5">Complete record of all account activity</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Deposits", count: deposits.length, amount: deposits.reduce((s, t) => s + Number(t.amount), 0), color: "emerald" },
          { label: "Total Withdrawals", count: withdrawals.length, amount: withdrawals.reduce((s, t) => s + Number(t.amount), 0), color: "red" },
          { label: "Trades Executed", count: trades.length, amount: trades.reduce((s, t) => s + Number(t.amount), 0), color: "sky" },
        ].map((item) => (
          <div key={item.label} className="glass-card rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-2">{item.label}</div>
            <div className="text-xl font-bold text-white">{item.count}</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {item.label.includes("Trades") ? `${item.count} orders` : `$${item.amount.toFixed(2)} total`}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <Card className="glass-card border-0 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">All Transactions</h2>
          <span className="text-xs text-slate-500">{transactions.length} records</span>
        </div>

        {transactions.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">No transactions yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full premium-table">
              <thead>
                <tr className="border-b border-white/5">
                  {["Type", "Description", "Amount", "Currency", "Status", "Date"].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-slate-500 px-5 py-3 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const Icon = TX_ICONS[tx.type] || Settings2;
                  const colors = TX_COLORS[tx.type] || "text-slate-400 bg-slate-500/10";
                  const isCredit = ["DEPOSIT", "BONUS"].includes(tx.type);
                  return (
                    <tr key={tx.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors}`}>
                          <Icon size={14} />
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-sm text-white">{tx.description || tx.type}</div>
                        {tx.reference && <div className="text-xs text-slate-500 font-mono">{tx.reference.slice(0, 16)}...</div>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-sm font-semibold ${isCredit ? "text-emerald-400" : tx.type === "WITHDRAWAL" ? "text-red-400" : "text-white"}`}>
                          {isCredit ? "+" : tx.type === "WITHDRAWAL" ? "-" : ""}{Number(tx.amount).toFixed(6)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs text-slate-400 font-mono bg-white/5 px-2 py-0.5 rounded">{tx.currency}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-medium px-2 py-1 rounded-md border ${getStatusBg(tx.status)}`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">{formatDateTime(tx.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
