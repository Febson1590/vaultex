"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { requestWithdrawal } from "@/lib/actions/deposits";
import {
  Loader2, CheckCircle2, AlertTriangle, ArrowLeft,
  Clipboard, ArrowUpFromLine, Clock, Hourglass, XCircle, X,
} from "lucide-react";
import { toast } from "sonner";
import { KycBanner } from "@/components/dashboard/kyc-banner";
import type { KycStatus } from "@/lib/kyc";
import {
  DualAmountInput, useDualAmount, useLiveRates, formatCrypto, formatUsd,
  type Rates,
} from "@/components/dashboard/dual-amount-input";

/* ─── Types ──────────────────────────────────────────────────────────── */

interface RecentWithdrawal {
  id:            string;
  currency:      string;
  amount:        number;              // USD
  method:        string;              // network
  destination:   string | null;
  status:        string;              // PENDING | APPROVED | REJECTED | PROCESSING
  adminNotes:    string | null;
  cryptoAmount:  number | null;
  cryptoSymbol:  string | null;
  cryptoNetwork: string | null;
  exchangeRate:  number | null;
  createdAt:     string;
  processedAt:   string | null;
}

interface Props {
  kycStatus?:     KycStatus;
  usdBalance?:    number;            // Available USD balance (primary source of truth)
  minWithdrawal?: number;            // USD
  maxWithdrawal?: number | null;     // USD
  feePercent?:    number;
  feeFixed?:      number;            // USD fee
  recent?:        RecentWithdrawal[];
  initialRates?:  Rates;
}

/* ─── 4-state UI status ──────────────────────────────────────────────── */

type UiStatus = "pending" | "processing" | "completed" | "rejected";

function deriveUiStatus(status: string): UiStatus {
  if (status === "APPROVED")   return "completed";
  if (status === "REJECTED")   return "rejected";
  if (status === "PROCESSING") return "processing";
  return "pending";
}

