"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { updateProfile, changePassword } from "@/lib/actions/user";
import { User, Mail, Phone, MapPin, Globe, Loader2, CheckCircle2, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  /* ── Password change state ──────────────────────────────── */
  const [showPwdForm, setShowPwdForm]   = useState(false);
  const [pwdLoading, setPwdLoading]     = useState(false);
  const [pwdError, setPwdError]         = useState("");
  const [currentPwd, setCurrentPwd]     = useState("");
  const [newPwd, setNewPwd]             = useState("");
  const [confirmPwd, setConfirmPwd]     = useState("");
  const [showCurrent, setShowCurrent]   = useState(false);
  const [showNew, setShowNew]           = useState(false);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwdError("");

    if (newPwd !== confirmPwd) { setPwdError("Passwords do not match"); return; }
    if (newPwd.length < 8) { setPwdError("Password must be at least 8 characters"); return; }

    setPwdLoading(true);
    try {
      const result = await changePassword({ currentPassword: currentPwd, newPassword: newPwd });
      if (result?.error) { setPwdError(result.error); }
      else {
        toast.success("Password changed successfully");
        setShowPwdForm(false);
        setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
      }
    } catch { setPwdError("An unexpected error occurred"); }
    finally { setPwdLoading(false); }
  }

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      await updateProfile({
        firstName: form.get("firstName") as string,
        lastName: form.get("lastName") as string,
        phone: form.get("phone") as string,
        country: form.get("country") as string,
        city: form.get("city") as string,
        address: form.get("address") as string,
      });
      setSaved(true);
      toast.success("Profile updated successfully!");
      setTimeout(() => setSaved(false), 3000);
    } catch { toast.error("Failed to save."); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Account Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your profile and account preferences</p>
      </div>

      {/* Profile */}
      <Card className="glass-card border-0 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
            <User className="h-5 w-5 text-sky-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Personal Information</h2>
            <p className="text-xs text-slate-500">Update your profile details</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400 uppercase tracking-widest">First Name</Label>
              <Input name="firstName" placeholder="John" className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400 uppercase tracking-widest">Last Name</Label>
              <Input name="lastName" placeholder="Doe" className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-10" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400 uppercase tracking-widest">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input name="phone" placeholder="+1 (555) 000-0000" className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-10" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400 uppercase tracking-widest">Country</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input name="country" placeholder="United States" className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-10" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400 uppercase tracking-widest">City</Label>
              <Input name="city" placeholder="New York" className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400 uppercase tracking-widest">Zip Code</Label>
              <Input name="zipCode" placeholder="10001" className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-10" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400 uppercase tracking-widest">Street Address</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input name="address" placeholder="123 Main Street" className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-10" />
            </div>
          </div>

          <Button type="submit" disabled={loading || saved} className={`w-full h-11 font-semibold transition-all ${saved ? "bg-emerald-500 text-white" : "bg-sky-500 hover:bg-sky-400 text-white"}`}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
              : saved ? <><CheckCircle2 className="mr-2 h-4 w-4" /> Saved!</>
              : "Save Changes"}
          </Button>
        </form>
      </Card>

      {/* Security */}
      <Card className="glass-card border-0 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Mail className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Security & Login</h2>
            <p className="text-xs text-slate-500">Manage your password and security options</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Password */}
          <div className="p-4 bg-white/3 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock className="h-4 w-4 text-slate-400" />
                <div>
                  <div className="text-sm font-medium text-white">Password</div>
                  <div className="text-xs text-slate-500">Change your account password</div>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setShowPwdForm(!showPwdForm); setPwdError(""); }}
                className="border-white/10 text-slate-300 hover:bg-white/5 text-xs"
              >
                {showPwdForm ? "Cancel" : "Change"}
              </Button>
            </div>

            {showPwdForm && (
              <form onSubmit={handlePasswordChange} className="mt-4 pt-4 border-t border-white/5 space-y-3">
                {pwdError && (
                  <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    <AlertCircle size={13} className="flex-shrink-0" /> {pwdError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-400">Current Password</Label>
                  <div className="relative">
                    <Input
                      required
                      type={showCurrent ? "text" : "password"}
                      value={currentPwd}
                      onChange={(e) => setCurrentPwd(e.target.value)}
                      placeholder="Enter current password"
                      className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-10 pr-10"
                    />
                    <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                      {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-400">New Password</Label>
                  <div className="relative">
                    <Input
                      required
                      type={showNew ? "text" : "password"}
                      value={newPwd}
                      onChange={(e) => setNewPwd(e.target.value)}
                      placeholder="Min 8 characters, 1 uppercase, 1 number"
                      className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-10 pr-10"
                    />
                    <button type="button" onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                      {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-400">Confirm New Password</Label>
                  <Input
                    required
                    type="password"
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    placeholder="Re-enter new password"
                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-10"
                  />
                </div>

                <Button type="submit" disabled={pwdLoading} className="w-full bg-sky-500 hover:bg-sky-400 text-white font-semibold h-10 text-sm">
                  {pwdLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Changing...</> : "Change Password"}
                </Button>
              </form>
            )}
          </div>

          {/* Login notifications */}
          <div className="flex items-center justify-between p-4 bg-white/3 rounded-lg">
            <div>
              <div className="text-sm font-medium text-white">Login Notifications</div>
              <div className="text-xs text-slate-500">Email OTP required on every sign-in</div>
            </div>
            <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
              Always On
            </span>
          </div>
        </div>
      </Card>

      {/* Danger zone */}
      <Card className="glass-card border-0 rounded-xl p-6 border border-red-500/10">
        <h2 className="text-base font-semibold text-red-400 mb-4">Danger Zone</h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-white">Close Account</div>
            <div className="text-xs text-slate-500">Permanently delete your account and all data</div>
          </div>
          <Button size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs">
            Close Account
          </Button>
        </div>
      </Card>
    </div>
  );
}
