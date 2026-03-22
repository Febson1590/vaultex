"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { placeTrade, getMarketAssets } from "@/lib/actions/trade";
import { formatCurrency, formatPercent, getStatusBg } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  quantity: z.number().positive("Must be positive"),
});

type FormData = z.infer<typeof schema>;

export default function TradePage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const quantity = watch("quantity");
  const total = selectedAsset && quantity ? Number(selectedAsset.currentPrice) * quantity : 0;
  const fee = total * 0.001;

  useEffect(() => {
    getMarketAssets().then((data) => {
      setAssets(data);
      if (data.length > 0) setSelectedAsset(data[0]);
    });
  }, []);

  const onSubmit = async (data: FormData) => {
    if (!selectedAsset) return;
    setLoading(true);
    try {
      const result = await placeTrade({ assetId: selectedAsset.id, side, quantity: data.quantity });
      if (result?.error) {
        toast.error(result.error);
      } else {
        setSuccess(true);
        toast.success(`${side} order for ${data.quantity} ${selectedAsset.symbol} executed!`);
        reset();
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch {
      toast.error("Trade failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Trade</h1>
        <p className="text-sm text-slate-500 mt-0.5">Execute buy and sell orders at real-time market prices</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Asset selector */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/5">
              <h2 className="text-sm font-semibold text-white">Select Asset</h2>
            </div>
            <div className="divide-y divide-white/5 max-h-96 overflow-y-auto">
              {assets.map((asset) => {
                const change = Number(asset.priceChange24h);
                const isUp = change >= 0;
                const selected = selectedAsset?.id === asset.id;
                return (
                  <button
                    key={asset.id}
                    onClick={() => setSelectedAsset(asset)}
                    className={`w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors ${selected ? "bg-sky-500/10" : "hover:bg-white/3"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-xs font-bold text-sky-400 flex-shrink-0">
                        {asset.symbol.slice(0, 2)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">{asset.name}</div>
                        <div className="text-xs text-slate-500">{asset.symbol}/USD</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-white">{formatCurrency(Number(asset.currentPrice))}</div>
                      <div className={`text-xs font-medium flex items-center gap-0.5 justify-end ${isUp ? "text-emerald-400" : "text-red-400"}`}>
                        {isUp ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                        {formatPercent(change)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Trade panel */}
        <div className="space-y-4">
          {selectedAsset && (
            <>
              {/* Asset info */}
              <div className="glass-card rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sm font-bold text-sky-400">
                    {selectedAsset.symbol.slice(0, 2)}
                  </div>
                  <div>
                    <div className="font-bold text-white">{selectedAsset.name}</div>
                    <div className="text-xs text-slate-500">{selectedAsset.symbol}/USD</div>
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  {formatCurrency(Number(selectedAsset.currentPrice))}
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium ${Number(selectedAsset.priceChange24h) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {Number(selectedAsset.priceChange24h) >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {formatPercent(Number(selectedAsset.priceChange24h))} today
                </div>
              </div>

              {/* Order form */}
              <Card className="glass-card border-0 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-white mb-4">Place Order</h2>

                {/* Buy/Sell toggle */}
                <div className="flex rounded-lg overflow-hidden border border-white/10 mb-5">
                  <button
                    onClick={() => setSide("BUY")}
                    className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${side === "BUY" ? "bg-emerald-500 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
                  >
                    BUY
                  </button>
                  <button
                    onClick={() => setSide("SELL")}
                    className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${side === "SELL" ? "bg-red-500 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
                  >
                    SELL
                  </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400 uppercase tracking-widest">Quantity ({selectedAsset.symbol})</Label>
                    <Input
                      {...register("quantity", { valueAsNumber: true })}
                      type="number"
                      step="0.000001"
                      placeholder="0.00000000"
                      className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-11 font-mono"
                    />
                    {errors.quantity && <p className="text-xs text-red-400">{errors.quantity.message}</p>}
                  </div>

                  {quantity > 0 && (
                    <div className="space-y-2 p-3 bg-white/3 rounded-lg text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Price</span>
                        <span>{formatCurrency(Number(selectedAsset.currentPrice))}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Subtotal</span>
                        <span>{formatCurrency(total)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Fee (0.1%)</span>
                        <span>{formatCurrency(fee)}</span>
                      </div>
                      <div className="flex justify-between text-white font-semibold border-t border-white/10 pt-2">
                        <span>Total</span>
                        <span>{formatCurrency(total + (side === "BUY" ? fee : -fee))}</span>
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading || success}
                    className={`w-full h-11 font-semibold text-white transition-all ${side === "BUY" ? "bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/25" : "bg-red-500 hover:bg-red-400 shadow-red-500/25"} shadow-lg`}
                  >
                    {loading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                    ) : success ? (
                      <><CheckCircle className="mr-2 h-4 w-4" /> Order Filled!</>
                    ) : (
                      `${side} ${selectedAsset.symbol}`
                    )}
                  </Button>
                </form>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
