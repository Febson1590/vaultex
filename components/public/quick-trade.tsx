"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import type { MarketAsset } from "@/lib/coingecko";

type OrderType = "limit" | "market" | "stop";
type OrderSide = "buy"   | "sell";

interface QuickTradeProps {
  /** Assets to expose in the pair selector (first one is default). */
  assets:    MarketAsset[];
  /** Optional default selected symbol. */
  defaultSymbol?: string;
  /** When true, renders without the outer vx-panel wrapper — used when
   *  the component is embedded inside another panel (e.g. the trade terminal). */
  embedded?: boolean;
  className?: string;
}

/**
 * Compact exchange-style order form.
 *
 * Displays limit / market / stop tabs, price + amount + total inputs,
 * and buy/sell action buttons. Functions as a layout-complete preview:
 * actual submission routes to /register (sign-in gate) because order
 * execution requires an authenticated account.
 */
export function QuickTrade({ assets, defaultSymbol = "BTC", embedded = false, className }: QuickTradeProps) {
  const tradable = useMemo(
    () => assets.filter((a) => a.symbol !== "USDT"),
    [assets]
  );

  const [symbol, setSymbol] = useState<string>(defaultSymbol);
  const [side,   setSide]   = useState<OrderSide>("buy");
  const [type,   setType]   = useState<OrderType>("limit");
  const [price,  setPrice]  = useState<string>("");
  const [amount, setAmount] = useState<string>("");

  const asset = useMemo(
    () => tradable.find((a) => a.symbol === symbol) ?? tradable[0],
    [tradable, symbol]
  );

  /* Keep the price input aligned to the active asset when switching. */
  const effectivePrice = type === "market"
    ? asset?.price ?? 0
    : parseFloat(price) || asset?.price || 0;

  const effectiveAmount = parseFloat(amount) || 0;
  const total = effectivePrice * effectiveAmount;

  function onSymbolChange(next: string) {
    setSymbol(next);
    setPrice("");
  }

  function fillPct(pct: number) {
    if (!asset) return;
    /* Display-only: assume a 1.0 unit max so the buttons do something
       visible in the input without pretending to know a real balance. */
    const max = 1;
    const next = ((max * pct) / 100).toFixed(4);
    setAmount(next);
  }

  const wrapperClass = embedded
    ? `relative ${className ?? ""}`
    : `vx-panel ${className ?? ""}`;

  return (
    <div className={wrapperClass}>
      <div
        className={embedded ? "px-3.5 h-10 flex items-center justify-between border-b border-white/[0.05]" : "vx-panel-header"}
      >
        <div className="vx-panel-title">
          <span className="vx-panel-title-dot" />
          {embedded ? "Order Form" : "Quick Trade"}
        </div>
        <div className="text-[10px] text-slate-600 uppercase tracking-widest">
          Spot
        </div>
      </div>

      {/* ── Pair selector + side tabs ─────────────────────────────────── */}
      <div className="px-3.5 pt-3 pb-2.5 flex items-center gap-2">
        <select
          value={symbol}
          onChange={(e) => onSymbolChange(e.target.value)}
          className="h-8 pl-2 pr-7 text-[12px] font-semibold text-white bg-[#06101e] border border-white/[0.08] rounded-md focus:outline-none focus:border-sky-500/50 cursor-pointer [&>option]:bg-[#0a1628]"
          aria-label="Select pair"
        >
          {tradable.map((a) => (
            <option key={a.symbol} value={a.symbol}>
              {a.symbol} / USD
            </option>
          ))}
        </select>

        <div className="vx-tabs ml-auto">
          <button
            type="button"
            className="vx-tab"
            data-active={side === "buy"}
            onClick={() => setSide("buy")}
            style={side === "buy" ? { color: "#34d399" } : undefined}
          >
            Buy
          </button>
          <button
            type="button"
            className="vx-tab"
            data-active={side === "sell"}
            onClick={() => setSide("sell")}
            style={side === "sell" ? { color: "#f87171" } : undefined}
          >
            Sell
          </button>
        </div>
      </div>

      {/* ── Order type tabs ───────────────────────────────────────────── */}
      <div className="px-3.5 pb-3 flex items-center gap-2">
        <div className="vx-tabs">
          {(["limit", "market", "stop"] as const).map((t) => (
            <button
              key={t}
              type="button"
              className="vx-tab"
              data-active={type === t}
              onClick={() => setType(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div className="ml-auto text-[10px] text-slate-500 tabular-nums">
          Mark: <span className="text-slate-300 font-semibold">{formatCurrency(asset?.price ?? 0)}</span>
        </div>
      </div>

      {/* ── Form body ─────────────────────────────────────────────────── */}
      <div className="px-3.5 pb-4 space-y-2">
        {/* Price row */}
        <Field label="Price" suffix="USD">
          <input
            type="text"
            inputMode="decimal"
            disabled={type === "market"}
            placeholder={type === "market" ? "Market" : (asset?.price ?? 0).toFixed(2)}
            value={type === "market" ? "" : price}
            onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))}
            className="w-full bg-transparent text-[13px] text-white font-semibold tabular-nums focus:outline-none placeholder:text-slate-600 disabled:text-slate-500"
          />
        </Field>

        {/* Amount row */}
        <Field label="Amount" suffix={asset?.symbol ?? ""}>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.00000"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            className="w-full bg-transparent text-[13px] text-white font-semibold tabular-nums focus:outline-none placeholder:text-slate-600"
          />
        </Field>

        {/* Percentage quick-fill */}
        <div className="flex items-center gap-1 pt-0.5">
          {[25, 50, 75, 100].map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => fillPct(pct)}
              className="flex-1 h-7 rounded-md text-[10px] font-semibold text-slate-400 hover:text-white bg-white/[0.03] hover:bg-sky-500/[0.10] border border-white/[0.06] hover:border-sky-500/30 transition-all duration-150"
            >
              {pct}%
            </button>
          ))}
        </div>

        {/* Total row */}
        <div className="flex items-center justify-between px-3 py-2.5 rounded-md bg-white/[0.02] border border-white/[0.06]">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Total</span>
          <span className="text-[13px] text-white font-semibold tabular-nums">
            {formatCurrency(total)}
          </span>
        </div>

        {/* Available balance row */}
        <div className="flex items-center justify-between text-[10px] text-slate-600">
          <span>Available</span>
          <Link href="/login" className="text-sky-400 hover:text-sky-300 transition-colors">
            Sign in to view
          </Link>
        </div>
      </div>

      {/* ── Action button ─────────────────────────────────────────────── */}
      <div className="px-3.5 pb-4">
        <Link
          href="/register"
          className={`w-full h-11 rounded-lg text-[13px] font-bold tracking-wide flex items-center justify-center ${
            side === "buy" ? "vx-btn-buy" : "vx-btn-sell"
          }`}
        >
          {side === "buy" ? "BUY" : "SELL"} {asset?.symbol}
        </Link>
        <p className="text-[10px] text-slate-600 text-center mt-2">
          Sign in or create an account to place orders.
        </p>
      </div>
    </div>
  );
}

/* ── Form field with label + suffix ─────────────────────────────────── */
function Field({
  label,
  suffix,
  children,
}: {
  label:  string;
  suffix: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-3 h-11 rounded-md bg-[#06101e] border border-white/[0.08] focus-within:border-sky-500/50 transition-colors">
      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold w-12 flex-shrink-0">
        {label}
      </span>
      <div className="flex-1 min-w-0">{children}</div>
      <span className="text-[10px] text-slate-500 font-semibold flex-shrink-0">{suffix}</span>
    </div>
  );
}
