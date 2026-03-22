import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Fees & Pricing" };

const fees = [
  { label: "Spot Trading Fee", value: "0.10%", desc: "Applied to all market order trades" },
  { label: "Limit Order Fee", value: "0.08%", desc: "Reduced fee for limit order placement" },
  { label: "Deposit Fee", value: "Free", desc: "No fees on any deposit method" },
  { label: "Withdrawal Fee", value: "Free", desc: "No fees on withdrawal requests" },
  { label: "Account Maintenance", value: "Free", desc: "No monthly or annual account fees" },
  { label: "Inactivity Fee", value: "None", desc: "Your account stays free forever" },
];

const tiers = [
  { name: "Standard", volume: "< $50K/month", makerFee: "0.10%", takerFee: "0.10%", features: ["Full dashboard access", "Basic support", "Portfolio tracking", "Market data"] },
  { name: "Professional", volume: "$50K–$500K/month", makerFee: "0.08%", takerFee: "0.09%", features: ["Everything in Standard", "Priority support", "Advanced charts", "Trade history export"], highlight: true },
  { name: "Institutional", volume: "> $500K/month", makerFee: "0.05%", takerFee: "0.06%", features: ["Everything in Pro", "Dedicated account manager", "Custom reporting", "API access"] },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen pt-28 pb-16 hero-bg">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <Badge className="mb-4 bg-sky-500/10 text-sky-400 border-sky-500/20 text-xs tracking-widest uppercase">Transparent Pricing</Badge>
          <h1 className="text-4xl font-bold text-white mb-4">Simple, Transparent Fees</h1>
          <p className="text-slate-400 max-w-xl mx-auto">No hidden fees. No surprises. Our pricing is straightforward and competitive.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
          {fees.map((fee) => (
            <div key={fee.label} className="glass-card rounded-xl p-5">
              <div className="text-2xl font-bold gradient-text mb-1">{fee.value}</div>
              <div className="text-sm font-semibold text-white mb-1">{fee.label}</div>
              <div className="text-xs text-slate-500">{fee.desc}</div>
            </div>
          ))}
        </div>

        <h2 className="text-2xl font-bold text-white text-center mb-8">Trading Tiers</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {tiers.map((tier) => (
            <div key={tier.name} className={`glass-card rounded-xl p-6 relative ${tier.highlight ? "border border-sky-500/30 ring-1 ring-sky-500/20" : ""}`}>
              {tier.highlight && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sky-500 text-white border-0 text-xs px-3">Most Popular</Badge>
              )}
              <h3 className="text-lg font-bold text-white mb-1">{tier.name}</h3>
              <p className="text-xs text-slate-500 mb-4">{tier.volume}</p>
              <div className="flex gap-4 mb-4">
                <div>
                  <div className="text-xl font-bold text-sky-400">{tier.makerFee}</div>
                  <div className="text-xs text-slate-500">Maker</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-sky-400">{tier.takerFee}</div>
                  <div className="text-xs text-slate-500">Taker</div>
                </div>
              </div>
              <div className="space-y-2">
                {tier.features.map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                    <span className="text-xs text-slate-400">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
