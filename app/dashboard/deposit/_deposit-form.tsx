"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  createDepositRequest,
  submitDepositProof,
  cancelDepositRequest,
} from "@/lib/actions/deposits";
import {
  Loader2, CheckCircle2, Copy, Check, AlertTriangle, Upload,
  FileImage, X, ArrowLeft, Clock, Hourglass, XCircle,
  Trash2, Info,
} from "lucide-react";
import { toast } from "sonner";
import { KycBanner } from "@/components/dashboard/kyc-banner";
import type { KycStatus } from "@/lib/kyc";
import {
  DualAmountInput, useDualAmount, useLiveRates, formatCrypto,
  type Rates,
} from "@/components/dashboard/dual-amount-input";

/* ─── Types ──────────────────────────────────────────────────────────── */

interface DepositWallet {
  id:           string;
  asset:        string;
  network:      string | null;
  address:      string;
  label:        string;
  minDeposit:   number | null;
  instructions: string | null;
}

interface RecentDeposit {
  id:            string;
  currency:      string;
  amount:        number;             // USD
  method:        string;
  status:        string;             // PENDING | APPROVED | REJECTED | PROCESSING
  proofUrl:      string | null;
  txHash:        string | null;
  walletId:      string | null;
  adminNotes:    string | null;
  cryptoAmount:  number | null;
  cryptoSymbol:  string | null;
  cryptoNetwork: string | null;
  exchangeRate:  number | null;
  createdAt:     string;
  processedAt:   string | null;
}

interface Props {
  kycStatus?:    KycStatus;
  wallets?:      DepositWallet[];
  minDeposit?:   number;
  maxDeposit?:   number | null;
  recent?:       RecentDeposit[];
  initialRates?: Rates;
}

/* ─── 4-state UI status derived from DB status + proofUrl ───────────── */

type UiStatus = "awaiting" | "review" | "approved" | "rejected";

function deriveUiStatus(d: Pick<RecentDeposit, "status" | "proofUrl">): UiStatus {
  if (d.status === "APPROVED") return "approved";
  if (d.status === "REJECTED") return "rejected";
  // PENDING / PROCESSING
  if (d.proofUrl) return "review";
  return "awaiting";
}

