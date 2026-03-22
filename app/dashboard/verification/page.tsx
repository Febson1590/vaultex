"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getStatusBg } from "@/lib/utils";
import {
  ShieldCheck, ShieldAlert, Clock, CheckCircle2, Upload,
  User, FileText, Camera, Loader2, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/db";

const steps = [
  { icon: User, title: "Personal Information", desc: "Full name, date of birth, nationality" },
  { icon: FileText, title: "Identity Document", desc: "Passport, driver's license, or national ID" },
  { icon: Camera, title: "Selfie Verification", desc: "Photo holding your ID document" },
];

export default function VerificationPage() {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [docType, setDocType] = useState("Passport");

  useEffect(() => {
    fetch("/api/user/verification").then((r) => r.json()).then((d) => {
      if (d.status) setStatus(d.status);
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    toast.success("Verification documents submitted! Our team will review within 1–3 business days.");
    setSubmitted(true);
    setStatus("PENDING");
    setLoading(false);
  };

  const statusConfig: Record<string, { icon: any; color: string; title: string; message: string }> = {
    APPROVED: { icon: ShieldCheck, color: "text-emerald-400", title: "Verified", message: "Your identity has been verified. You have full access to all platform features." },
    PENDING: { icon: Clock, color: "text-yellow-400", title: "Under Review", message: "Your verification is being reviewed. This typically takes 1–3 business days." },
    UNDER_REVIEW: { icon: Clock, color: "text-yellow-400", title: "Under Review", message: "Our compliance team is reviewing your documents." },
    REJECTED: { icon: AlertCircle, color: "text-red-400", title: "Rejected", message: "Your verification was rejected. Please resubmit with valid documents." },
  };

  const currentStatus = status && statusConfig[status];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Identity Verification</h1>
        <p className="text-sm text-slate-500 mt-0.5">Complete KYC to unlock full platform access</p>
      </div>

      {/* Current status */}
      {currentStatus && (
        <div className={`glass-card rounded-xl p-5 flex items-center gap-4 border ${status === "APPROVED" ? "border-emerald-500/20 bg-emerald-500/5" : status === "REJECTED" ? "border-red-500/20 bg-red-500/5" : "border-yellow-500/20 bg-yellow-500/5"}`}>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${status === "APPROVED" ? "bg-emerald-500/10" : status === "REJECTED" ? "bg-red-500/10" : "bg-yellow-500/10"}`}>
            <currentStatus.icon className={`h-6 w-6 ${currentStatus.color}`} />
          </div>
          <div>
            <div className={`text-base font-semibold ${currentStatus.color}`}>{currentStatus.title}</div>
            <div className="text-sm text-slate-400">{currentStatus.message}</div>
          </div>
        </div>
      )}

      {/* Steps */}
      <div className="grid grid-cols-3 gap-3">
        {steps.map((step, i) => (
          <div key={step.title} className="glass-card rounded-xl p-4 text-center">
            <div className="w-10 h-10 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mx-auto mb-3">
              <step.icon className="h-4 w-4 text-sky-400" />
            </div>
            <div className="text-xs font-semibold text-white mb-1">Step {i + 1}</div>
            <div className="text-xs text-slate-500 leading-tight">{step.title}</div>
          </div>
        ))}
      </div>

      {/* Form */}
      {(!status || status === "REJECTED") && !submitted && (
        <Card className="glass-card border-0 rounded-xl p-6">
          <h2 className="text-base font-semibold text-white mb-5">Submit Verification Documents</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400 uppercase tracking-widest">First Name</Label>
                <Input required placeholder="John" className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400 uppercase tracking-widest">Last Name</Label>
                <Input required placeholder="Doe" className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-10" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400 uppercase tracking-widest">Date of Birth</Label>
              <Input required type="date" className="bg-white/5 border-white/10 text-white h-10" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400 uppercase tracking-widest">Document Type</Label>
              <Select defaultValue="Passport" onValueChange={(v) => v !== null && setDocType(v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white h-10"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0d1e3a] border-sky-500/20 text-white">
                  {["Passport", "Driver's License", "National ID"].map((d) => (
                    <SelectItem key={d} value={d} className="hover:bg-sky-500/10 focus:bg-sky-500/10">{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400 uppercase tracking-widest">Document Number</Label>
              <Input required placeholder="e.g. A12345678" className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-10" />
            </div>

            {/* Upload areas */}
            {[
              { label: "Front of Document", desc: "Clear photo of the front side" },
              { label: "Selfie with Document", desc: "Hold document next to your face" },
            ].map((upload) => (
              <div key={upload.label} className="space-y-1.5">
                <Label className="text-xs text-slate-400 uppercase tracking-widest">{upload.label}</Label>
                <div className="border border-dashed border-white/10 rounded-lg p-6 text-center hover:border-sky-500/30 transition-colors cursor-pointer bg-white/3">
                  <Upload className="h-6 w-6 text-slate-500 mx-auto mb-2" />
                  <div className="text-xs text-slate-400">{upload.desc}</div>
                  <div className="text-xs text-slate-600 mt-1">PNG, JPG up to 8MB</div>
                </div>
              </div>
            ))}

            <Button type="submit" disabled={loading} className="w-full bg-sky-500 hover:bg-sky-400 text-white font-semibold h-11">
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : "Submit for Verification"}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
