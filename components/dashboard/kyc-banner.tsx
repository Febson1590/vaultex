"use client";

import Link from "next/link";
import { ShieldAlert, Clock, XCircle, ChevronRight } from "lucide-react";
import type { KycStatus } from "@/lib/kyc";

const CONFIG: Record<
  Exclude<KycStatus, "approved">,
  { icon: typeof ShieldAlert; color: string; bg: string; border: string; title: string; message: string; cta: string }
> = {
  not_submitted: {
    icon: ShieldAlert,
    color: "text-yellow-400",
    bg: "bg-yellow-500/[0.07]",
    border: "border-yellow-500/25",
    title: "Identity verification required",
    message: "Complete KYC to unlock deposits, withdrawals, and investing.",
    cta: "Verify Now",
  },
  pending: {
    icon: Clock,
    color: "text-sky-400",
    bg: "bg-sky-500/[0.07]",
    border: "border-sky-500/25",
    title: "Verification under review",
    message: "Our compliance team is reviewing your documents. This typically takes 1–3 business days.",
    cta: "View Status",
  },
  rejected: {
    icon: XCircle,
    color: "text-red-400",
    bg: "bg-red-500/[0.07]",
    border: "border-red-500/25",
    title: "Verification rejected",
    message: "Please resubmit with valid documents to unlock full platform access.",
    cta: "Resubmit",
  },
};

interface KycBannerProps {
  kycStatus: KycStatus;
  className?: string;
}

/**
 * Shared KYC restriction banner — shows an inline notice when KYC is not
 * approved. Renders nothing for approved users.
 */
export function KycBanner({ kycStatus, className }: KycBannerProps) {
  if (kycStatus === "approved") return null;

  const cfg = CONFIG[kycStatus];
  const Icon = cfg.icon;

  return (
    <div className={`rounded-xl p-4 flex items-center gap-4 border ${cfg.bg} ${cfg.border} ${className ?? ""}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
        <Icon className={`h-5 w-5 ${cfg.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${cfg.color}`}>{cfg.title}</p>
        <p className="text-xs text-slate-400 mt-0.5">{cfg.message}</p>
      </div>
      <Link
        href="/dashboard/verification"
        className={`flex-shrink-0 inline-flex items-center gap-1 text-xs font-semibold ${cfg.color} hover:underline`}
      >
        {cfg.cta} <ChevronRight size={12} />
      </Link>
    </div>
  );
}
