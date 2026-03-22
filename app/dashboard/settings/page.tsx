"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { updateProfile } from "@/lib/actions/user";
import { User, Mail, Phone, MapPin, Globe, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

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
          <div className="flex items-center justify-between p-4 bg-white/3 rounded-lg">
            <div>
              <div className="text-sm font-medium text-white">Password</div>
              <div className="text-xs text-slate-500">Last changed: never</div>
            </div>
            <Button size="sm" variant="outline" className="border-white/10 text-slate-300 hover:bg-white/5 text-xs">Change</Button>
          </div>
          <div className="flex items-center justify-between p-4 bg-white/3 rounded-lg">
            <div>
              <div className="text-sm font-medium text-white">Two-Factor Authentication</div>
              <div className="text-xs text-slate-500">Add an extra layer of security</div>
            </div>
            <Button size="sm" variant="outline" className="border-white/10 text-slate-300 hover:bg-white/5 text-xs">Enable</Button>
          </div>
          <div className="flex items-center justify-between p-4 bg-white/3 rounded-lg">
            <div>
              <div className="text-sm font-medium text-white">Login Notifications</div>
              <div className="text-xs text-slate-500">Get notified of new sign-ins</div>
            </div>
            <Button size="sm" variant="outline" className="border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 text-xs">Enabled</Button>
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
