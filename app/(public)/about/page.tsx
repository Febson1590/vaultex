import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Shield, FileCheck2, ArrowDownToLine, ArrowUpFromLine, HeadphonesIcon, UserCheck,
  Building2, MapPin, Mail, Clock,
} from "lucide-react";
import type { Metadata } from "next";
import { COMPANY, CONTACT, PLATFORM, RISK_NOTICE } from "@/lib/company";

export const metadata: Metadata = { title: "About" };

/* ── Operating model steps — how the platform actually works ────────── */
const operatingModel = [
  {
    icon: UserCheck,
    title: "Account opening",
    desc: "Users register with an email address and confirm it with a one-time passcode. Browsing the dashboard is available before verification; funding and trading are not.",
  },
  {
    icon: FileCheck2,
    title: "Identity verification (KYC)",
    desc: "Each account submits a government-issued ID along with name and date of birth. Our compliance team reviews every submission manually, typically within one business day.",
  },
  {
    icon: ArrowDownToLine,
    title: "Deposits",
    desc: "Users request a deposit through an admin-configured wallet address, optionally attaching a transfer reference and a proof screenshot. Our finance team reviews each request before the wallet is credited.",
  },
  {
    icon: ArrowUpFromLine,
    title: "Withdrawals",
    desc: "Withdrawals are submitted from the dashboard and reviewed by our finance team. Limits and processing times are shown before the user confirms the request.",
  },
  {
    icon: HeadphonesIcon,
    title: "Support & disputes",
    desc: `Verified users submit tickets directly from the dashboard. Responses are sent ${CONTACT.generalResponseWindow} during published hours. Escalations go to the compliance contact listed on the contact page.`,
  },
  {
    icon: Shield,
    title: "Security & monitoring",
    desc: "Every sign-in, deposit, trade, and withdrawal is written to an account activity log. Suspicious activity triggers a manual review before funds move.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen pt-28 pb-16 hero-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-sky-500/10 text-sky-400 border-sky-500/20 text-xs tracking-widest uppercase">
            About Vaultex
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-5">A focused crypto brokerage.</h1>
          <p className="text-[15px] text-slate-400 leading-relaxed max-w-2xl mx-auto">
            {COMPANY.brand} is a digital-asset brokerage platform built for traders who want a clean
            interface, a monitored onboarding process, and transparent pricing. We focus on
            {" "}{PLATFORM.listedAssets} of the most-traded digital assets quoted against {PLATFORM.quoteCurrency}.
          </p>
        </div>

        {/* ── What the platform is ─────────────────────────────────── */}
        <div className="glass-card rounded-2xl p-7 mb-6">
          <h2 className="text-lg font-bold text-white mb-3">What the platform is</h2>
          <p className="text-sm text-slate-400 leading-relaxed mb-3">
            Vaultex Market is an online brokerage for buying and selling major digital assets.
            The interface is built around the workflows a working trader actually uses: a market
            panel, a clean chart, an order book preview, and a consolidated buy/sell form.
          </p>
          <p className="text-sm text-slate-400 leading-relaxed">
            Every funded account goes through a manual identity check, and every deposit and
            withdrawal is reviewed by a human before funds move. The platform trades off some
            speed for a more controlled experience.
          </p>
        </div>

        {/* ── Who it is for ────────────────────────────────────────── */}
        <div className="glass-card rounded-2xl p-7 mb-8">
          <h2 className="text-lg font-bold text-white mb-3">Who it is for</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Traders who prefer a deliberate, reviewed process over the fastest-possible execution.
            Long-term holders who want a clean dashboard to track positions. Investors who value
            having a person on the other end of support requests rather than an opaque automated
            queue.
          </p>
        </div>

        {/* ── Operating model ──────────────────────────────────────── */}
        <div className="mb-8">
          <div className="mb-5">
            <div className="vx-eyebrow mb-2">Operating Model</div>
            <h2 className="text-2xl font-bold text-white">How the platform works end-to-end</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {operatingModel.map((m) => (
              <div key={m.title} className="glass-card glass-card-hover rounded-xl p-5">
                <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-3">
                  <m.icon className="h-5 w-5 text-sky-400" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">{m.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Company information ──────────────────────────────────── */}
        <div className="glass-card rounded-2xl p-7 mb-8 border border-sky-500/15 bg-sky-500/[0.03]">
          <div className="mb-5">
            <div className="vx-eyebrow mb-2">Company Information</div>
            <h2 className="text-xl font-bold text-white">Entity &amp; operating details</h2>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            <div className="flex items-start gap-3">
              <Building2 size={14} className="text-sky-400 mt-0.5 flex-shrink-0" />
              <div>
                <dt className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Legal name</dt>
                <dd className="text-sm text-slate-200 mt-0.5">{COMPANY.legalName}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin size={14} className="text-sky-400 mt-0.5 flex-shrink-0" />
              <div>
                <dt className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Jurisdiction</dt>
                <dd className="text-sm text-slate-200 mt-0.5">{COMPANY.jurisdiction}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin size={14} className="text-sky-400 mt-0.5 flex-shrink-0" />
              <div>
                <dt className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Registered address</dt>
                <dd className="text-sm text-slate-200 mt-0.5">{COMPANY.address}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Building2 size={14} className="text-sky-400 mt-0.5 flex-shrink-0" />
              <div>
                <dt className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Registration</dt>
                <dd className="text-sm text-slate-200 mt-0.5">{COMPANY.registration}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail size={14} className="text-sky-400 mt-0.5 flex-shrink-0" />
              <div>
                <dt className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Support</dt>
                <dd className="text-sm text-slate-200 mt-0.5 break-all">
                  <a href={`mailto:${CONTACT.supportEmail}`} className="hover:text-sky-400">{CONTACT.supportEmail}</a>
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock size={14} className="text-sky-400 mt-0.5 flex-shrink-0" />
              <div>
                <dt className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Business hours</dt>
                <dd className="text-sm text-slate-200 mt-0.5">{CONTACT.businessHours}</dd>
              </div>
            </div>
          </dl>
        </div>

        {/* ── Risk & regulatory stance ─────────────────────────────── */}
        <div className="glass-card rounded-2xl p-7 border border-yellow-500/15 bg-yellow-500/[0.03]">
          <h2 className="text-lg font-bold text-white mb-3">Risk &amp; regulatory stance</h2>
          <p className="text-sm text-slate-400 leading-relaxed mb-3">
            {RISK_NOTICE}
          </p>
          <p className="text-sm text-slate-400 leading-relaxed">
            Vaultex Market does not provide investment, tax, or legal advice. Published fees,
            processing times, and supported assets may change — changes are reflected directly
            in the dashboard and on the{" "}
            <Link href="/pricing" className="text-sky-400 hover:text-sky-300">Fees page</Link>.
            Your responsibilities are detailed in our{" "}
            <Link href="/terms" className="text-sky-400 hover:text-sky-300">Terms of Service</Link>,{" "}
            <Link href="/privacy" className="text-sky-400 hover:text-sky-300">Privacy Policy</Link>, and{" "}
            <Link href="/risk" className="text-sky-400 hover:text-sky-300">Risk Disclosure</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
