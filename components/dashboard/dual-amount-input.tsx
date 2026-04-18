"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock } from "lucide-react";

/* ───────────────────────────────────────────────────────────────────────
   Shared live-rate hook
   Used by both the Deposit and Withdraw forms to keep the dual USD/crypto
   amount inputs in sync with server-side rates. Polls /api/rates every
   45 s so the rate stays fresh while the user is on the page.
─────────────────────────────────────────────────────────────────────── */

export type Rates = Record<string, number>;

export function useLiveRates(initialRates: Rates) {
  const [rates, setRates] = useState<Rates>(initialRates);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const res  = await fetch("/api/rates", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as Rates;
        if (!cancelled && data && typeof data === "object") {
          setRates((prev) => ({ ...prev, ...data }));
        }
      } catch {
        /* silent — static rates still work */
      }
    }

    // Refresh immediately on mount (server-rendered rates can be cached up
    // to 60 s by CoinGecko), then every 45 s thereafter.
    refresh();
    const t = setInterval(refresh, 45_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  return rates;
}

/* ───────────────────────────────────────────────────────────────────────
   Amount formatting helpers
   USD always uses 2 decimals in display; crypto uses up to 8 to preserve
   precision on assets like BTC (0.00012345) without trailing zeros.
─────────────────────────────────────────────────────────────────────── */

export function formatUsd(n: number): string {
  if (!isFinite(n) || n === 0) return "";
  return n.toFixed(2);
}

export function formatCrypto(n: number): string {
  if (!isFinite(n) || n === 0) return "";
  // Pick a sensible decimal count based on magnitude so the output never
  // looks like "0.00000000" or "123456.12345678" — both of which are ugly.
  const abs = Math.abs(n);
  const dp  = abs >= 1000 ? 4 : abs >= 1 ? 6 : 8;
  const s   = n.toFixed(dp);
  // Trim trailing zeros but keep at least 2 dp so "0.10" stays valid.
  return s.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, ".00");
}

/* ───────────────────────────────────────────────────────────────────────
   Dual-input state hook
   Accepts the currently selected crypto + current rates + current active
   rate, and returns {usd, crypto, setUsd, setCrypto, setFromUsd,
   setFromCrypto, activeField}. Either side wins input-priority depending
   on which field was last typed in — the *other* side is recalculated
   each time the rate or asset changes.
─────────────────────────────────────────────────────────────────────── */

export type ActiveField = "usd" | "crypto" | null;

export interface DualAmountState {
  usd:            string;
  crypto:         string;
  activeField:    ActiveField;
  setUsd:         (v: string) => void;
  setCrypto:      (v: string) => void;
  /** Set both directly (used by Max buttons). */
  setBoth:        (usd: number, crypto: number) => void;
  /** Clear both. */
  clear:          () => void;
  /** Parsed numeric values — always fresh regardless of activeField. */
  usdNumber:      number;
  cryptoNumber:   number;
}

