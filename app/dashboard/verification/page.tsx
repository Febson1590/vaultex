"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ShieldCheck, Clock, Upload, Loader2, AlertCircle,
  FileImage, X, ShieldAlert, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useUploadThing } from "@/lib/uploadthing";

// ── Redirect-reason config ────────────────────────────────────────────────────
// Shown when a user lands here after being blocked from a protected page/action.
const REDIRECT_REASON: Record<string, {
  icon: React.ElementType; color: string; bg: string; border: string;
  title: string; message: string;
}> = {
  not_submitted: {
    icon: ShieldAlert, color: "text-yellow-400",
    bg: "bg-yellow-500/[0.07]", border: "border-yellow-500/25",
    title: "Verification Required",
    message: "Complete identity verification to begin trading and investing.",
  },
  pending: {
    icon: Clock, color: "text-sky-400",
    bg: "bg-sky-500/[0.07]", border: "border-sky-500/25",
    title: "Verification Pending",
    message: "Your verification is pending approval. You'll be notified once it's reviewed.",
  },
  rejected: {
    icon: XCircle, color: "text-red-400",
    bg: "bg-red-500/[0.07]", border: "border-red-500/25",
    title: "Verification Rejected",
    message: "Your submission was rejected. Please resubmit with valid documents to continue.",
  },
};

/* ── Status display config ──────────────────────────────────────────── */
const STATUS_CONFIG: Record<string, {
  icon: React.ElementType; color: string; bg: string; border: string;
  title: string; message: string;
}> = {
  APPROVED: {
    icon: ShieldCheck, color: "text-emerald-400",
    bg: "bg-emerald-500/5", border: "border-emerald-500/25",
    title: "Verified",
    message: "Your identity has been verified. You have full access to all platform features.",
  },
  PENDING: {
    icon: Clock, color: "text-yellow-400",
    bg: "bg-yellow-500/5", border: "border-yellow-500/25",
    title: "Under Review",
    message: "Your verification is being reviewed. This typically takes 1–3 business days.",
  },
  UNDER_REVIEW: {
    icon: Clock, color: "text-yellow-400",
    bg: "bg-yellow-500/5", border: "border-yellow-500/25",
    title: "Under Review",
    message: "Our compliance team is actively reviewing your documents.",
  },
  REJECTED: {
    icon: AlertCircle, color: "text-red-400",
    bg: "bg-red-500/5", border: "border-red-500/25",
    title: "Rejected",
    message: "Your verification was rejected. Please resubmit with valid documents.",
  },
};

