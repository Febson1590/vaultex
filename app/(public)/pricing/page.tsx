import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, Info, AlertTriangle, ArrowRight,
  Wallet, ArrowDownToLine, ArrowUpFromLine, Coins,
} from "lucide-react";
import type { Metadata } from "next";
import { SHORT_RISK_NOTICE } from "@/lib/company";

export const metadata: Metadata = { title: "Fees & Pricing" };

/* ── Headline fee cards ──────────────────────────────────────────────── */
const headlineFees = [
  {
    icon:  Coins,
    label: "Spot trading (taker)",
    value: "0.10%",
    desc:  "Charged on orders that remove liquidity from the book (market orders and crossing limit orders).",
  },
  {
    icon:  Coins,
    label: "Spot trading (maker)",
    value: "0.08%",
    desc:  "Charged on limit orders that rest on the book until filled.",
  },
  {
    icon:  ArrowDownToLine,
    label: "Deposits",
    value: "No platform fee",
    desc:  "Network fees charged by the underlying blockchain are the user's responsibility.",
  },
  {
    icon:  ArrowUpFromLine,
    label: "Withdrawals",
    value: "Network-dependent",
    desc:  "A network fee may be passed through on crypto withdrawals. The final amount is shown before you confirm.",
  },
  {
    icon:  Wallet,
    label: "Account & inactivity",
    value: "None",
    desc:  "No monthly, annual, or inactivity fees on standard accounts at the time of writing.",
  },
];

/* ── Trading tiers ────────────────────────────────────────────────────── */
const tiers = [
  {
    name:     "Standard",
    volume:   "Less than $50K / 30 days",
    makerFee: "0.10%",
    takerFee: "0.10%",
    features: [
      "Full dashboard access",
      "Email support",
      "Portfolio tracking",
      "Market & limit orders",
    ],
  },
  {
    name:     "Professional",
    volume:   "$50K – $500K / 30 days",
    makerFee: "0.08%",
    takerFee: "0.09%",
    features: [
      "Everything in Standard",
      "Priority support queue",
      "Advanced charting",
      "Trade history export",
    ],
    highlight: true,
  },
  {
    name:     "Institutional",
    volume:   "More than $500K / 30 days",
    makerFee: "0.05%",
    takerFee: "0.06%",
    features: [
      "Everything in Professional",
      "Dedicated account contact",
      "Custom reporting",
      "API access on request",
    ],
  },
];

/* ── Detailed notes — the fine print users actually need ──────────── */
const feeNotes = [
  {
    title: "Maker / taker structure",
    body: "A maker places a limit order that rests on the order book; a taker places an order that matches against existing orders. Taker activity pays a slightly higher fee because it consumes existing liquidity.",
  },
  {
    title: "When the final fee is shown",
    body: "The order form shows the fee that will be applied and the net amount you will receive before you confirm the order. What you see on the confirmation screen is what gets charged.",
  },
  {
    title: "Network & asset conditions",
    body: "Crypto withdrawal fees depend on the destination network and are passed through at cost. Some assets may temporarily be unavailable to withdraw if the underlying network is congested or under maintenance.",
  },
  {
    title: "When fees may change",
    body: "Published fees may change with advance notice. Changes are always reflected on this page and in the dashboard before they take effect — you will only ever be charged the rate shown on your order confirmation.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen pt-28 pb-16 hero-bg">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-sky-500/10 text-sky-400 border-sky-500/20 text-xs tracking-widest uppercase">
            Fees &amp; Pricing
          </Badge>
          <h1 className="text-4xl font-bold text-white mb-3">Transparent pricing.</h1>
          <p className="text-[14px] text-slate-400 max-w-xl mx-auto">
            Straightforward trading fees with no hidden charges. The final cost of every order
            is shown on the confirmation screen before you submit.
          </p>
        </div>

        {/* ── Headline fees ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-10">
          {headlineFees.map((f) => (
            <div key={f.label} className="glass-card rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-md bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                  <f.icon className="h-3.5 w-3.5 text-sky-400" />
                </div>
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                  {f.label}
                </div>
              </div>
              <div className="text-[22px] font-bold gradient-text mb-1.5">{f.value}</div>
              <div className="text-[12px] text-slate-400 leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* ── Trading tiers ────────────────────────────────────────── */}
        <div className="mb-10">
          <div className="text-center mb-7">
            <div className="vx-eyebrow mb-2 inline-flex">Volume Tiers</div>
            <h2 className="text-2xl font-bold text-white">Fee tiers by 30-day volume</h2>
            <p className="text-[13px] text-slate-500 mt-2">
              Your tier is calculated from your trailing 30-day trading volume and applied automatically.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`glass-card rounded-xl p-6 relative ${tier.highlight ? "border border-sky-500/30 ring-1 ring-sky-500/20" : ""}`}
              >
                {tier.highlight && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sky-500 text-white border-0 text-xs px-3">
                    Most common
                  </Badge>
                )}
                <h3 className="text-lg font-bold text-white mb-1">{tier.name}</h3>
                <p className="text-xs text-slate-500 mb-4">{tier.volume}</p>
                <div className="flex gap-4 mb-5">
                  <div>
                    <div className="text-xl font-bold text-sky-400">{tier.makerFee}</div>
                    <div className="text-[11px] text-slate-500 uppercase tracking-wide">Maker</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-sky-400">{tier.takerFee}</div>
                    <div className="text-[11px] text-slate-500 uppercase tracking-wide">Taker</div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {tier.features.map((f) => (
                    <div key={f} className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="text-[12px] text-slate-400">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Detailed notes ────────────────────────────────────────── */}
        <div className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Info size={14} className="text-sky-400" />
            <h2 className="text-base font-bold text-white">The details</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {feeNotes.map((n) => (
              <div key={n.title}>
                <div className="text-sm font-semibold text-white mb-1.5">{n.title}</div>
                <p className="text-[12.5px] text-slate-400 leading-relaxed">{n.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Risk notice ──────────────────────────────────────────── */}
        <div className="rounded-xl p-5 border border-yellow-500/20 bg-yellow-500/[0.03] flex items-start gap-3 mb-8">
          <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[12.5px] text-slate-300 leading-relaxed">
              <strong className="text-yellow-400">Risk notice:</strong> {SHORT_RISK_NOTICE} Published
              fees cover platform costs only — the market value of any asset you hold can change
              at any time. Read the full{" "}
              <Link href="/risk" className="text-sky-400 hover:text-sky-300">Risk Disclosure</Link>{" "}
              before funding an account.
            </p>
          </div>
        </div>

        {/* ── CTA ─────────────────────────────────────────────────── */}
        <div className="text-center">
          <Link
            href="/register"
            className="vx-btn-primary inline-flex items-center justify-center gap-2 h-11 px-7 rounded-lg text-[14px]"
          >
            Open an Account <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
