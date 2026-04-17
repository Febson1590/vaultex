import { Badge } from "@/components/ui/badge";
import {
  Shield, Lock, Eye, Server, KeyRound, AlertTriangle, FileCheck2,
  UserCheck, ScrollText, Bug,
} from "lucide-react";
import type { Metadata } from "next";
import { CONTACT } from "@/lib/company";

export const metadata: Metadata = { title: "Security" };

/* ── Authentication & account access ──────────────────────────────── */
const authenticationItems = [
  {
    icon: KeyRound,
    title: "Email one-time passcode on every sign-in",
    desc: "Users receive a one-time code by email each time they sign in. Codes expire after 10 minutes and a fresh code is required for every new session.",
  },
  {
    icon: Lock,
    title: "Bcrypt-hashed passwords",
    desc: "Passwords are hashed using bcrypt with a work factor appropriate for modern hardware. Plain-text passwords are never written to disk or logs.",
  },
  {
    icon: UserCheck,
    title: "Role-based admin access",
    desc: "Administrative actions are gated by role and scoped permissions. Only approved admin accounts can review KYC, approve deposits, or adjust balances.",
  },
];

/* ── Account monitoring / auditability ───────────────────────────── */
const monitoringItems = [
  {
    icon: ScrollText,
    title: "Account activity log",
    desc: "Every sign-in, balance change, deposit, withdrawal, and trade is written to an account activity log visible to both the user and our compliance team.",
  },
  {
    icon: Eye,
    title: "Admin action audit",
    desc: "Every admin action is recorded with the actor ID, target account, and timestamp so balance adjustments and approvals are fully traceable.",
  },
  {
    icon: FileCheck2,
    title: "Manual review of funds movement",
    desc: "Deposits and withdrawals are reviewed by a member of our finance team before funds move. Nothing is auto-approved on funded accounts.",
  },
];

/* ── Verification workflow ───────────────────────────────────────── */
const verificationItems = [
  {
    icon: Shield,
    title: "KYC before funding",
    desc: "An account cannot request a deposit or place an order until identity verification is approved. Browsing and account review are available before KYC.",
  },
  {
    icon: FileCheck2,
    title: "Manual document review",
    desc: "Our compliance team manually reviews each uploaded ID document, name, and date of birth. Typical review time is one business day during published hours.",
  },
];

/* ── Operational safeguards ───────────────────────────────────────── */
const operationalItems = [
  {
    icon: Server,
    title: "Managed infrastructure",
    desc: "The platform runs on managed cloud infrastructure with regular backups and standard hardening practices. We do not operate physical hardware ourselves.",
  },
  {
    icon: Lock,
    title: "TLS in transit",
    desc: "All traffic between browsers and our servers is sent over HTTPS with modern TLS settings. Sensitive credentials are never sent in plain text.",
  },
  {
    icon: AlertTriangle,
    title: "Suspicious-activity flagging",
    desc: "Unusual patterns on funded accounts are flagged for manual review before any funds are moved off the platform.",
  },
];

export default function SecurityPage() {
  return (
    <div className="min-h-screen pt-28 pb-16 hero-bg">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Header ────────────────────────────────────────────────── */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-sky-500/10 text-sky-400 border-sky-500/20 text-xs tracking-widest uppercase">
            Security Center
          </Badge>
          <h1 className="text-4xl font-bold text-white mb-3">How we protect accounts</h1>
          <p className="text-[14px] text-slate-400 max-w-2xl mx-auto">
            An honest summary of the security controls implemented on Vaultex Market today. We
            describe only what is actually in place — nothing aspirational.
          </p>
        </div>

        {/* ── Authentication section ─────────────────────────────── */}
        <SecuritySection
          eyebrow="Section 01"
          title="Authentication"
          items={authenticationItems}
        />

        {/* ── Monitoring section ─────────────────────────────────── */}
        <SecuritySection
          eyebrow="Section 02"
          title="Account monitoring &amp; auditability"
          items={monitoringItems}
        />

        {/* ── Verification section ───────────────────────────────── */}
        <SecuritySection
          eyebrow="Section 03"
          title="Identity verification"
          items={verificationItems}
        />

        {/* ── Operational safeguards section ─────────────────────── */}
        <SecuritySection
          eyebrow="Section 04"
          title="Operational safeguards"
          items={operationalItems}
        />

        {/* ── Incident reporting ─────────────────────────────────── */}
        <div className="glass-card rounded-2xl p-7 border border-emerald-500/20 bg-emerald-500/[0.03]">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <Bug className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white mb-2">Incident reporting &amp; responsible disclosure</h2>
              <p className="text-sm text-slate-400 leading-relaxed mb-3">
                Found a security issue? Please report it privately and give us a reasonable window
                to respond before any public disclosure. We do not initiate legal action against
                good-faith researchers who follow responsible-disclosure practices.
              </p>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px]">
                <span className="text-slate-500">Contact:</span>
                <a href={`mailto:${CONTACT.securityEmail}`} className="text-sky-400 hover:text-sky-300 font-mono">
                  {CONTACT.securityEmail}
                </a>
                <span className="text-slate-500">Response window: <span className="text-slate-300">{CONTACT.securityResponseWindow}</span></span>
                <span className="text-slate-500">Business hours: <span className="text-slate-300">{CONTACT.businessHours}</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Reusable section renderer ───────────────────────────────────── */
function SecuritySection({
  eyebrow, title, items,
}: {
  eyebrow: string;
  title:   string;
  items:   { icon: React.ElementType; title: string; desc: string }[];
}) {
  return (
    <section className="mb-8">
      <div className="flex items-baseline gap-3 mb-4">
        <span className="text-[10px] uppercase tracking-widest text-sky-400 font-semibold">{eyebrow}</span>
        <h2 className="text-xl font-bold text-white" dangerouslySetInnerHTML={{ __html: title }} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {items.map((it) => (
          <div key={it.title} className="glass-card glass-card-hover rounded-xl p-5">
            <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-3">
              <it.icon className="h-4 w-4 text-sky-400" />
            </div>
            <h3 className="text-[13.5px] font-semibold text-white mb-1.5">{it.title}</h3>
            <p className="text-[12px] text-slate-400 leading-relaxed">{it.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
