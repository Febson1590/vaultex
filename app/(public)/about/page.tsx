import { Badge } from "@/components/ui/badge";
import { Shield, Users, Zap, Globe, Award, Target } from "lucide-react";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "About" };

const values = [
  { icon: Shield, title: "Security First",  desc: "We prioritize the security of your account and digital assets above all else, with enterprise-grade infrastructure." },
  { icon: Users,  title: "Client Centric",  desc: "Every feature is designed around the professional trader's workflow — built for speed, clarity, and control." },
  { icon: Zap,    title: "Performance",      desc: "Sub-second order execution, real-time market data streams, and 99.9% platform uptime guaranteed." },
  { icon: Globe,  title: "Global Access",    desc: "Professional brokerage tools accessible from anywhere — across 50+ digital assets and growing." },
  { icon: Award,  title: "Excellence",       desc: "We hold ourselves to the highest standard of quality in every layer of the platform." },
  { icon: Target, title: "Transparency",     desc: "Clear, honest communication with every client. Full audit trail on every account action." },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen pt-28 pb-16 hero-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <Badge className="mb-4 bg-sky-500/10 text-sky-400 border-sky-500/20 text-xs tracking-widest uppercase">About Vaultex</Badge>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">Redefining Crypto Brokerage</h1>
          <p className="text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Vaultex Market is an institutional-grade crypto brokerage platform built to deliver
            professional execution infrastructure, real-time market data, and enterprise security
            for serious traders and investors.
          </p>
        </div>

        <div className="glass-card rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Our Mission</h2>
          <p className="text-slate-400 leading-relaxed mb-4">
            We believe every professional trader deserves access to institutional-quality tools.
            Vaultex Market was built to bridge the gap between traditional finance and the digital
            asset ecosystem — providing a secure, high-performance environment for crypto asset
            management, trading, and portfolio growth.
          </p>
          <p className="text-slate-400 leading-relaxed">
            Our platform is built on a foundation of trust, transparency, and technical excellence.
            From real-time order books to comprehensive audit trails, every feature reflects
            the demands of sophisticated market participants.
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
          <h2 className="text-xl font-bold text-white mb-3">Compliance & Regulation</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Vaultex Market operates with full KYC/AML compliance workflows and maintains a
            comprehensive audit trail for every account action, trade, deposit, and withdrawal.
            All user data is encrypted at rest and in transit using AES-256 encryption. We are
            committed to maintaining the highest standards of financial integrity and regulatory
            alignment across all jurisdictions we serve.
          </p>
        </div>
      </div>
    </div>
  );
}
