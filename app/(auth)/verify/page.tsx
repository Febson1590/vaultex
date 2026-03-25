"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card }   from "@/components/ui/card";
import { verifyOtp, sendOtp } from "@/lib/actions/otp";
import { OtpType } from "@prisma/client";
import {
  ShieldCheck, Mail, Loader2, AlertCircle, RefreshCw, ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

export default function VerifyPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const email = searchParams.get("email") || "";
  const type  = (searchParams.get("type") || "REGISTER").toUpperCase() as OtpType;

  const [digits,   setDigits]   = useState<string[]>(Array(6).fill(""));
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus first input on mount
  useEffect(() => { inputRefs.current[0]?.focus(); }, []);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // ── Digit input handling ──────────────────────────────────────────────────
  function handleChange(index: number, value: string) {
    // Allow only digits; handle paste of full code
    const cleaned = value.replace(/\D/g, "");

    if (cleaned.length > 1) {
      // Pasted a multi-digit string — distribute across slots
      const arr = [...digits];
      for (let i = 0; i < 6 && i < cleaned.length; i++) {
        arr[index + i] = cleaned[i] ?? "";
      }
      const next = Math.min(index + cleaned.length, 5);
      setDigits(arr);
      inputRefs.current[next]?.focus();
      return;
    }

    const arr   = [...digits];
    arr[index]  = cleaned;
    setDigits(arr);
    setError("");

    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (digits[index]) {
        const arr = [...digits]; arr[index] = ""; setDigits(arr);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
    if (e.key === "ArrowLeft"  && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < 5) inputRefs.current[index + 1]?.focus();
  }

  // ── Submit OTP ───────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = digits.join("");
    if (code.length < 6) { setError("Enter all 6 digits."); return; }

    setLoading(true);
    setError("");

    const result = await verifyOtp(email, code, type);

    if ('error' in result) {
      setError(result.error);
      // Shake + clear on wrong code
      setDigits(Array(6).fill(""));
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
      setLoading(false);
      return;
    }

    if (type === OtpType.REGISTER) {
      toast.success("Email verified! Please sign in.");
      router.push("/login");
    }
    // For LOGIN type, this page is never shown (login page handles it inline).
  }

  // ── Resend OTP ───────────────────────────────────────────────────────────
  async function handleResend() {
    if (resendCooldown > 0 || !email) return;
    setResending(true);

    const result = await sendOtp(email, type);
    setResending(false);

    if ('error' in result) {
      toast.error(result.error);
    } else {
      toast.success("New code sent! Check your inbox.");
      setResendCooldown(60);
      setDigits(Array(6).fill(""));
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    }
  }

  const isRegister = type === OtpType.REGISTER;

  return (
    <div className="w-full max-w-md">

      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(14,165,233,0.1)", border: "1px solid rgba(14,165,233,0.25)" }}>
            <ShieldCheck className="h-7 w-7 text-sky-400" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">
          {isRegister ? "Verify Your Email" : "Two-Factor Verification"}
        </h1>
        <p className="text-sm text-slate-400">
          We sent a 6-digit code to{" "}
          <span className="text-sky-400 font-medium">{email || "your email"}</span>
        </p>
      </div>

      <Card className="glass-card border-0 rounded-2xl p-8 shadow-[0_8px_48px_rgba(0,0,0,0.6)]">

        {/* Email reminder */}
        <div className="flex items-center gap-3 rounded-xl p-3.5 mb-7"
          style={{ background: "rgba(14,165,233,0.07)", border: "1px solid rgba(14,165,233,0.18)" }}>
          <Mail className="h-4 w-4 text-sky-400 flex-shrink-0" />
          <p className="text-xs text-slate-400 leading-relaxed">
            Check your inbox and spam folder. The code expires in{" "}
            <span className="text-slate-300 font-medium">10 minutes</span>.
          </p>
        </div>

        <form onSubmit={handleSubmit}>

          {/* OTP digit inputs */}
          <div className="flex gap-2.5 justify-center mb-5">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={d}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                disabled={loading}
                className={`
                  w-12 h-14 text-center text-xl font-bold rounded-xl
                  bg-white/[0.06] border text-white
                  focus:outline-none focus:ring-0
                  transition-all duration-150
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${error
                    ? "border-red-500/50 bg-red-500/5"
                    : d
                      ? "border-sky-500/60 bg-sky-500/8 shadow-[0_0_0_3px_rgba(14,165,233,0.1)]"
                      : "border-white/[0.14] focus:border-sky-500/50 focus:bg-white/[0.08]"}
                `}
                style={{ caretColor: "transparent" }}
                aria-label={`Digit ${i + 1}`}
              />
            ))}
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-5">
              <AlertCircle size={14} className="flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Submit button */}
          <Button
            type="submit"
            disabled={loading || digits.join("").length < 6}
            className="w-full bg-sky-500 hover:bg-sky-400 text-white font-semibold h-11
              shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-all duration-200"
          >
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying…</>
            ) : (
              isRegister ? "Verify Email" : "Confirm & Sign In"
            )}
          </Button>
        </form>

        {/* Resend code */}
        <div className="mt-5 pt-5 border-t border-white/[0.07] text-center">
          <p className="text-sm text-slate-500 mb-2">Didn&apos;t receive the code?</p>
          <button
            type="button"
            onClick={handleResend}
            disabled={resending || resendCooldown > 0}
            className="inline-flex items-center gap-2 text-sm font-medium text-sky-400
              hover:text-sky-300 transition-colors disabled:text-slate-600 disabled:cursor-not-allowed"
          >
            {resending ? (
              <><Loader2 size={14} className="animate-spin" /> Sending…</>
            ) : resendCooldown > 0 ? (
              <><RefreshCw size={14} /> Resend in {resendCooldown}s</>
            ) : (
              <><RefreshCw size={14} /> Resend code</>
            )}
          </button>
        </div>

        {/* Back link */}
        <div className="mt-4 text-center">
          <Link
            href={isRegister ? "/register" : "/login"}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ArrowLeft size={12} />
            {isRegister ? "Back to registration" : "Back to login"}
          </Link>
        </div>

      </Card>
    </div>
  );
}