const STATUS_META: Record<UiStatus, {
  label: string;
  color: string;
  bg:    string;
  border: string;
  Icon:  typeof Clock;
}> = {
  pending:    { label: "Pending",    color: "text-amber-300",   bg: "bg-amber-500/10",   border: "border-amber-500/25",   Icon: Clock       },
  processing: { label: "Processing", color: "text-sky-300",     bg: "bg-sky-500/10",     border: "border-sky-500/25",     Icon: Hourglass   },
  completed:  { label: "Completed",  color: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/25", Icon: CheckCircle2 },
  rejected:   { label: "Rejected",   color: "text-red-300",     bg: "bg-red-500/10",     border: "border-red-500/25",     Icon: XCircle     },
};

/* ─── Asset catalog ──────────────────────────────────────────────────── */

const ASSET_META: Record<string, { color: string; mono: string }> = {
  BTC:  { color: "#f7931a", mono: "₿" },
  ETH:  { color: "#627eea", mono: "Ξ" },
  USDT: { color: "#26a17b", mono: "₮" },
  BNB:  { color: "#f3ba2f", mono: "B" },
  SOL:  { color: "#9945ff", mono: "◎" },
  USD:  { color: "#64748b", mono: "$" },
};

/** Which networks a given asset can be withdrawn on. */
const ASSET_NETWORKS: Record<string, string[]> = {
  BTC:  ["Bitcoin"],
  ETH:  ["ERC20"],
  USDT: ["TRC20", "ERC20", "BEP20"],
  BNB:  ["BEP20"],
  SOL:  ["Solana"],
};

/** Assets the user can withdraw. */
const SUPPORTED_ASSETS = ["BTC", "ETH", "USDT", "BNB", "SOL"];

/* ─── Helpers ────────────────────────────────────────────────────────── */

function shortAddress(addr: string, head = 10, tail = 6): string {
  if (!addr) return "";
  if (addr.length <= head + tail + 3) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

function timeShort(iso: string): string {
  const d    = new Date(iso);
  const now  = new Date();
  const same = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (same) return `Today at ${time}`;
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at ${time}`;
}

function AssetIcon({ asset, size = 32 }: { asset: string; size?: number }) {
  const meta = ASSET_META[asset] ?? { color: "#64748b", mono: asset.slice(0, 1) };
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 text-sm font-black"
      style={{
        width:      size,
        height:     size,
        background: `${meta.color}1f`,
        border:     `1px solid ${meta.color}55`,
        color:      meta.color,
      }}
    >
      {meta.mono}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Main component
═══════════════════════════════════════════════════════════════════════ */

export default function WithdrawForm({
  kycStatus     = "approved",
  usdBalance    = 0,
  minWithdrawal = 10,
  maxWithdrawal,
  feePercent    = 0,
  feeFixed      = 0,
  recent        = [],
  initialRates  = {},
}: Props) {
  const isRestricted = kycStatus !== "approved";

  /* Live rates — refreshed every 45s via /api/rates. */
  const rates = useLiveRates(initialRates);

  const [selectedAsset, setSelectedAsset] = useState<string>(SUPPORTED_ASSETS[0]);
  const availableNetworks = ASSET_NETWORKS[selectedAsset] ?? [];
  const [network, setNetwork]   = useState<string>(availableNetworks[0] ?? "");
  const [address, setAddress]   = useState("");
  const [error, setError]       = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  /* "review" — read-only summary, primary action is "Confirm" which
     fires the OTP email. "otp" — the user types the 6-digit code we
     just emailed; primary action becomes "Verify & Withdraw". */
  const [confirmStep, setConfirmStep] = useState<"review" | "otp">("review");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");

  /* Current live rate for the selected asset (USD per 1 unit). */
  const currentRate = rates[selectedAsset] ?? 0;
  const dual        = useDualAmount(currentRate);

  /* Balance, shown in both USD and the selected crypto. */
  const cryptoBalance = useMemo(() => {
    if (!currentRate || currentRate <= 0) return 0;
    return usdBalance / currentRate;
  }, [usdBalance, currentRate]);

  /* Reset network when asset changes. */
  function pickAsset(a: string) {
    setSelectedAsset(a);
    const nets = ASSET_NETWORKS[a] ?? [];
    setNetwork(nets[0] ?? "");
    setError("");
  }

  /* Withdrawal fee is shown separately as an informational charge.
     It is NOT subtracted from the user's requested withdrawal amount —
     the amount the user types is the amount they receive. */
  const usdAmount  = dual.usdNumber;
  const feeUsd     = (usdAmount * feePercent) / 100 + feeFixed;
  // "You will receive" equals the full requested amount. The fee is a
  // separate disclosure line — see comment above.
  const netReceiveUsd = usdAmount;

  /** Fill both inputs with the full USD balance + its crypto equivalent. */
  function setMaxAmount() {
    if (usdBalance <= 0 || currentRate <= 0) return;
    dual.setBoth(usdBalance, usdBalance / currentRate);
  }

  async function pasteAddress() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setAddress(text.trim());
        toast.success("Pasted from clipboard");
      }
    } catch {
      toast.error("Could not access clipboard");
    }
  }

  /* Validate + open confirm modal. */
  function handleReview() {
    setError("");
    if (isRestricted) { setError("Complete identity verification first"); return; }
    if (!SUPPORTED_ASSETS.includes(selectedAsset)) { setError("Select a cryptocurrency"); return; }
    if (availableNetworks.length > 0 && !network) { setError("Select a network"); return; }
    if (currentRate <= 0) { setError("Rates are unavailable — try again in a moment"); return; }
    if (!usdAmount || usdAmount <= 0) { setError("Enter a valid amount"); return; }
    if (usdAmount < minWithdrawal) { setError(`Minimum withdrawal is $${minWithdrawal}`); return; }
    if (maxWithdrawal && usdAmount > maxWithdrawal) { setError(`Maximum withdrawal is $${maxWithdrawal}`); return; }
    if (usdAmount > usdBalance) { setError(`Insufficient balance — you have $${usdBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`); return; }
    if (!address || address.trim().length < 6) { setError("Enter a valid wallet address"); return; }
    setShowConfirm(true);
  }

  /* Build the request payload once — reused for the OTP-trigger call
     and the OTP-confirm call so the two requests stay in sync. The
     server re-validates the payload on the confirm call, so changing
     anything between the two calls would be rejected. */
  function buildWithdrawPayload(otpCode?: string) {
    return {
      currency:      selectedAsset,
      amount:        usdAmount,
      method:        network || selectedAsset,
      destination:   address.trim(),
      cryptoAmount:  dual.cryptoNumber,
      cryptoSymbol:  selectedAsset,
      cryptoNetwork: network || null,
      exchangeRate:  currentRate,
      otp:           otpCode,
    };
  }

  function closeConfirm() {
    if (submitting) return;
    setShowConfirm(false);
    setConfirmStep("review");
    setOtp("");
    setOtpError("");
  }

  /* Step 1: user clicked "Confirm" in the review view.
     Server validates everything, sends a 6-digit OTP, returns
     { otpRequired: true }. We then flip the modal into "otp" mode. */
  async function handleConfirm() {
    setSubmitting(true);
    try {
      const res = await requestWithdrawal(buildWithdrawPayload());
      if ("error" in res && res.error) {
        toast.error(res.error);
        setError(res.error);
        setShowConfirm(false);
      } else if ("otpRequired" in res && res.otpRequired) {
        setConfirmStep("otp");
        setOtp("");
        setOtpError("");
        toast.success("We sent a 6-digit code to your email");
      } else {
        // Defensive fallback — server always asks for OTP now, but if
        // a future change makes OTP optional we still complete cleanly.
        toast.success("Withdrawal submitted — pending review");
        closeConfirm();
        dual.clear();
        setAddress("");
      }
    } catch {
      toast.error("Failed to start withdrawal. Please try again.");
      setShowConfirm(false);
    } finally {
      setSubmitting(false);
    }
  }

  /* Step 2: user typed the OTP and clicked "Verify & Withdraw". */
  async function handleVerifyOtp() {
    setOtpError("");
    if (otp.trim().length !== 6) {
      setOtpError("Enter the 6-digit code from your email");
      return;
    }
    setSubmitting(true);
    try {
      const res = await requestWithdrawal(buildWithdrawPayload(otp.trim()));
      if ("error" in res && res.error) {
        setOtpError(res.error);
        toast.error(res.error);
      } else if ("success" in res && res.success) {
        toast.success("Withdrawal submitted — pending review");
        closeConfirm();
        dual.clear();
        setAddress("");
      } else {
        // Server still asking for OTP after a verify? Shouldn't happen.
        setOtpError("Could not verify the code. Please request a new one.");
      }
    } catch {
      setOtpError("Verification failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  /* User asks for a fresh OTP. Re-fires the trigger call (without otp)
     so sendOtp invalidates any prior code and emails a new one. */
  async function handleResendOtp() {
    setSubmitting(true);
    setOtpError("");
    try {
      const res = await requestWithdrawal(buildWithdrawPayload());
      if ("error" in res && res.error) {
        setOtpError(res.error);
        toast.error(res.error);
      } else {
        toast.success("New code sent");
      }
    } catch {
      setOtpError("Could not resend the code. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="space-y-5 max-w-2xl mx-auto pb-16">

      {/* ── Back + header ───────────────────────────────────────── */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-3"
        >
          <ArrowLeft size={14} />
          Back
        </Link>
        <h1 className="text-2xl font-bold text-white">Withdraw Funds</h1>
        <p className="text-sm text-slate-500 mt-1">
          Withdraw crypto to your external wallet.
        </p>
      </div>

      {/* ── KYC banner ──────────────────────────────────────────── */}
      {isRestricted && <KycBanner kycStatus={kycStatus} />}

      {/* ── Withdraw card ───────────────────────────────────────── */}
      <Card className="glass-card border-0 rounded-2xl p-5 sm:p-6 space-y-5">

        {/* Select Crypto — chips */}
        <div className="space-y-2">
          <Label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
            Select Cryptocurrency
          </Label>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
            {SUPPORTED_ASSETS.map((asset) => {
              const isActive = selectedAsset === asset;
              const r        = rates[asset] ?? 0;
              return (
                <button
                  key={asset}
                  type="button"
                  onClick={() => pickAsset(asset)}
                  className={`
                    flex-shrink-0 flex items-center gap-2 h-11 px-4 rounded-xl border transition-all
                    ${isActive
                      ? "border-sky-500/50 bg-sky-500/[0.08] shadow-[0_0_0_1px_rgba(14,165,233,0.2)]"
                      : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]"}
                  `}
                >
                  <AssetIcon asset={asset} size={26} />
                  <div className="flex flex-col items-start leading-tight">
                    <span className={`text-[13px] font-semibold ${isActive ? "text-white" : "text-slate-300"}`}>
                      {asset}
                    </span>
                    <span className="text-[9.5px] text-slate-500 tabular-nums">
                      {r > 0 ? `$${r.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "—"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Available balance — primary USD + secondary crypto */}
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              Available Balance
            </div>
            <div className="text-[17px] font-bold text-white tabular-nums mt-0.5">
              ${usdBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
              <span className="text-[13px] font-medium text-slate-400">USD</span>
            </div>
            {currentRate > 0 && (
              <div className="text-[11.5px] text-slate-500 tabular-nums mt-0.5">
                ≈ {formatCrypto(cryptoBalance)} {selectedAsset}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={setMaxAmount}
            disabled={usdBalance <= 0 || currentRate <= 0}
            className="h-8 px-3 rounded-md text-[11px] font-bold uppercase tracking-wider bg-sky-500/15 border border-sky-500/30 text-sky-300 hover:bg-sky-500/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Max
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
            <AlertTriangle size={13} className="flex-shrink-0" /> {error}
          </div>
        )}

        {/* Dual amount — USD + crypto with live two-way sync */}
        <DualAmountInput
          asset={selectedAsset}
          rate={currentRate}
          state={dual}
          titlePrefix="Withdraw Amount"
          minUsd={minWithdrawal}
          maxUsd={maxWithdrawal ?? undefined}
          rateStale={currentRate <= 0}
        />

        {/* Fee breakdown — informational only; not deducted from payout */}
        {usdAmount > 0 && (feePercent > 0 || feeFixed > 0) && (
          <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-4 py-3 text-[12px]">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-400">Withdrawal Amount</span>
              <span className="text-white font-semibold tabular-nums">${formatUsd(usdAmount)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 mt-1.5">
              <span className="text-slate-400">Fee</span>
              <span className="text-slate-300 tabular-nums">${formatUsd(feeUsd)}</span>
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-white/[0.06] flex items-center justify-between gap-3">
              <span className="text-slate-300 font-medium">You&rsquo;ll receive</span>
              <span className="text-emerald-300 font-semibold tabular-nums text-[13px]">
                ${formatUsd(netReceiveUsd)}
              </span>
            </div>
            <p className="mt-2 text-[10.5px] text-slate-500 leading-relaxed">
              Withdrawal fee is charged separately and is not deducted from
              the requested withdrawal amount.
            </p>
          </div>
        )}

        {/* Wallet address */}
        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
            {selectedAsset} Wallet Address
          </Label>
          <div className="flex items-stretch gap-2">
            <Input
              type="text"
              placeholder={`Paste your ${selectedAsset} address`}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="flex-1 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-600 h-11 font-mono text-[13px]"
            />
            <button
              type="button"
              onClick={pasteAddress}
              aria-label="Paste address"
              className="h-11 px-3 rounded-md bg-sky-500/10 border border-sky-500/25 flex items-center gap-1.5 text-sky-400 hover:bg-sky-500/20 transition-colors text-[11px] font-semibold uppercase tracking-wider"
            >
              <Clipboard size={13} />
              Paste
            </button>
          </div>
        </div>

        {/* Network */}
        {availableNetworks.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
              Network
            </Label>
            <Select value={network} onValueChange={(v) => v && setNetwork(v)}>
              <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0d1e3a] border-sky-500/20 text-white">
                {availableNetworks.map((n) => (
                  <SelectItem key={n} value={n} className="hover:bg-sky-500/10 focus:bg-sky-500/10">
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-[11px] text-slate-500">
              Make sure the receiving wallet supports{" "}
              <span className="text-slate-300 font-medium">{network}</span>.
            </div>
          </div>
        )}

        {/* Warning */}
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3.5 py-2.5 flex items-start gap-2.5">
          <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-[11.5px] text-amber-200/90 leading-relaxed">
            <strong className="text-amber-300">Withdrawals are irreversible.</strong>{" "}
            Double-check your address and network. Funds sent to the wrong address or
            network cannot be recovered.
          </div>
        </div>

        {/* Submit */}
        <Button
          onClick={handleReview}
          disabled={submitting || isRestricted}
          className="w-full h-12 bg-sky-500 hover:bg-sky-400 text-white font-semibold text-[14px]"
        >
          {isRestricted ? (
            "Verification Required"
          ) : (
            <><ArrowUpFromLine className="mr-2 h-4 w-4" /> Submit Withdrawal</>
          )}
        </Button>
      </Card>

      {/* ── Withdrawal history ──────────────────────────────────── */}
      {recent.length > 0 && (
        <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-4">
          <h2 className="text-[15px] font-bold text-white">Withdrawal History</h2>

          <div className="space-y-3">
            {recent.map((w) => (
              <WithdrawalCard key={w.id} w={w} />
            ))}
          </div>
        </div>
      )}

      {/* ── Footer note ─────────────────────────────────────────── */}
      <p className="text-[12px] text-slate-500 leading-relaxed px-2">
        Withdrawals are processed manually and may take 1–3 business days after approval.
      </p>

      {/* ── Confirm modal ───────────────────────────────────────── */}
      {showConfirm && (
        <ConfirmModal
          asset={selectedAsset}
          network={network}
          usdAmount={usdAmount}
          cryptoAmount={dual.cryptoNumber}
          exchangeRate={currentRate}
          feeUsd={feeUsd}
          netReceiveUsd={netReceiveUsd}
          address={address.trim()}
          loading={submitting}
          step={confirmStep}
          otp={otp}
          otpError={otpError}
          onOtpChange={(v) => { setOtp(v); if (otpError) setOtpError(""); }}
          onResendOtp={handleResendOtp}
          onVerifyOtp={handleVerifyOtp}
          onClose={closeConfirm}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Withdrawal history row — USD primary, crypto secondary
═══════════════════════════════════════════════════════════════════════ */

function WithdrawalCard({ w }: { w: RecentWithdrawal }) {
  const ui = deriveUiStatus(w.status);
  const meta = STATUS_META[ui];
  const Icon = meta.Icon;

  /* Older records may have only the crypto amount stored in `amount`.
     If cryptoAmount is null but currency is a known crypto, treat
     `amount` as the legacy crypto amount for display. */
  const asset   = w.cryptoSymbol || w.currency;
  const cryptoAmt = w.cryptoAmount;

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">

      {/* Top row */}
      <div className="flex items-center gap-3 p-4">
        <AssetIcon asset={asset} size={36} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-bold text-white">{asset}</span>
            {(w.cryptoNetwork || w.method) && (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 border border-white/[0.1] rounded px-1.5 py-0.5">
                {w.cryptoNetwork || w.method}
              </span>
            )}
          </div>
          {w.destination && (
            <div className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
              To {shortAddress(w.destination, 12, 6)}
            </div>
          )}
          <div className="text-[10px] text-slate-600 mt-0.5">
            {timeShort(w.createdAt)}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-[14px] font-bold text-red-300 tabular-nums">
            −${w.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          {cryptoAmt !== null && (
            <div className="text-[10.5px] text-slate-500 tabular-nums mt-0.5">
              Withdrawn as {formatCrypto(cryptoAmt)} {asset}
            </div>
          )}
        </div>
      </div>

      {/* Status pill */}
      <div className="border-t border-white/[0.05] px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full border ${meta.bg} ${meta.border} ${meta.color}`}>
          <Icon size={11} />
          {meta.label}
        </span>

        {ui === "pending" && (
          <span className="text-[11px] text-slate-500">Awaiting admin review</span>
        )}
        {ui === "processing" && (
          <span className="text-[11px] text-slate-500">Being sent on-chain</span>
        )}
        {ui === "completed" && (
          <span className="text-[11px] text-emerald-300/80">
            Sent{w.processedAt ? ` · ${timeShort(w.processedAt)}` : ""}
          </span>
        )}
      </div>

      {/* Rejection reason */}
      {ui === "rejected" && w.adminNotes && (
        <div className="border-t border-white/[0.05] px-4 py-3 bg-red-500/[0.04]">
          <div className="text-[10px] font-semibold text-red-400 uppercase tracking-widest mb-1">
            Reason
          </div>
          <p className="text-[12px] text-slate-300 leading-relaxed">
            {w.adminNotes}
          </p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Confirm modal — USD primary, crypto secondary
═══════════════════════════════════════════════════════════════════════ */

function ConfirmModal({
  asset, network, usdAmount, cryptoAmount, exchangeRate,
  feeUsd, netReceiveUsd, address, loading,
  step, otp, otpError, onOtpChange, onResendOtp, onVerifyOtp,
  onClose, onConfirm,
}: {
  asset:         string;
  network:       string;
  usdAmount:     number;
  cryptoAmount:  number;
  exchangeRate:  number;
  feeUsd:        number;
  netReceiveUsd: number;
  address:       string;
  loading:       boolean;
  step:          "review" | "otp";
  otp:           string;
  otpError:      string;
  onOtpChange:   (v: string) => void;
  onResendOtp:   () => void;
  onVerifyOtp:   () => void;
  onClose:       () => void;
  onConfirm:     () => void;
}) {
  const showFee = feeUsd > 0;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-sky-500/20 shadow-2xl"
        style={{ background: "rgba(7,15,30,0.98)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-4 border-b border-white/[0.05] flex items-start gap-3">
          <AssetIcon asset={asset} size={36} />
          <div className="flex-1">
            <h3 className="text-base font-bold text-white">
              {step === "review" ? "Confirm Withdrawal" : "Verify it's you"}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {step === "review"
                ? "Double-check these details before submitting."
                : "We sent a 6-digit code to your email."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-white transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {step === "review" ? (
          <>
            <div className="p-5 space-y-3 text-[12.5px]">
              <Row label="Asset"   value={<>{asset}{network ? <span className="text-slate-500"> · {network}</span> : null}</>} />
              <Row
                label="Amount"
                value={
                  <div className="text-right">
                    <div className="tabular-nums font-semibold">${usdAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div className="text-[11px] text-slate-500 tabular-nums">
                      ≈ {formatCrypto(cryptoAmount)} {asset}
                    </div>
                  </div>
                }
              />
              <Row label="Rate" value={<span className="tabular-nums text-slate-300">1 {asset} = ${exchangeRate.toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>} />
              {showFee && (
                <Row label="Fee" value={<span className="tabular-nums">${feeUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>} />
              )}
              {showFee && (
                <Row
                  label="You will receive"
                  value={<span className="tabular-nums text-emerald-300 font-semibold">${netReceiveUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                />
              )}
              <div className="pt-2 border-t border-white/[0.05]">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">
                  Destination Address
                </div>
                <code className="block text-[11.5px] text-white font-mono break-all leading-relaxed">
                  {address}
                </code>
              </div>

              <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 flex items-start gap-2 mt-2">
                <AlertTriangle size={12} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-[11px] text-amber-200/90 leading-relaxed">
                  Withdrawals are irreversible. Make sure the address is correct. We&apos;ll email a 6-digit code to confirm.
                </div>
              </div>
            </div>

            <div className="px-5 pb-5 flex gap-2">
              <Button
                variant="outline"
                className="flex-1 h-10 border-white/10 text-slate-300 hover:text-white"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 h-10 bg-sky-500 hover:bg-sky-400 text-white font-semibold"
                onClick={onConfirm}
                disabled={loading}
              >
                {loading ? (
                  <><Loader2 size={14} className="animate-spin mr-1.5" /> Sending code…</>
                ) : (
                  "Confirm"
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="p-5 space-y-4 text-[12.5px]">
              <div className="rounded-lg border border-sky-500/20 bg-sky-500/[0.05] px-3 py-2.5 text-[12px] text-sky-100/90 leading-relaxed">
                Enter the 6-digit code we just emailed you. The code expires in 10 minutes.
              </div>

              <div>
                <Label htmlFor="withdraw-otp" className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 block">
                  Verification Code
                </Label>
                {/* Empty-slot placeholder reads as "6 boxes waiting" instead
                    of "the field already has digits in it". The bullets are
                    rendered in a muted slate-600 via the placeholder color
                    so they don't compete with real input once typed. */}
                <Input
                  id="withdraw-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => onOtpChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="••••••"
                  className="text-center text-2xl tracking-[0.5em] font-mono font-semibold h-14 placeholder:text-slate-700 placeholder:tracking-[0.3em]"
                  autoFocus
                />
                {otpError && (
                  <p className="text-[11.5px] text-red-400 mt-2 leading-relaxed">{otpError}</p>
                )}
              </div>

              <div className="text-[11.5px] text-slate-500 text-center">
                Didn&apos;t receive it?{" "}
                <button
                  type="button"
                  onClick={onResendOtp}
                  disabled={loading}
                  className="text-sky-400 hover:text-sky-300 font-semibold disabled:opacity-50"
                >
                  Resend code
                </button>
              </div>

              <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 flex items-start gap-2">
                <AlertTriangle size={12} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-[11px] text-amber-200/90 leading-relaxed">
                  If you didn&apos;t request this withdrawal, do NOT share this code. Contact support immediately.
                </div>
              </div>
            </div>

            <div className="px-5 pb-5 flex gap-2">
              <Button
                variant="outline"
                className="flex-1 h-10 border-white/10 text-slate-300 hover:text-white"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 h-10 bg-sky-500 hover:bg-sky-400 text-white font-semibold"
                onClick={onVerifyOtp}
                disabled={loading || otp.length !== 6}
              >
                {loading ? (
                  <><Loader2 size={14} className="animate-spin mr-1.5" /> Verifying…</>
                ) : (
                  "Verify & Withdraw"
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
      <span className="text-white text-right">{value}</span>
    </div>
  );
}