/* ───────────────────────────────────────────────────────────────────────────── */
export default function VerificationPage() {
  const searchParams = useSearchParams();
  // ?status= is set by server-side redirects from KYC-gated pages/actions
  const redirectStatus = searchParams.get("status") ?? null;
  const redirectReason = redirectStatus ? REDIRECT_REASON[redirectStatus] ?? null : null;

  const [status,        setStatus]        = useState<string | null>(null);
  const [rejectionNote, setRejectionNote] = useState<string | null>(null);
  const [loading,       setLoading]       = useState(false);
  const [docType,       setDocType]       = useState("Passport");
  const [docFile,       setDocFile]       = useState<File | null>(null);
  const [isDragging,    setIsDragging]    = useState(false);
  const [firstName,     setFirstName]     = useState("");
  const [lastName,      setLastName]      = useState("");
  const [dateOfBirth,   setDateOfBirth]   = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { startUpload } = useUploadThing("kycDocument");

  /* Load existing verification status + prefill user profile data */
  useEffect(() => {
    fetch("/api/user/verification")
      .then(r => r.json())
      .then(d => {
        if (d.status)      setStatus(d.status);
        if (d.notes)       setRejectionNote(d.notes);
        // Prefill name/DOB from the user's existing profile so the form
        // never starts blank when we already have the information.
        if (d.firstName)   setFirstName(d.firstName);
        if (d.lastName)    setLastName(d.lastName);
        if (d.dateOfBirth) setDateOfBirth(d.dateOfBirth);
      })
      .catch(() => {});
  }, []);

  /* ── File validation & setter ────────────────────────────────────────── */
  function handleFile(file: File | null) {
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      toast.error("Please upload a JPG, PNG, WEBP, or PDF file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("File must be under 8MB.");
      return;
    }
    setDocFile(file);
  }

  function clearFile() {
    setDocFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  /* ── Drag & drop handlers ─────────────────────────────────────────────── */
  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }
  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files[0] ?? null);
  }

  /* ── Submit ─────────────────────────────────────────────────────────────────────────────────── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!docFile) {
      toast.error("Please upload a photo of your document before submitting.");
      return;
    }

    setLoading(true);

    try {
      // 1. Upload document to UploadThing — get a permanent URL
      let frontUrl: string | null = null;
      try {
        const uploaded = await startUpload([docFile]);
        frontUrl = uploaded?.[0]?.url ?? null;
      } catch {
        // Upload failed — proceed without URL; admin still sees the record
      }

      // 2. Save the verification record to the database
      const res = await fetch("/api/user/verification", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType: docType,
          frontUrl,
          firstName:   firstName   || undefined,
          lastName:    lastName    || undefined,
          dateOfBirth: dateOfBirth || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        toast.error(data.error || "Submission failed. Please try again.");
        setLoading(false);
        return;
      }

      toast.success("Verification submitted! Our compliance team will review within 1–3 business days.");
      setStatus("PENDING");
    } catch {
      toast.error("Submission failed. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const currentStatus = status ? STATUS_CONFIG[status] : null;

  /* ── Shared input class ────────────────────────────────────────────────────────── */
  const inputCls = "bg-white/[0.06] border-white/[0.18] text-white placeholder:text-slate-500 h-10 focus:border-sky-500/70 focus:bg-white/[0.08] hover:border-white/30 transition-colors";

  /* ── Label class ──────────────────────────────────────────────────────────────────────── */
  const labelCls = "text-xs font-medium text-slate-300 uppercase tracking-widest";

  /* ═══════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-white">Identity Verification</h1>
        <p className="text-sm text-slate-400 mt-0.5">Complete KYC to unlock full platform access</p>
      </div>

      {/* ── Redirect-reason banner (shown when user was blocked by KYC gate) ── */}
      {redirectReason && !currentStatus && (
        <div className={`rounded-xl p-4 flex items-center gap-4 border ${redirectReason.bg} ${redirectReason.border}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${redirectReason.bg}`}>
            <redirectReason.icon className={`h-5 w-5 ${redirectReason.color}`} />
          </div>
          <div>
            <p className={`text-sm font-bold ${redirectReason.color}`}>{redirectReason.title}</p>
            <p className="text-xs text-slate-400 mt-0.5">{redirectReason.message}</p>
          </div>
        </div>
      )}

      {/* ── Status banner ────────────────────────────────────────────────────── */}
      {currentStatus && (
        <div className={`glass-card rounded-xl p-5 flex items-start gap-4 border ${currentStatus.bg} ${currentStatus.border}`}>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${currentStatus.bg}`}>
            <currentStatus.icon className={`h-6 w-6 ${currentStatus.color}`} />
          </div>
          <div>
            <div className={`text-base font-semibold ${currentStatus.color}`}>{currentStatus.title}</div>
            <div className="text-sm text-slate-300">{currentStatus.message}</div>
            {status === "REJECTED" && rejectionNote && (
              <div className="mt-2 text-xs text-red-300/80 bg-red-500/[0.06] border border-red-500/15 rounded-md px-3 py-2">
                <span className="font-semibold text-red-400">Reason:</span> {rejectionNote}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── KYC Form — hidden once pending/approved ───────────────────────────────────── */}
      {(!status || status === "REJECTED") && (
        <Card className="glass-card border-0 rounded-xl p-6
          shadow-[0_8px_40px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.07]">

          <h2 className="text-base font-semibold text-white mb-6">
            Submit Verification Documents
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* First Name + Last Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className={labelCls}>First Name <span className="text-red-400">*</span></Label>
                <Input
                  required
                  placeholder="First name"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <Label className={labelCls}>Last Name <span className="text-red-400">*</span></Label>
                <Input
                  required
                  placeholder="Last name"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Date of Birth */}
            <div className="space-y-1.5">
              <Label className={labelCls}>Date of Birth <span className="text-red-400">*</span></Label>
              <Input
                required
                type="date"
                value={dateOfBirth}
                onChange={e => setDateOfBirth(e.target.value)}
                className={`${inputCls} [color-scheme:dark]`}
              />
            </div>

            {/* Document Type */}
            <div className="space-y-1.5">
              <Label className={labelCls}>Document Type <span className="text-red-400">*</span></Label>
              <Select defaultValue="Passport" onValueChange={v => v && setDocType(v)}>
                <SelectTrigger className="bg-white/[0.06] border-white/[0.18] text-white h-10 focus:border-sky-500/70 hover:border-white/30 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0d1e3a] border-sky-500/20 text-white">
                  {["Passport", "Driver's License", "National ID"].map(d => (
                    <SelectItem key={d} value={d} className="text-white hover:bg-sky-500/10 focus:bg-sky-500/10">
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ── Document Upload ────────────────────────────────────────────────────── */}
            <div className="space-y-1.5">
              <Label className={labelCls}>
                Document Photo <span className="text-red-400">*</span>
              </Label>

              {/* Hidden real file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={e => handleFile(e.target.files?.[0] ?? null)}
              />

              {docFile ? (
                /* ── File selected — show name + clear button ──────────── */
                <div className="flex items-center gap-3 rounded-lg px-4 py-3
                  bg-sky-500/[0.07] border border-sky-500/30 transition-all">
                  <FileImage className="h-5 w-5 text-sky-400 flex-shrink-0" />
                  <span className="text-sm text-white flex-1 truncate font-medium">
                    {docFile.name}
                  </span>
                  <span className="text-xs text-slate-500 flex-shrink-0">
                    {(docFile.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                  <button
                    type="button"
                    onClick={clearFile}
                    className="text-slate-400 hover:text-white transition-colors flex-shrink-0 ml-1"
                    title="Remove file"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                /* ── Drop zone ────────────────────────────────────────────────────────── */
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={e => e.key === "Enter" && fileInputRef.current?.click()}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  className={`
                    rounded-xl px-6 py-10 text-center cursor-pointer select-none
                    border border-dashed transition-all duration-200
                    ${isDragging
                      ? "border-sky-500/70 bg-sky-500/[0.10] scale-[1.01]"
                      : "border-white/[0.22] hover:border-sky-500/50 hover:bg-white/[0.03]"}
                  `}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors ${isDragging ? "bg-sky-500/20" : "bg-white/[0.06]"}`}>
                    <Upload className={`h-5 w-5 transition-colors ${isDragging ? "text-sky-400" : "text-slate-400"}`} />
                  </div>
                  <div className="text-sm font-semibold text-white mb-1">
                    {isDragging ? "Drop your file here" : "Click to upload or drag & drop"}
                  </div>
                  <div className="text-xs text-slate-400">
                    {docType} — front side clearly visible
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    JPG, PNG, WEBP or PDF · Max 8MB
                  </div>
                </div>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-sky-500 hover:bg-sky-400 text-white font-semibold h-11
                shadow-lg shadow-sky-500/30 hover:shadow-sky-500/50 transition-all"
            >
              {loading
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</>
                : "Submit for Verification"
              }
            </Button>

          </form>
        </Card>
      )}

    </div>
  );
}