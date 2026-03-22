"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminUpdateMarketAsset } from "@/lib/actions/admin";
import { formatCurrency, formatCompact } from "@/lib/utils";
import { TrendingUp, TrendingDown, Loader2, Save, BarChart3 } from "lucide-react";
import { toast } from "sonner";

export default function AdminMarketsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, { price: string; change: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const fetchAssets = () => {
    fetch("/api/admin/markets")
      .then((r) => r.json())
      .then((data) => {
        setAssets(data);
        const initEdits: Record<string, { price: string; change: string }> = {};
        data.forEach((a: any) => {
          initEdits[a.id] = {
            price: Number(a.currentPrice).toString(),
            change: Number(a.priceChange24h).toString(),
          };
        });
        setEditing(initEdits);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAssets(); }, []);

  const handleSave = async (id: string) => {
    const e = editing[id];
    if (!e) return;
    const price = parseFloat(e.price);
    const change = parseFloat(e.change);
    if (isNaN(price) || price <= 0) return toast.error("Enter a valid price");
    setSaving(id);
    const result = await adminUpdateMarketAsset(id, { currentPrice: price, priceChange24h: change });
    if (result?.success) toast.success("Asset updated");
    else toast.error("Failed to update");
    setSaving(null);
    fetchAssets();
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    setSaving(id);
    await adminUpdateMarketAsset(id, { isActive: !isActive });
    toast.success(isActive ? "Asset hidden" : "Asset activated");
    setSaving(null);
    fetchAssets();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Market Data</h1>
        <p className="text-sm text-slate-500 mt-0.5">Control simulated asset prices and market data</p>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-sky-400" />
          <span className="text-sm font-semibold text-white">{assets.length} Assets</span>
          <span className="text-xs text-slate-500 ml-2">Edit price and 24h change, then click Save</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full premium-table">
              <thead>
                <tr className="border-b border-white/5">
                  {["#", "Asset", "Current Price", "24h Change %", "Market Cap", "Volume 24h", "Active", "Actions"].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-slate-500 px-4 py-3 uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => {
                  const change = Number(asset.priceChange24h);
                  const e = editing[asset.id] || { price: "", change: "" };
                  return (
                    <tr key={asset.id} className="border-b border-white/5 hover:bg-white/2">
                      <td className="px-4 py-3 text-xs text-slate-500">{asset.rank}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-xs font-bold text-sky-400">
                            {asset.symbol.slice(0, 2)}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-white">{asset.name}</div>
                            <div className="text-xs text-slate-500">{asset.symbol}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number" step="0.000001"
                          value={e.price}
                          onChange={(ev) => setEditing((p) => ({ ...p, [asset.id]: { ...p[asset.id], price: ev.target.value } }))}
                          className="bg-white/5 border-white/10 text-white h-8 text-xs w-32 font-mono"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Input
                            type="number" step="0.01"
                            value={e.change}
                            onChange={(ev) => setEditing((p) => ({ ...p, [asset.id]: { ...p[asset.id], change: ev.target.value } }))}
                            className={`bg-white/5 border-white/10 h-8 text-xs w-24 font-mono ${parseFloat(e.change) >= 0 ? "text-emerald-400" : "text-red-400"}`}
                          />
                          <span className="text-xs text-slate-500">%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400">{asset.marketCap ? formatCompact(Number(asset.marketCap)) : "—"}</td>
                      <td className="px-4 py-3 text-sm text-slate-400">{asset.volume24h ? formatCompact(Number(asset.volume24h)) : "—"}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleActive(asset.id, asset.isActive)}
                          disabled={saving === asset.id}
                          className={`w-10 h-5 rounded-full relative transition-colors ${asset.isActive ? "bg-emerald-500" : "bg-slate-600"}`}
                        >
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${asset.isActive ? "translate-x-5" : "translate-x-0.5"}`} />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          disabled={saving === asset.id}
                          onClick={() => handleSave(asset.id)}
                          className="bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 h-7 px-3 text-xs"
                        >
                          {saving === asset.id ? <Loader2 size={11} className="animate-spin" /> : <><Save size={11} className="mr-1" />Save</>}
                        </Button>
                      </td>
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