const STATUS_META: Record<UiStatus, {
  label: string;
  color: string;
  bg:    string;
  border: string;
  Icon:  typeof Clock;
}> = {
  awaiting: { label: "Awaiting Payment", color: "text-amber-300",   bg: "bg-amber-500/10",   border: "border-amber-500/25",   Icon: Clock      },
  review:   { label: "Under Review",     color: "text-sky-300",     bg: "bg-sky-500/10",     border: "border-sky-500/25",     Icon: Hourglass  },
  approved: { label: "Approved",         color: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/25", Icon: CheckCircle2 },
  rejected: { label: "Rejected",         color: "text-red-300",     bg: "bg-red-500/10",     border: "border-red-500/25",     Icon: XCircle    },
};

/* ─── Helpers ────────────────────────────────────────────────────────── */

function shortAddress(addr: string, head = 7, tail = 4): string {
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

/* ─── Asset brand colors ─────────────────────────────────────────────── */

const ASSET_META: Record<string, { color: string; mono: string }> = {
  BTC:  { color: "#f7931a", mono: "₿" },
  ETH:  { color: "#627eea", mono: "Ξ" },
  USDT: { color: "#26a17b", mono: "₮" },
  BNB:  { color: "#f3ba2f", mono: "B" },
  SOL:  { color: "#9945ff", mono: "◎" },
  USD:  { color: "#64748b", mono: "$" },
};

function AssetIcon({ asset, size = 32 }: { asset: string; size?: number }) {
  const meta = ASSET_META[asset] ?? { color: "#64748b", mono: asset.slice(0, 1) };
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 text-sm font-black"
      style={{
        width:   size,
        height:  size,
        background: `${meta.color}1f`,
        border:  `1px solid ${meta.color}55`,
        color:   meta.color,
      }}
    >
      {meta.mono}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Main component
═══════════════════════════════════════════════════════════════════════ */

/* Default asset menu — always visible so the user sees we support these
   cryptos even before an admin has configured a wallet for them. If the
   admin has configured an unexpected asset we also include it. */
const DEFAULT_ASSETS = ["BTC", "ETH", "USDT", "BNB", "SOL"];

export default function DepositForm({
  kycStatus    = "approved",
  wallets      = [],
  minDeposit   = 10,
  maxDeposit,
  recent       = [],
  initialRates = {},
}: Props) {
  const isRestricted = kycStatus !== "approved";

  /* Build the full asset list = defaults + any extra admin-configured assets. */
  const configuredAssets = Array.from(new Set(wallets.map((w) => w.asset)));
  const assetMenu = Array.from(new Set([...DEFAULT_ASSETS, ...configuredAssets]));

  /* ── Live USD rates (polls /api/rates every 45s) ────────────────── */
  const rates = useLiveRates(initialRates);

  /* ── New-deposit state ──────────────────────────────────────────── */
  const [selectedAsset, setSelectedAsset] = useState<string>(
    configuredAssets[0] ?? DEFAULT_ASSETS[0],
  );
  const [copied, setCopied]   = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError]     = useState("");

  /* Two-way dual-amount state wired to the current asset rate. */
  const currentRate = rates[selectedAsset] ?? 0;
  const dual        = useDualAmount(currentRate);

  /* Look up the active wallet for the currently selected asset.
     If an admin has configured multiple wallets for the same asset
     (e.g. USDT TRC20 + USDT ERC20), we just pick the first one. */
  const activeWallet = wallets.find((w) => w.asset === selectedAsset) ?? null;

  /* Effective minimum — prefer the per-wallet minimum if the admin set one. */
  const effectiveMin =
    activeWallet?.minDeposit != null ? activeWallet.minDeposit : minDeposit;

  /* ── Copy wallet address ──────────────────────────────────────── */
  function copyAddress() {
    if (!activeWallet) return;
    navigator.clipboard.writeText(activeWallet.address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  /* ── Create a new Awaiting-Payment deposit ────────────────────── */
  async function handleCreateDeposit() {
    setError("");
    if (!activeWallet) { setError("Select a cryptocurrency"); return; }
    const amt = dual.usdNumber;
    const cryptoAmt = dual.cryptoNumber;
    if (!amt || amt <= 0) { setError("Enter a valid amount"); return; }
    if (amt < effectiveMin)  { setError(`Minimum deposit is $${effectiveMin}`); return; }
    if (maxDeposit && amt > maxDeposit) { setError(`Maximum deposit is $${maxDeposit}`); return; }
    if (currentRate <= 0) { setError("Rates are unavailable — try again in a moment"); return; }

    setCreating(true);
    try {
      const res = await createDepositRequest({
        currency:      activeWallet.asset,
        amount:        amt,                    // USD — primary amount
        method:        activeWallet.label,
        walletId:      activeWallet.id,
        cryptoAmount:  cryptoAmt,
        cryptoSymbol:  activeWallet.asset,
        cryptoNetwork: activeWallet.network ?? null,
        exchangeRate:  currentRate,
      });
      if ("error" in res && res.error) {
        setError(res.error);
      } else {
        toast.success("Deposit created — now upload your proof of payment");
        dual.clear();
        // Page is revalidated server-side; Next will re-render with the
        // new pending deposit appearing in the list below.
      }
    } catch {
      setError("Failed to create deposit. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div className="space-y-5 max-w-2xl mx-auto pb-16">

      {/* ── Back ─────────────────────────────────────────────────── */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-3"
        >
          <ArrowLeft size={14} />
          Back
        </Link>
        <h1 className="text-2xl font-bold text-white">Deposit Crypto</h1>
        <p className="text-sm text-slate-500 mt-1">
          Send crypto to the wallet address below and submit proof of payment.
        </p>
      </div>

      {/* ── KYC banner ───────────────────────────────────────────── */}
      {isRestricted && <KycBanner kycStatus={kycStatus} />}

      {/* ── Create-deposit card ──────────────────────────────────── */}
      <Card className="glass-card border-0 rounded-2xl p-5 sm:p-6 space-y-5">

        {/* Asset selector — horizontal chips. Shows the full default set
            even when some are unavailable so the user can see what's
            supported and get a polished "unavailable" state below. */}
        <div className="space-y-2">
          <Label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
            Select Cryptocurrency
          </Label>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
            {assetMenu.map((asset) => {
              const isActive = selectedAsset === asset;
              const hasWallet = wallets.some((w) => w.asset === asset);
              return (
                <button
                  key={asset}
                  type="button"
                  onClick={() => { setSelectedAsset(asset); setError(""); }}
                  className={`
                    flex-shrink-0 flex items-center gap-2 h-11 px-4 rounded-xl border transition-all
                    ${isActive
                      ? "border-sky-500/50 bg-sky-500/[0.08] shadow-[0_0_0_1px_rgba(14,165,233,0.2)]"
                      : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]"}
                  `}
                >
                  <AssetIcon asset={asset} size={26} />
                  <span className={`text-[13px] font-semibold ${isActive ? "text-white" : "text-slate-300"}`}>
                    {asset}
                  </span>
                  {!hasWallet && (
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500 border border-white/10 rounded px-1 py-0.5 ml-0.5">
                      Soon
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Per-asset branch: either the full form, or an "Unavailable" state. */}
        {activeWallet ? (
          <>
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
              titlePrefix="Amount to Deposit"
              minUsd={effectiveMin}
              maxUsd={maxDeposit ?? undefined}
              rateStale={currentRate <= 0}
            />

            {/* Wallet address */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                {activeWallet.asset} Deposit Address
                {activeWallet.network && (
                  <span className="text-slate-500 ml-2 normal-case tracking-normal font-medium">
                    · {activeWallet.network}
                  </span>
                )}
              </Label>
              <div className="flex items-stretch gap-2">
                <div className="flex-1 flex items-center px-4 bg-white/[0.03] border border-white/[0.08] rounded-lg min-w-0">
                  <code className="text-[13px] text-slate-200 font-mono truncate">
                    {shortAddress(activeWallet.address, 14, 4)}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={copyAddress}
                  aria-label="Copy address"
                  className="h-11 w-11 rounded-lg bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400 hover:bg-sky-500/20 transition-colors"
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                </button>
              </div>
              <div className="flex items-start gap-2 text-[11.5px] text-amber-300/90 pt-1">
                <AlertTriangle size={13} className="text-amber-400/80 flex-shrink-0 mt-0.5" />
                <span>
                  Send only <strong className="text-white">{activeWallet.asset}</strong>
                  {activeWallet.network && <> on <strong className="text-white">{activeWallet.network}</strong></>}
                  {" "}to this {activeWallet.asset === "BTC" ? "Bitcoin" : activeWallet.asset} wallet address.
                </span>
              </div>
            </div>

            {/* Optional admin instructions */}
            {activeWallet.instructions && (
              <div className="rounded-lg border border-sky-500/20 bg-sky-500/[0.05] px-3 py-2.5 text-[12px] text-slate-300 leading-relaxed whitespace-pre-wrap">
                {activeWallet.instructions}
              </div>
            )}

            {/* CTA — I've Sent the Payment */}
            <Button
              onClick={handleCreateDeposit}
              disabled={creating || isRestricted}
              className="w-full h-12 bg-sky-500 hover:bg-sky-400 text-white font-semibold text-[14px]"
            >
              {creating ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating…</>
              ) : isRestricted ? (
                "Verification Required"
              ) : (
                "I've Sent the Payment"
              )}
            </Button>

            {/* Next Steps helper block */}
            <NextStepsBlock />
          </>
        ) : (
          <UnavailableState asset={selectedAsset} />
        )}
      </Card>

      {/* ── Recent deposits list ─────────────────────────────────── */}
      {recent.length > 0 && (
        <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-4">
          <h2 className="text-[15px] font-bold text-white">
            {recent.some((d) => deriveUiStatus(d) === "awaiting" || deriveUiStatus(d) === "review")
              ? "Pending Deposits"
              : "Recent Deposits"}
          </h2>

          <div className="space-y-3">
            {recent.map((deposit) => (
              <DepositCard key={deposit.id} deposit={deposit} walletAddress={wallets.find((w) => w.id === deposit.walletId)?.address ?? null} />
            ))}
          </div>
        </div>
      )}

      {/* ── Footer note ──────────────────────────────────────────── */}
      <p className="text-[12px] text-slate-500 leading-relaxed px-2">
        Please note that deposits require confirmations on the blockchain and are subject to manual review.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   "Next Steps" helper — shown under the CTA to guide first-time users
═══════════════════════════════════════════════════════════════════════ */

function NextStepsBlock() {
  const steps = [
    "Send your crypto to the wallet address above",
    "Click \u201CI\u2019ve Sent the Payment\u201D",
    "Upload your proof from \u201CPending Deposits\u201D below",
  ];
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3.5">
      <div className="flex items-center gap-1.5 mb-2.5">
        <Info size={12} className="text-sky-400" />
        <span className="text-[11px] font-bold text-white uppercase tracking-widest">
          Next Steps
        </span>
      </div>
      <ol className="space-y-2">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[12.5px] text-slate-300 leading-relaxed">
            <span className="flex-shrink-0 mt-0.5 w-4 h-4 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 text-[10px] font-bold flex items-center justify-center">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <p className="text-[11.5px] text-slate-500 mt-3 pt-2.5 border-t border-white/[0.05] leading-relaxed">
        Your deposit will be reviewed once proof is submitted.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Unavailable state — shown when the selected asset has no active wallet
═══════════════════════════════════════════════════════════════════════ */

function UnavailableState({ asset }: { asset: string }) {
  return (
    <div className="py-8 px-4 text-center space-y-4">
      <div className="mx-auto w-16 h-16 flex items-center justify-center">
        <AssetIcon asset={asset} size={64} />
      </div>
      <div>
        <h3 className="text-[15px] font-bold text-white">
          {asset} Deposits Unavailable
        </h3>
        <p className="text-[12.5px] text-slate-400 mt-1.5 leading-relaxed max-w-sm mx-auto">
          Deposits for this cryptocurrency are currently unavailable.
          Please try another option or contact support.
        </p>
      </div>
      <div>
        <Link
          href="/dashboard/support"
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-[12.5px] font-semibold text-slate-200 transition-colors"
        >
          Contact Support
        </Link>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Deposit card — renders differently for each of the 4 UI states
═══════════════════════════════════════════════════════════════════════ */

function DepositCard({
  deposit,
  walletAddress,
}: {
  deposit: RecentDeposit;
  walletAddress: string | null;
}) {
  const ui = deriveUiStatus(deposit);
  const meta = STATUS_META[ui];
  const Icon = meta.Icon;

  const [showUpload, setShowUpload]  = useState(false);
  const [cancelling, setCancelling]  = useState(false);

  async function handleCancel() {
    if (!confirm("Cancel this deposit? You can create a new one after.")) return;
    setCancelling(true);
    const res = await cancelDepositRequest(deposit.id);
    setCancelling(false);
    if ("error" in res && res.error) {
      toast.error(res.error);
    } else {
      toast.success("Deposit cancelled");
    }
  }

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">

      {/* Top row: asset + amount + status */}
      <div className="flex items-center gap-3 p-4">
        <AssetIcon asset={deposit.currency} size={36} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-bold text-white">{deposit.currency}</span>
            {deposit.cryptoNetwork && (
              <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 border border-white/[0.1] rounded px-1.5 py-0.5">
                {deposit.cryptoNetwork}
              </span>
            )}
          </div>
          {walletAddress && (
            <div className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
              {shortAddress(walletAddress, 12, 3)}
            </div>
          )}
          <div className="text-[10px] text-slate-600 mt-0.5">
            {timeShort(deposit.createdAt)}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-[14px] font-bold text-sky-300 tabular-nums">
            +${deposit.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          {deposit.cryptoAmount !== null && deposit.cryptoSymbol && (
            <div className="text-[10.5px] text-slate-500 tabular-nums mt-0.5">
              Paid with {formatCrypto(deposit.cryptoAmount)} {deposit.cryptoSymbol}
            </div>
          )}
        </div>
      </div>

      {/* Status pill + per-state action row */}
      <div className="border-t border-white/[0.05] px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full border ${meta.bg} ${meta.border} ${meta.color}`}>
          <Icon size={11} />
          {meta.label}
        </span>

        {ui === "awaiting" && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelling}
              className="inline-flex items-center gap-1.5 text-[11.5px] text-slate-500 hover:text-red-400 transition-colors"
            >
              {cancelling ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-sky-500 hover:bg-sky-400 text-white text-[12px] font-semibold"
            >
              <Upload size={12} />
              Upload Proof
            </button>
          </div>
        )}

        {ui === "review" && (
          <span className="text-[11px] text-slate-500">
            Your deposit is being reviewed
          </span>
        )}

        {ui === "approved" && (
          <span className="text-[11px] text-emerald-300/80">
            Credited{deposit.processedAt ? ` · ${timeShort(deposit.processedAt)}` : ""}
          </span>
        )}
      </div>

      {/* Rejection reason */}
      {ui === "rejected" && deposit.adminNotes && (
        <div className="border-t border-white/[0.05] px-4 py-3 bg-red-500/[0.04]">
          <div className="text-[10px] font-semibold text-red-400 uppercase tracking-widest mb-1">
            Reason
          </div>
          <p className="text-[12px] text-slate-300 leading-relaxed">
            {deposit.adminNotes}
          </p>
        </div>
      )}

      {/* Upload modal */}
      {showUpload && (
        <UploadProofModal
          depositId={deposit.id}
          currency={deposit.currency}
          amount={deposit.amount}
          onClose={() => setShowUpload(false)}
          onSuccess={() => {
            setShowUpload(false);
            toast.success("Proof uploaded — your deposit is now under review");
          }}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Upload-proof modal
═══════════════════════════════════════════════════════════════════════ */

function UploadProofModal({
  depositId, currency, amount, onClose, onSuccess,
}: {
  depositId: string;
  currency:  string;
  amount:    number;
  onClose:   () => void;
  onSuccess: () => void;
}) {
  const [file, setFile]       = useState<File | null>(null);
  const [txHash, setTxHash]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File | null) {
    if (!f) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(f.type)) { toast.error("Upload JPG, PNG, WEBP, or PDF only."); return; }
    if (f.size > 8 * 1024 * 1024) { toast.error("File must be under 8 MB."); return; }
    setFile(f);
  }

  /** Upload via server-side /api/upload route (bypasses flaky UT client SDK). */
  async function uploadFile(f: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", f);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || `Upload failed (${res.status})`);
    return data.url;
  }

  async function handleSubmit() {
    setError("");
    if (!file) { setError("Please attach your proof of payment"); return; }

    setLoading(true);
    try {
      const proofUrl = await uploadFile(file);
      const res = await submitDepositProof({
        requestId: depositId,
        proofUrl,
        txHash:    txHash.trim() || undefined,
      });
      if ("error" in res && res.error) {
        setError(res.error);
      } else {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

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
        <div className="px-5 pt-5 pb-4 border-b border-white/[0.05]">
          <h3 className="text-base font-bold text-white">Upload Proof of Payment</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            For your {currency} deposit of{" "}
            <span className="text-white font-semibold tabular-nums">
              {amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD
            </span>
          </p>
        </div>

        <div className="p-5 space-y-4">

          {error && (
            <div className="flex items-center gap-2 text-[11.5px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <AlertTriangle size={12} className="flex-shrink-0" /> {error}
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />

          {file ? (
            <div className="flex items-center gap-3 rounded-lg px-3 py-3 bg-sky-500/[0.06] border border-sky-500/25">
              <FileImage className="h-5 w-5 text-sky-400 flex-shrink-0" />
              <span className="text-[12.5px] text-white flex-1 truncate font-medium">{file.name}</span>
              <span className="text-[10.5px] text-slate-500 flex-shrink-0">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
              <button
                type="button"
                onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                className="text-slate-400 hover:text-white transition-colors flex-shrink-0"
              >
                <X size={15} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-lg px-4 py-6 text-center border border-dashed border-white/[0.15] hover:border-sky-500/40 hover:bg-white/[0.02] transition-all"
            >
              <Upload className="h-5 w-5 text-slate-400 mx-auto mb-2" />
              <div className="text-[12px] text-white font-medium">Click to upload screenshot or receipt</div>
              <div className="text-[10px] text-slate-500 mt-1">JPG, PNG, WEBP or PDF · Max 8 MB</div>
            </button>
          )}

          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
              Transaction Hash <span className="text-slate-600">— optional</span>
            </Label>
            <Input
              placeholder="Paste your tx hash or transfer reference"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-600 h-10 font-mono text-xs"
            />
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
            onClick={handleSubmit}
            disabled={loading || !file}
          >
            {loading ? (
              <><Loader2 size={14} className="animate-spin mr-1.5" /> Submitting…</>
            ) : (
              "Submit Proof"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
