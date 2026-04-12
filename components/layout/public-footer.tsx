import Link from "next/link";
import { Logo } from "@/components/logo";
import { Shield, Twitter, Linkedin, Github, Lock, FileCheck2, Eye } from "lucide-react";

const footerLinks: Record<string, { href: string; label: string }[]> = {
  Platform: [
    { href: "/markets",  label: "Markets"        },
    { href: "/pricing",  label: "Fees & Pricing" },
    { href: "/security", label: "Security"       },
    { href: "/register", label: "Open Account"   },
  ],
  Company: [
    { href: "/about",   label: "About Us" },
    { href: "/contact", label: "Contact"  },
  ],
  Support: [
    { href: "/help",     label: "Help Center"     },
    { href: "/contact",  label: "Contact Support" },
    { href: "/security", label: "Report an Issue" },
  ],
  Legal: [
    { href: "/terms",   label: "Terms of Service" },
    { href: "/privacy", label: "Privacy Policy"   },
    { href: "/risk",    label: "Risk Disclosure"  },
  ],
};

const trustRow = [
  { icon: Lock,       label: "TLS Secured"     },
  { icon: Eye,        label: "KYC Verified"    },
  { icon: FileCheck2, label: "Full Audit Trail" },
];

export function PublicFooter() {
  return (
    <footer className="relative bg-[#020b18] border-t border-white/[0.06]">
      {/* Top gradient hairline */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-px pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent, rgba(148,163,184,0.18), transparent)" }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10">
        {/* ── Main grid ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 md:gap-10">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-2">
            <Logo size="md" href="/" className="mb-4" />
            <p className="text-[13px] text-slate-500 leading-relaxed mb-5 max-w-xs">
              A premium crypto brokerage platform built for serious traders and verified investors.
              One terminal, every major market.
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
                    <Link
                      href={link.href}
                      className="text-[13px] text-slate-500 hover:text-sky-400 transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Bottom strip ──────────────────────────────────────────── */}
        <div className="mt-12 pt-6 border-t border-white/[0.05] flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-slate-600 text-center md:text-left leading-relaxed">
            © {new Date().getFullYear()} Vaultex Market. All rights reserved. Trading digital assets
            involves risk — review our <Link href="/risk" className="text-slate-400 hover:text-sky-400">Risk Disclosure</Link>.
          </p>
          <div className="flex items-center gap-2 text-[11px] text-slate-600">
            <Shield size={12} className="text-sky-500" />
            <span>Premium Brokerage Infrastructure</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