export function useDualAmount(rate: number): DualAmountState {
  const [usd,         setUsdStr]    = useState("");
  const [crypto,      setCryptoStr] = useState("");
  const [activeField, setActiveField] = useState<ActiveField>(null);
  const rateRef  = useRef(rate);

  /* When the rate or selected asset changes, recompute the *inactive* side
     using whichever side was last edited. This also runs on first load. */
  useEffect(() => {
    rateRef.current = rate;
    if (!rate || rate <= 0) return;

    if (activeField === "usd") {
      const u = parseFloat(usd);
      if (isFinite(u) && u > 0) {
        setCryptoStr(formatCrypto(u / rate));
      } else {
        setCryptoStr("");
      }
    } else if (activeField === "crypto") {
      const c = parseFloat(crypto);
      if (isFinite(c) && c > 0) {
        setUsdStr(formatUsd(c * rate));
      } else {
        setUsdStr("");
      }
    }
    // intentionally not depending on `usd` / `crypto` — this effect only
    // fires when the rate actually changes; live edits are handled inline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rate]);

  const setUsd = useCallback((v: string) => {
    setActiveField("usd");
    setUsdStr(v);
    const n = parseFloat(v);
    const r = rateRef.current;
    if (isFinite(n) && n > 0 && r > 0) setCryptoStr(formatCrypto(n / r));
    else setCryptoStr("");
  }, []);

  const setCrypto = useCallback((v: string) => {
    setActiveField("crypto");
    setCryptoStr(v);
    const n = parseFloat(v);
    const r = rateRef.current;
    if (isFinite(n) && n > 0 && r > 0) setUsdStr(formatUsd(n * r));
    else setUsdStr("");
  }, []);

  const setBoth = useCallback((u: number, c: number) => {
    setActiveField("usd");
    setUsdStr(formatUsd(u));
    setCryptoStr(formatCrypto(c));
  }, []);

  const clear = useCallback(() => {
    setActiveField(null);
    setUsdStr("");
    setCryptoStr("");
  }, []);

  return {
    usd,
    crypto,
    activeField,
    setUsd,
    setCrypto,
    setBoth,
    clear,
    usdNumber:    parseFloat(usd)    || 0,
    cryptoNumber: parseFloat(crypto) || 0,
  };
}

/* ───────────────────────────────────────────────────────────────────────
   Visual UI component — the paired USD + crypto inputs, a linked-badge,
   and a rate footer. Controlled via the state returned by useDualAmount.
─────────────────────────────────────────────────────────────────────── */

interface Props {
  asset:       string;          // "BTC"
  rate:        number;          // USD per 1 unit of asset
  state:       DualAmountState;
  /** Optional button rendered to the right of the USD label (e.g. Max). */
  usdRightAction?: React.ReactNode;
  /** Min/max hints shown below the inputs. */
  minUsd?:     number;
  maxUsd?:     number | null;
  /** "Amount to Deposit" / "Withdraw Amount" — customises the labels. */
  titlePrefix?: string;
  helperText?: string;
  rateStale?:  boolean;
}

export function DualAmountInput({
  asset,
  rate,
  state,
  usdRightAction,
  minUsd,
  maxUsd,
  titlePrefix = "Amount",
  helperText = "You can enter either the USD amount or the crypto amount — the other field stays in sync.",
  rateStale = false,
}: Props) {
  return (
    <div className="space-y-3">
      {/* USD input */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
            {titlePrefix} (USD)
          </Label>
          {usdRightAction}
        </div>
        <div className="relative">
          <Input
            type="number"
            inputMode="decimal"
            step="0.01"
            min={minUsd}
            max={maxUsd ?? undefined}
            placeholder="0.00"
            value={state.usd}
            onChange={(e) => state.setUsd(e.target.value)}
            className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-600 h-12 pr-16 text-base font-semibold tabular-nums"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-slate-500 font-medium pointer-events-none">
            | USD
          </span>
        </div>
      </div>

      {/* Crypto input */}
      <div className="space-y-1.5">
        <Label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
          {titlePrefix} ({asset})
        </Label>
        <div className="relative">
          <Input
            type="number"
            inputMode="decimal"
            step="0.00000001"
            placeholder="0.00000000"
            value={state.crypto}
            onChange={(e) => state.setCrypto(e.target.value)}
            className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-600 h-12 pr-20 text-base font-semibold tabular-nums"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-slate-500 font-medium pointer-events-none">
            | {asset}
          </span>
        </div>
      </div>

      {/* Live rate + helper + min/max */}
      <div className="flex items-start justify-between gap-3 flex-wrap pt-0.5">
        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
          <Clock size={10} className={rateStale ? "text-amber-400" : "text-emerald-400"} />
          <span>
            1 {asset} ={" "}
            <span className="text-slate-300 tabular-nums font-medium">
              {rate > 0
                ? `$${rate.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
                : "—"}
            </span>
          </span>
        </div>
        <div className="text-[11px] text-slate-500 text-right">
          {minUsd !== undefined && <span>Min: ${minUsd}</span>}
          {maxUsd ? <span> · Max: ${maxUsd}</span> : null}
        </div>
      </div>

      <p className="text-[11px] text-slate-500 leading-relaxed pt-0.5">
        {helperText}
      </p>
    </div>
  );
}
