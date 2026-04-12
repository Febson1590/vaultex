"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { requestDeposit } from "@/lib/actions/deposits";
import {
  Loader2, CheckCircle2, ArrowDownToLine, Clock,
  AlertTriangle, Upload, FileImage, X,
} from "lucide-react";
import { toast } from "sonner";
import { KycBanner } from "@/components/dashboard/kyc-banner";
import type { KycStatus } from "@/lib/kyc";
import { useUploadThing } from "@/lib/uploadthing";

const CURRENCIES = ["USD", "USDT", "BTC", "ETH"] as const;
const METHODS    = ["Bank Transfer", "Wire Transfer", "SEPA Transfer", "Crypto Transfer"] as const;

interface DepositFormProps {
  kycStatus?: KycStatus;
  minDeposit?: number;
  maxDeposit?: number | null;
}

export default function DepositForm({
  kycStatus = "approved",
  minDeposit = 10,
  maxDeposit,
}: DepositFormProps) {
  const isRestricted = kycStatus !== "approved";

  const [loading, setLoading]     = useState(false);
  const [submitted, setSubmitted] = useState(false);

  /* Form state */
  const [currency, setCurrency] = useState("USD");
  const [method, setMethod]     = useState("Bank Transfer");
  const [amount, setAmount]     = useState("");
  const [txHash, setTxHash]     = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [error, setError]       = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const { startUpload } = useUploadThing("kycDocument");

  /* File handling */
  function handleFile(file: File | null) {
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) { toast.error("Upload JPG, PNG, WEBP, or PDF only."); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("File must be under 8 MB."); return; }
    setProofFile(file);
  }

  /* Submit */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const amtNum = parseFloat(amount);
    if (!amtNum || amtNum <= 0) { setError("Enter a valid amount"); return; }
    if (amtNum < minDeposit) { setError(`Minimum deposit is $${minDeposit}`); return; }
    if (maxDeposit && amtNum > maxDeposit) { setError(`Maximum deposit is $${maxDeposit}`); return; }

    setLoading(true);
    try {
      /* Upload proof if provided */
      let proofUrl: string | undefined;
      if (proofFile) {
        try {
          const uploaded = await startUpload([proofFile]);
          if (uploaded && uploaded.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const first = uploaded[0] as any;
            proofUrl =
              first?.url ??
              first?.ufsUrl ??
              first?.appUrl ??
              first?.serverData?.url ??
              undefined;
          }
        } catch { /* Continue without proof — deposit can still be reviewed manually */ }
      }

      const result = await requestDeposit({
        currency,
        amount: amtNum,
        method,
        proofUrl: proofUrl ?? undefined,
        txHash: txHash.trim() || undefined,
      });

      if ("error" in result && result.error) {
        setError(result.error);
      } else if ("success" in result) {
        setSubmitted(true);
        toast.success("Deposit request submitted!");
      }
    } catch {
      setError("Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  /* ── Success state ─────────────────────────────────────── */
  if (submitted) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="glass-card rounded-2xl p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Request Submitted</h2>
          <p className="text-slate-400 text-sm mb-6">
            Your deposit request has been submitted and is pending review.
            You&apos;ll be notified once it&apos;s processed.
          </p>
          <Button onClick={() => { setSubmitted(false); setAmount(""); setTxHash(""); setProofFile(null); }}
            className="bg-sky-500 hover:bg-sky-400 text-white">
            Submit Another
          </Button>
        </div>
      </div>
    );
  }

  /* ── Form ───────────────────────────────────────────────── */
  return (
    <div className="max-w-xl mx-auto space-y-5">
      {isRestricted && <KycBanner kycStatus={kycStatus} />}

      <div>
        <h1 className="text-2xl font-bold text-white">Deposit Funds</h1>
        <p className="text-sm text-slate-500 mt-0.5">Submit a deposit request to fund your account</p>
      </div>

      {/* Warning banner */}
      <div className="glass-card rounded-xl p-4 border border-yellow-500/20 bg-yellow-500/5 flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-400 leading-relaxed">
          <strong className="text-yellow-400">Important:</strong> All deposits are reviewed by our finance team before
          funds are credited. Processing typically takes 1–24 hours.
        </div>
      </div>

      <Card className="glass-card border-0 rounded-xl p-6">
        <form onSubmit={handleSubmit} className="space-y-5">

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
              <AlertTriangle size={13} className="flex-shrink-0" /> {error}
            </div>
          )}

          {/* Currency */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400 uppercase tracking-widest">
              Currency <span className="text-red-400">*</span>
            </Label>
            <Select value={currency} onValueChange={(v) => v && setCurrency(v)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0d1e3a] border-sky-500/20 text-white">
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c} className="hover:bg-sky-500/10 focus:bg-sky-500/10">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400 uppercase tracking-widest">
              Amount <span className="text-red-400">*</span>
            </Label>
            <div className="relative">
              {(currency === "USD" || currency === "USDT") && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
              )}
              <Input
                type="number"
                step="0.01"
                min={minDeposit}
                max={maxDeposit ?? undefined}
                placeholder={`Min ${minDeposit}`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-11 ${currency === "USD" || currency === "USDT" ? "pl-7" : ""}`}
                required
              />
            </div>
            <div className="text-[10px] text-slate-600 flex items-center gap-3">
              <span>Min: ${minDeposit}</span>
              {maxDeposit && <span>Max: ${maxDeposit}</span>}
            </div>
          </div>

          {/* Deposit method */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400 uppercase tracking-widest">
              Deposit Method <span className="text-red-400">*</span>
            </Label>
            <Select value={method} onValueChange={(v) => v && setMethod(v)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0d1e3a] border-sky-500/20 text-white">
                {METHODS.map((m) => (
                  <SelectItem key={m} value={m} className="hover:bg-sky-500/10 focus:bg-sky-500/10">{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Transaction hash */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400 uppercase tracking-widest">Transaction Hash / Reference</Label>
            <Input
              placeholder="Optional — paste your tx hash or transfer reference"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-11 font-mono text-xs"
            />
          </div>

          {/* Proof upload */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400 uppercase tracking-widest">Proof of Transfer</Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            {proofFile ? (
              <div className="flex items-center gap-3 rounded-lg px-4 py-3 bg-sky-500/[0.07] border border-sky-500/30">
                <FileImage className="h-5 w-5 text-sky-400 flex-shrink-0" />
                <span className="text-sm text-white flex-1 truncate font-medium">{proofFile.name}</span>
                <span className="text-xs text-slate-500 flex-shrink-0">{(proofFile.size / 1024 / 1024).toFixed(2)} MB</span>
                <button type="button" onClick={() => { setProofFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                  className="text-slate-400 hover:text-white transition-colors flex-shrink-0">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()}
                className="w-full rounded-lg px-4 py-6 text-center border border-dashed border-white/[0.18] hover:border-sky-500/50 hover:bg-white/[0.02] transition-all">
                <Upload className="h-5 w-5 text-slate-400 mx-auto mb-2" />
                <div className="text-xs text-white font-medium">Click to upload screenshot or receipt</div>
                <div className="text-[10px] text-slate-500 mt-1">JPG, PNG, WEBP or PDF · Max 8 MB</div>
              </button>
            )}
          </div>

          {/* Info footer */}
          <div className="p-3 bg-white/3 rounded-lg space-y-2 text-xs text-slate-400">
            <div className="flex items-center gap-2"><Clock size={12} className="text-sky-400" /><span>Processing time: 1–24 hours</span></div>
            <div className="flex items-center gap-2"><CheckCircle2 size={12} className="text-emerald-400" /><span>No deposit fees</span></div>
          </div>

          <Button type="submit" disabled={loading || isRestricted}
            className="w-full bg-sky-500 hover:bg-sky-400 text-white font-semibold h-11">
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
            ) : isRestricted ? (
              "Verification Required"
            ) : (
              <><ArrowDownToLine className="mr-2 h-4 w-4" /> Submit Deposit Request</>
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}
