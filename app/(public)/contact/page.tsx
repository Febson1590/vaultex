import { Badge } from "@/components/ui/badge";
import {
  Mail, LifeBuoy, Shield, Clock, Building2, AlertOctagon,
  Scale,
} from "lucide-react";
import type { Metadata } from "next";
import { ContactForm } from "./contact-form";
import { COMPANY, CONTACT } from "@/lib/company";

export const metadata: Metadata = { title: "Contact" };

/* ── Primary channels ────────────────────────────────────────────────── */
const channels = [
  {
    icon:  Mail,
    title: "General Support",
    value: CONTACT.supportEmail,
    href:  `mailto:${CONTACT.supportEmail}`,
    sub:   `Response ${CONTACT.generalResponseWindow} during published hours.`,
  },
  {
    icon:  LifeBuoy,
    title: "Dashboard Support (Verified Users)",
    value: "Submit from the Dashboard",
    href:  "/dashboard/support",
    sub:   "Account, deposit, withdrawal, and trade questions are routed directly to our team.",
  },
  {
    icon:  Shield,
    title: "Security Disclosures",
    value: CONTACT.securityEmail,
    href:  `mailto:${CONTACT.securityEmail}`,
    sub:   `Responsible disclosure reviewed ${CONTACT.securityResponseWindow}.`,
  },
  {
    icon:  Scale,
    title: "Compliance & Escalations",
    value: CONTACT.complianceEmail,
    href:  `mailto:${CONTACT.complianceEmail}`,
    sub:   "Use this channel if a support reply did not resolve your issue.",
  },
];

/* ── Secondary info (hours, identity) ────────────────────────────────── */
const meta = [
  { icon: Clock,     title: "Business Hours", value: CONTACT.businessHours },
  { icon: Building2, title: "Legal entity",   value: COMPANY.legalName      },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen pt-28 pb-16 hero-bg">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-sky-500/10 text-sky-400 border-sky-500/20 text-xs tracking-widest uppercase">
            Contact
          </Badge>
          <h1 className="text-4xl font-bold text-white mb-3">Support &amp; escalation channels</h1>
          <p className="text-[14px] text-slate-400 max-w-xl mx-auto">
            Pick the channel that fits your request. Verified users should submit tickets from
            inside the dashboard so they are linked to the right account automatically.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">

          {/* ── Left column: channels + meta ───────────────────────── */}
          <div className="lg:col-span-2 space-y-3">
            {channels.map((item) => (
              <a
                key={item.title}
                href={item.href}
                className="block glass-card glass-card-hover rounded-xl p-5 group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center flex-shrink-0">
                    <item.icon className="h-4 w-4 text-sky-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-0.5">{item.title}</div>
                    <div className="text-sm font-semibold text-white group-hover:text-sky-400 transition-colors break-all">
                      {item.value}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 leading-relaxed">{item.sub}</div>
                  </div>
                </div>
              </a>
            ))}

            <div className="grid grid-cols-2 gap-3 pt-2">
              {meta.map((item) => (
                <div key={item.title} className="glass-card rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <item.icon size={12} className="text-slate-500" />
                    <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                      {item.title}
                    </span>
                  </div>
                  <div className="text-sm text-slate-200 font-medium">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right column: intake form ──────────────────────────── */}
          <div className="lg:col-span-3 space-y-4">

            {/* Intake guidance */}
            <div className="glass-card rounded-xl p-5 border border-sky-500/15 bg-sky-500/[0.03] flex items-start gap-3">
              <AlertOctagon size={16} className="text-sky-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-[13px] font-semibold text-white mb-1">
                  Before you send
                </div>
                <p className="text-[12px] text-slate-400 leading-relaxed">
                  For account, deposit, withdrawal, or trade issues — please sign in and submit a
                  ticket from the dashboard. It attaches your account ID automatically, which lets
                  us respond faster and verify ownership.
                </p>
              </div>
            </div>

            <ContactForm />

          </div>
        </div>
      </div>
    </div>
  );
}
