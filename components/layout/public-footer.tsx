import Link from "next/link";
import { Logo } from "@/components/logo";
import {
  Shield, Twitter, Linkedin, Github, Lock, FileCheck2, Eye,
  Mail, Clock, Building2, AlertTriangle,
} from "lucide-react";
import { COMPANY, CONTACT, RISK_NOTICE } from "@/lib/company";

/* ── Footer link structure ───────────────────────────────────────────── */
const footerLinks: Record<string, { href: string; label: string; external?: boolean }[]> = {
  Platform: [
    { href: "/markets",          label: "Markets"         },
    { href: "/#trade-terminal",  label: "Trade Terminal"  },
    { href: "/pricing",          label: "Fees & Pricing"  },
    { href: "/register",         label: "Open Account"    },
  ],
  Company: [
    { href: "/about",   label: "About Us" },
    { href: "/contact", label: "Contact"  },
    { href: "/security", label: "Security Center" },
  ],
  Support: [
    { href: "/help",                                       label: "Help Center"      },
    { href: `mailto:${CONTACT.supportEmail}`,              label: "Email Support",    external: true },
    { href: `mailto:${CONTACT.securityEmail}`,             label: "Report a Security Issue", external: true },
    { href: `mailto:${CONTACT.complianceEmail}`,           label: "Compliance / Escalation", external: true },
  ],
  Legal: [
    { href: "/terms",   label: "Terms of Service" },
    { href: "/privacy", label: "Privacy Policy"   },
    { href: "/risk",    label: "Risk Disclosure"  },
  ],
};

const trustRow = [
  { icon: Lock,       label: "TLS transport"     },
  { icon: Eye,        label: "Manual KYC review" },
  { icon: FileCheck2, label: "Activity log"      },
];

export function PublicFooter() {
  return (
    <footer className="relative bg-[#020b18] border-t border-white/[0.06]">
      {/* Top gradient hairline */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-px pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent, rgba(148,163,184,0.18), transparent)" }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-8">

        {/* ── Main grid ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 md:gap-10">

          {/* Brand + trust */}
          <div className="col-span-2 md:col-span-2">
            <Logo size="md" href="/" className="mb-4" />
            <p className="text-[13px] text-slate-500 leading-relaxed mb-5 max-w-xs">
              A digital-asset brokerage focused on monitored onboarding, transparent pricing, and
              security-focused account controls.
            </p>

            {/* Trust row */}
            <div className="flex flex-wrap items-center gap-2 mb-5">
              {trustRow.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 px-2.5 h-6 rounded-md text-[10px] font-semibold tracking-wide text-slate-400 bg-white/[0.03] border border-white/[0.07]"
                >
                  <Icon size={11} className="text-sky-400" />
                  {label}
                </span>
              ))}
            </div>

            {/* Socials */}
            <div className="flex items-center gap-2">
              {[Twitter, Linkedin, Github].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label="Social link"
                  className="w-9 h-9 rounded-md bg-white/[0.03] border border-white/[0.07] flex items-center justify-center text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 hover:border-sky-500/25 transition-all duration-200"
                >
                  <Icon size={14} />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section}>
              <h4 className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.15em] mb-4">
                {section}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a
                        href={link.href}
                        className="text-[13px] text-slate-500 hover:text-sky-400 transition-colors duration-200"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-[13px] text-slate-500 hover:text-sky-400 transition-colors duration-200"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Company information row ──────────────────────────────── */}
        <div className="mt-10 pt-6 border-t border-white/[0.05]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-[12px]">
            <div className="flex items-start gap-2.5">
              <Building2 size={13} className="text-slate-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold mb-0.5">Legal entity</div>
                <div className="text-slate-400">{COMPANY.legalName}</div>
                <div className="text-slate-600 text-[11px] mt-0.5">{COMPANY.jurisdiction}</div>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Mail size={13} className="text-slate-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold mb-0.5">Support</div>
                <a href={`mailto:${CONTACT.supportEmail}`} className="text-slate-400 hover:text-sky-400 transition-colors break-all">
                  {CONTACT.supportEmail}
                </a>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Shield size={13} className="text-slate-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold mb-0.5">Security</div>
                <a href={`mailto:${CONTACT.securityEmail}`} className="text-slate-400 hover:text-sky-400 transition-colors break-all">
                  {CONTACT.securityEmail}
                </a>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Clock size={13} className="text-slate-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold mb-0.5">Business hours</div>
                <div className="text-slate-400">{CONTACT.businessHours}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Risk warning ─────────────────────────────────────────── */}
        <div className="mt-7 pt-5 border-t border-white/[0.05]">
          <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-yellow-500/[0.03] border border-yellow-500/[0.15]">
            <AlertTriangle size={13} className="text-yellow-400/80 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-500 leading-relaxed">
              <strong className="text-yellow-400/90">Risk warning:</strong> {RISK_NOTICE}{" "}
              Nothing on this website constitutes investment, tax, or legal advice. Read the full{" "}
              <Link href="/risk" className="text-slate-400 hover:text-sky-400">Risk Disclosure</Link>{" "}
              before funding an account.
            </p>
          </div>
        </div>

        {/* ── Copyright ────────────────────────────────────────────── */}
        <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-slate-600 text-center md:text-left">
            © {new Date().getFullYear()} {COMPANY.brand}. All rights reserved.
          </p>
          <p className="text-[11px] text-slate-600 text-center md:text-right">
            {COMPANY.legalName} · {COMPANY.jurisdiction}
          </p>
        </div>
      </div>
    </footer>
  );
}
