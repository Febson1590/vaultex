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

/* ─── Types ──────────────────────────────────────────────────────────── */

interface WalletBalance {
  currency: string;
  balance:  number;
}

interface RecentWithdrawal {
  id:          string;
  currency:    string;
  amount:      number;
  method:      string;             // network
  destination: string | null;
  status:      string;             // PENDING | APPROVED | REJECTED | PROCESSING
  adminNotes:  string | null;
  createdAt:   string;
  processedAt: string | null;
}

interface Props {
  kycStatus?:     KycStatus;
  balances?:      WalletBalance[];
  minWithdrawal?: number;
  maxWithdrawal?: number | null;
  feePercent?:    number;
  feeFixed?:      number;
  recent?:        RecentWithdrawal[];
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

/** Assets the user can withdraw — must appear in their wallet list. */
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
  balances      = [],
  minWithdrawal = 10,
  maxWithdrawal,
  feePercent    = 0,
  feeFixed      = 0,
  recent        = [],
}: Props) {
  const isRestricted = kycStatus !== "approved";

  /* Build a balance lookup for quick chip + Max-button logic. */
  const balanceMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const b of balances) m[b.currency] = b.balance;
    return m;
  }, [balances]);

  const [selectedAsset, setSelectedAsset] = useState<string>(SUPPORTED_ASSETS[0]);
  const availableNetworks = ASSET_NETWORKS[selectedAsset] ?? [];
  const [network, setNetwork]   = useState<string>(availableNetworks[0] ?? "");
  const [amount, setAmount]     = useState("");
  const [address, setAddress]   = useState("");
  const [error, setError]       = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  /* Reset network when asset changes. */
  function pickAsset(a: string) {
    setSelectedAsset(a);
    const nets = ASSET_NETWORKS[a] ?? [];
    setNetwork(nets[0] ?? "");
    setError("");
  }

  const currentBalance = balanceMap[selectedAsset] ?? 0;
  const amountNum      = parseFloat(amount) || 0;

  /* Withdrawal fee (percent + fixed in same currency for simplicity). */
  const feeAmount = (amountNum * feePercent) / 100 + feeFixed;
  const netReceive = Math.max(0, amountNum - feeAmount);

  function setMaxAmount() {
    if (currentBalance <= 0) return;
    setAmount(String(currentBalance));
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
    if (!amountNum || amountNum <= 0) { setError("Enter a valid amount"); return; }
    if (amountNum < minWithdrawal) { setError(`Minimum withdrawal is ${minWithdrawal} ${selectedAsset}`); return; }
    if (maxWithdrawal && amountNum > maxWithdrawal) { setError(`Maximum withdrawal is ${maxWithdrawal} ${selectedAsset}`); return; }
    if (amountNum > currentBalance) { setError(`Insufficient ${selectedAsset} balance`); return; }
    if (!address || address.trim().length < 6) { setError("Enter a valid wallet address"); return; }
    setShowConfirm(true);
  }

  /* Submit after user confirms in modal. */
  async function handleConfirm() {
    setSubmitting(true);
    try {
      const res = await requestWithdrawal({
        currency:    selectedAsset,
        amount:      amountNum,
        method:      network || selectedAsset,
        destination: address.trim(),
      });
      if ("error" in res && res.error) {
        toast.error(res.error);
        setError(res.error);
        setShowConfirm(false);
      } else {
        toast.success("Withdrawal submitted — pending review");
        setShowConfirm(false);
        setAmount("");
        setAddress("");
      }
    } catch {
      toast.error("Failed to submit. Please try again.");
      setShowConfirm(false);
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
              const bal      = balanceMap[asset] ?? 0;
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
                    <span className="text-[10px] text-slate-500 tabular-nums">
                      {bal.toLocaleString("en-US", { maximumFractionDigits: 6 })}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Available balance + Max */}
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              Available Balance
            </div>
            <div className="text-[17px] font-bold text-white tabular-nums mt-0.5">
              {currentBalance.toLocaleString("en-US", { maximumFractionDigits: 6 })}{" "}
              <span className="text-[13px] font-medium text-slate-400">{selectedAsset}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={setMaxAmount}
            disabled={currentBalance <= 0}
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

        {/* Amount */}
        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
            Amount
          </Label>
          <div className="relative">
            <Input
              type="number"
              step="0.000001"
              min={minWithdrawal}
              max={maxWithdrawal ?? undefined}
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-600 h-12 pr-20 text-base font-semibold tabular-nums"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-slate-500 font-medium pointer-events-none">
              | {selectedAsset}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
            <span>Min: {minWithdrawal} {selectedAsset}</span>
            {maxWithdrawal && <span>· Max: {maxWithdrawal} {selectedAsset}</span>}
            {(feePercent > 0 || feeFixed > 0) && (
              <span>· Fee: {feePercent > 0 && `${feePercent}%`}{feePercent > 0 && feeFixed > 0 && " + "}{feeFixed > 0 && `${feeFixed} ${selectedAsset}`}</span>
            )}
          </div>
          {amountNum > 0 && (feePercent > 0 || feeFixed > 0) && (
            <div className="text-[11.5px] text-slate-400 pt-1">
              You&apos;ll receive{" "}
              <span className="text-white font-semibold tabular-nums">
                {netReceive.toLocaleString("en-US", { maximumFractionDigits: 6 })} {selectedAsset}
              </span>
            </div>
          )}
        </div>

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
          amount={amountNum}
          feeAmount={feeAmount}
          netReceive={netReceive}
          address={address.trim()}
          loading={submitting}
          onClose={() => !submitting && setShowConfirm(false)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Withdrawal history row
═══════════════════════════════════════════════════════════════════════ */

function WithdrawalCard({ w }: { w: RecentWithdrawal }) {
  const ui = deriveUiStatus(w.status);
  const meta = STATUS_META[ui];
  const Icon = meta.Icon;

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">

      {/* Top row */}
      <div className="flex items-center gap-3 p-4">
        <AssetIcon asset={w.currency} size={36} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-bold text-white">{w.currency}</span>
            {w.method && (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 border border-white/[0.1] rounded px-1.5 py-0.5">
                {w.method}
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
            −{w.amount.toLocaleString("en-US", { maximumFractionDigits: 6 })} {w.currency}
          </div>
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
   Confirm modal
═══════════════════════════════════════════════════════════════════════ */

function ConfirmModal({
  asset, network, amount, feeAmount, netReceive, address, loading, onClose, onConfirm,
}: {
  asset:      string;
  network:    string;
  amount:     number;
  feeAmount:  number;
  netReceive: number;
  address:    string;
  loading:    boolean;
  onClose:    () => void;
  onConfirm:  () => void;
}) {
  const showFee = feeAmount > 0;
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
            <h3 className="text-base font-bold text-white">Confirm Withdrawal</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Double-check these details before submitting.
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

        <div className="p-5 space-y-3 text-[12.5px]">
          <Row label="Asset"   value={<>{asset}{network ? <span className="text-slate-500"> · {network}</span> : null}</>} />
          <Row label="Amount"  value={<span className="tabular-nums">{amount.toLocaleString("en-US", { maximumFractionDigits: 6 })} {asset}</span>} />
          {showFee && (
            <Row label="Fee" value={<span className="tabular-nums">{feeAmount.toLocaleString("en-US", { maximumFractionDigits: 6 })} {asset}</span>} />
          )}
          {showFee && (
            <Row
              label="You will receive"
              value={<span className="tabular-nums text-emerald-300 font-semibold">{netReceive.toLocaleString("en-US", { maximumFractionDigits: 6 })} {asset}</span>}
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
              Withdrawals are irreversible. Make sure the address is correct.
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
              <><Loader2 size={14} className="animate-spin mr-1.5" /> Submitting…</>
            ) : (
              "Confirm"
            )}
          </Button>
        </div>
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
