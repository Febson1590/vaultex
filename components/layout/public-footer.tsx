import Link from "next/link";
import { Logo } from "@/components/logo";
import { Shield, Twitter, Linkedin, Github } from "lucide-react";

const footerLinks = {
  Platform: [
    { href: "/markets", label: "Markets" },
    { href: "/pricing", label: "Fees & Pricing" },
    { href: "/security", label: "Security" },
    { href: "/register", label: "Open Account" },
  ],
  Company: [
    { href: "/about", label: "About Us" },
    { href: "/contact", label: "Contact" },
    { href: "/contact", label: "Careers" },
    { href: "/contact", label: "Press" },
  ],
  Legal: [
    { href: "#", label: "Terms of Service" },
    { href: "#", label: "Privacy Policy" },
    { href: "#", label: "Risk Disclosure" },
    { href: "#", label: "AML Policy" },
  ],
  Support: [
    { href: "/dashboard/support", label: "Help Center" },
    { href: "/contact", label: "Submit a Ticket" },
    { href: "/security", label: "Report an Issue" },
    { href: "/contact", label: "Live Chat" },
  ],
};

export function PublicFooter() {
  return (
    <footer className="bg-[#020b18] border-t border-sky-500/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-10">
          <div className="col-span-2 md:col-span-1">
            <Logo size="md" href="/" className="mb-5" />
            <p className="text-sm text-slate-500 leading-relaxed mb-5">
              Institutional-grade crypto brokerage infrastructure built for professional traders and verified investors.
            </p>
            <div className="flex items-center gap-3">
              {[Twitter, Linkedin, Github].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 transition-colors"
                >
                  <Icon size={14} />
                </a>
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section}>
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-4">
                {section}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-500 hover:text-sky-400 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} Vaultex Market. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Shield size={12} className="text-sky-500" />
            <span>AES-256 encrypted · KYC / AML compliant · 99.9% uptime SLA</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
