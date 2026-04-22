"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Lock, Loader2, AlertCircle, Eye, EyeOff,
  ShieldCheck, CheckCircle2, KeyRound,
} from "lucide-react";
import { changePassword } from "@/lib/actions/user";
import { logoutUser } from "@/lib/actions/auth";

interface Props {
  email:             string;
  name:              string;
  passwordUpdatedAt: string;
}

/**
 * Admin-facing password-change form. Uses the same `changePassword`
 * server action that dashboard users use — it is role-agnostic and
 * already enforces bcrypt-verify on the current password, length +
 * complexity checks on the new one, and updates the hash in place.
 *
 * After a successful change we call `logoutUser()` to end the current
 * admin JWT session. Since NextAuth uses stateless JWTs (not DB
 * sessions), this is the most reliable way to "invalidate the current
 * session" without extra infrastructure — the admin must sign in again
 * with the new password, and any other devices still holding the old
 * JWT will lose access on next navigation because their next server
 * action will bcrypt-mismatch against the new hash.
 */
export function AdminSecurityClient({ email, name, passwordUpdatedAt }: Props) {
  const router = useRouter();

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd,     setNewPwd]     = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  function localCheck(): string | null {
    if (!currentPwd) return "Enter your current password";
    if (!newPwd)     return "Enter a new password";
    if (newPwd.length < 8) return "New password must be at least 8 characters";
    if (!/[A-Z]/.test(newPwd)) return "New password must include an uppercase letter";
    if (!/[0-9]/.test(newPwd)) return "New password must include a number";
    if (newPwd !== confirmPwd)  return "New passwords do not match";
    if (newPwd === currentPwd)  return "New password must be different from the current password";
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const local = localCheck();
    if (local) { setError(local); return; }

    setLoading(true);
    try {
      const r = await changePassword({ currentPassword: currentPwd, newPassword: newPwd });
      if (r?.error) {
        setError(r.error);
        setLoading(false);
        return;
      }
      toast.success("Password updated", {
        description: "Your new password is now required to sign in.",
      });
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");

      // End the current admin session so the next request goes through
      // a fresh sign-in with the new password. Acts as a session
      // refresh for stateless JWT sessions.
      await logoutUser();
      // logoutUser triggers a redirect — keep the spinner until it does.
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  const lastChanged = new Date(passwordUpdatedAt);
  const lastChangedLabel = isNaN(lastChanged.getTime())
    ? "—"
    : lastChanged.toLocaleString("en-US", {
        month: "short", day: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Security</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Manage the sign-in credentials for this admin account.
        </p>
      </div>

      {/* Account identity card */}
      <Card className="glass-card border-0 rounded-xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-sky-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-white truncate">{name}</div>
            <div className="text-[12px] text-slate-500 truncate">{email}</div>
          </div>
          <div className="text-right">
            <div className="text-[9.5px] uppercase tracking-widest text-slate-600 font-semibold">Record updated</div>
            <div className="text-[11px] text-slate-400 tabular-nums">{lastChangedLabel}</div>
          </div>
        </div>
      </Card>

      {/* Change password */}
      <Card className="glass-card border-0 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <KeyRound className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Change Admin Password</h2>
            <p className="text-xs text-slate-500">
              You&rsquo;ll be signed out after a successful change and must sign in again.
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 text-[12px] text-red-300 bg-red-500/10 border border-red-500/25 rounded-lg px-3 py-2.5">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400 uppercase tracking-widest">Current password</Label>
            <div className="relative">
              <Input
                required
                type={showCurrent ? "text" : "password"}
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                placeholder="Enter your current password"
                autoComplete="current-password"
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                aria-label={showCurrent ? "Hide current password" : "Show current password"}
              >
                {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400 uppercase tracking-widest">New password</Label>
            <div className="relative">
              <Input
                required
                type={showNew ? "text" : "password"}
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="Min 8 characters, 1 uppercase, 1 number"
                autoComplete="new-password"
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                aria-label={showNew ? "Hide new password" : "Show new password"}
              >
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <ul className="text-[10.5px] text-slate-500 mt-1 space-y-0.5">
              <li className={newPwd.length >= 8        ? "text-emerald-400" : ""}>• at least 8 characters</li>
              <li className={/[A-Z]/.test(newPwd)      ? "text-emerald-400" : ""}>• at least one uppercase letter</li>
              <li className={/[0-9]/.test(newPwd)      ? "text-emerald-400" : ""}>• at least one number</li>
            </ul>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400 uppercase tracking-widest">Confirm new password</Label>
            <Input
              required
              type="password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              placeholder="Re-enter the new password"
              autoComplete="new-password"
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-10"
            />
            {confirmPwd && newPwd && confirmPwd === newPwd && (
              <p className="text-[11px] text-emerald-400 inline-flex items-center gap-1 mt-1">
                <CheckCircle2 size={12} /> Passwords match
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setCurrentPwd(""); setNewPwd(""); setConfirmPwd(""); setError(""); }}
              disabled={loading}
              className="border-white/10 text-slate-300 hover:text-white h-10 px-4"
            >
              Clear
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-sky-500 hover:bg-sky-400 text-white font-semibold h-10"
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
              ) : (
                <><Lock className="mr-2 h-4 w-4" /> Save password</>
              )}
            </Button>
          </div>
        </form>
      </Card>

      <p className="text-[11px] text-slate-500 leading-relaxed max-w-xl">
        After the password is updated, the old password stops working immediately.
        You&rsquo;ll be signed out of this session and need to sign in with the new
        password. Any other open admin sessions will also lose access on their next
        server request because the stored hash no longer matches.
      </p>
    </div>
  );
}
