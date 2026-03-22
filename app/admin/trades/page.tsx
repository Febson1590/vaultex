import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { formatCurrency, formatDateTime, getStatusBg } from "@/lib/utils";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Trades" };

export default async function AdminTradesPage() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") redirect("/login");

  const trades = await db.tradeOrder.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      asset: { select: { symbol: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  const totalVolume = trades.reduce((s, t) => s + Number(t.total), 0);
  const buys = trades.filter((t) => t.side === "BUY").length;
  const sells = trades.filter((t) => t.side === "SELL").length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Trade Orders</h1>
        <p className="text-sm text-slate-500 mt-0.5">All trade orders and execution history across the platform</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Orders", value: trades.length.toString(), icon: Activity, color: "text-sky-400" },
          { label: "Buy Orders", value: buys.toString(), icon: TrendingUp, color: "text-emerald-400" },
          { label: "Sell Orders", value: sells.toString(), icon: TrendingDown, color: "text-red-400" },
        ].map((card) => (
          <div key={card.label} className="glass-card rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <div>
              <div className="text-xs text-slate-500">{card.label}</div>
              <div className="text-xl font-bold text-white">{card.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <span className="text-sm font-semibold text-white">Recent {trades.length} Trades</span>
          <span className="text-xs text-slate-500 ml-3">Total volume: {formatCurrency(totalVolume)}</span>
        </div>

        {trades.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">No trades yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full premium-table">
              <thead>
                <tr className="border-b border-white/5">
                  {["User", "Asset", "Side", "Type", "Quantity", "Price", "Total", "Fee", "Status", "Date"].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-slate-500 px-4 py-3 uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trades.map((t) => (
                  <tr key={t.id} className="border-b border-white/5 hover:bg-white/2">
                    <td className="px-4 py-3">
                      <div className="text-sm text-white">{t.user?.name}</div>
                      <div className="text-xs text-slate-500">{t.user?.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-white">{t.asset?.symbol}</div>
                      <div className="text-xs text-slate-500">{t.asset?.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${t.side === "BUY" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                        {t.side}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{t.type}</td>
                    <td className="px-4 py-3 text-sm text-slate-300 font-mono">{Number(t.quantity).toFixed(6)}</td>
                    <td className="px-4 py-3 text-sm text-white">{formatCurrency(Number(t.price))}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-white">{formatCurrency(Number(t.total))}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{formatCurrency(Number(t.fee))}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getStatusBg(t.status)}`}>{t.status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDateTime(t.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
