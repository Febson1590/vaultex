import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { getMarketAssets } from "@/lib/coingecko";
import { formatCurrency, formatPercent, formatCompact } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Markets" };

export default async function MarketsPage() {
  const assets = await getMarketAssets();

  return (
    <div className="min-h-screen pt-28 pb-16 px-4 sm:px-6 lg:px-8 hero-bg">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10 text-center">
          <Badge className="mb-4 bg-sky-500/10 text-sky-400 border-sky-500/20 text-xs tracking-widest uppercase">Markets</Badge>
          <h1 className="text-4xl font-bold text-white mb-3">Market Overview</h1>
          <p className="text-slate-400">Latest prices and 24h performance for top digital assets · Refreshed every minute</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {assets.slice(0, 4).map((asset) => {
            const isUp = asset.change >= 0;
            return (
              <div key={asset.id} className="glass-card rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-sky-400">{asset.symbol}</span>
                  <span className={`text-xs font-medium ${isUp ? "text-emerald-400" : "text-red-400"}`}>
                    {formatPercent(asset.change)}
                  </span>
                </div>
                <div className="text-lg font-bold text-white">{formatCurrency(asset.price)}</div>
              </div>
            );
          })}
        </div>

        <Card className="glass-card border-0 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">All Assets</h2>
            <span className="text-xs text-slate-500">{assets.length} markets</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full premium-table">
              <thead>
                <tr className="border-b border-white/5">
                  {["#", "Asset", "Price", "24h Change", "Market Cap", "Volume 24h", "Supply"].map((h, i) => (
                    <th
                      key={h}
                      className={`text-left text-xs font-medium text-slate-500 px-6 py-4 uppercase tracking-widest ${i > 3 ? "hidden md:table-cell" : ""} ${i === 6 ? "hidden lg:table-cell" : ""} ${i >= 2 ? "text-right" : ""}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => {
                  const isUp = asset.change >= 0;
                  return (
                    <tr key={asset.id} className="border-b border-white/5 hover:bg-sky-500/2 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-500">{asset.rank}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-sky-400">{asset.symbol.slice(0, 2)}</span>
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-white">{asset.name}</div>
                            <div className="text-xs text-slate-500">{asset.symbol}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-bold text-white">{formatCurrency(asset.price)}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md ${isUp ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                          {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                          {formatPercent(asset.change)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-slate-400 hidden md:table-cell">
                        ${formatCompact(asset.marketCap)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-slate-400 hidden md:table-cell">
                        ${formatCompact(asset.volume24h)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-slate-400 hidden lg:table-cell">
                        {formatCompact(asset.supply)} {asset.symbol}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
