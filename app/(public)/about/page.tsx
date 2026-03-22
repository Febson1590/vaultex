import { Badge } from "@/components/ui/badge";
import { Shield, Users, Zap, Globe, Award, Target } from "lucide-react";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "About" };

const values = [
  { icon: Shield, title: "Security First", desc: "We prioritize the security of your account and data above all else." },
  { icon: Users, title: "User Centric", desc: "Every feature is designed with the trader's experience in mind." },
  { icon: Zap, title: "Performance", desc: "Fast execution, real-time updates, and reliable uptime." },
  { icon: Globe, title: "Accessibility", desc: "Professional trading tools accessible to everyone." },
  { icon: Award, title: "Excellence", desc: "We hold ourselves to the highest standard of quality." },
  { icon: Target, title: "Transparency", desc: "Clear, honest communication with every user." },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen pt-28 pb-16 hero-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <Badge className="mb-4 bg-sky-500/10 text-sky-400 border-sky-500/20 text-xs tracking-widest uppercase">About Vaultex</Badge>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">Redefining Crypto Brokerage</h1>
          <p className="text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Vaultex Market is a premium simulated crypto broker platform designed to deliver an
            institutional-grade trading experience for professionals and enthusiasts alike.
          </p>
        </div>

        <div className="glass-card rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Our Mission</h2>
          <p className="text-slate-400 leading-relaxed mb-4">
            We believe every trader deserves access to professional-grade tools. Vaultex Market was
            built to bridge the gap between traditional finance and the decentralized world, providing
            a safe, realistic, and premium simulated environment for crypto asset management.
          </p>
          <p className="text-slate-400 leading-relaxed">
            Our platform is built on a foundation of trust, transparency, and technical excellence.
            With admin-controlled workflows and real-time simulated data, users experience the full
            lifecycle of a professional brokerage without real financial risk.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          {values.map((v) => (
            <div key={v.title} className="glass-card glass-card-hover rounded-xl p-5">
              <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-3">
                <v.icon className="h-5 w-5 text-sky-400" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">{v.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>

        <div className="glass-card rounded-2xl p-8 border border-sky-500/20 bg-sky-500/5">
          <h2 className="text-xl font-bold text-white mb-3">Important Disclaimer</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Vaultex Market is a <strong className="text-sky-400">simulation platform only</strong>.
            All balances, trades, deposits, withdrawals, and financial data displayed are simulated
            and do not represent real financial transactions. No real cryptocurrency or fiat currency
            is held, transferred, or managed on this platform. This platform is for demonstration
            and educational purposes only.
          </p>
        </div>
      </div>
    </div>
  );
}
