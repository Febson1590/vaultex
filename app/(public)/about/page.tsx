import { Badge } from "@/components/ui/badge";
import { Shield, Users, Zap, Globe, Award, Target } from "lucide-react";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "About" };

const values = [
  { icon: Shield, title: "Security First",  desc: "We prioritize the security of your account and digital assets with strong password hashing, session controls, and a full audit trail." },
  { icon: Users,  title: "Client Centric",  desc: "Every feature is designed around the trader's workflow — built for speed, clarity, and control." },
  { icon: Zap,    title: "Performance",     desc: "Clean order execution, up-to-date market data, and a responsive interface across every device." },
  { icon: Globe,  title: "Global Access",   desc: "Professional brokerage tools accessible from most jurisdictions — across 50+ digital assets and growing." },
  { icon: Award,  title: "Excellence",      desc: "We hold ourselves to a high standard of quality in every layer of the platform." },
  { icon: Target, title: "Transparency",    desc: "Clear, honest communication with every client. Full audit trail on every account action." },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen pt-28 pb-16 hero-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <Badge className="mb-4 bg-sky-500/10 text-sky-400 border-sky-500/20 text-xs tracking-widest uppercase">About Vaultex</Badge>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">A Premium Crypto Brokerage</h1>
          <p className="text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Vaultex Market is a premium crypto brokerage platform built to deliver clean execution,
            up-to-date market data, and strong account security for serious traders and long-term investors.
          </p>
        </div>

        <div className="glass-card rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Our Mission</h2>
          <p className="text-slate-400 leading-relaxed mb-4">
            We believe every trader deserves access to a clean, premium interface. Vaultex Market was
            built to bridge traditional trading discipline with the digital asset ecosystem — providing
            a secure, focused environment for crypto asset management, trading, and portfolio growth.
          </p>
          <p className="text-slate-400 leading-relaxed">
            Our platform is built on trust, transparency, and technical care. From clear order books
            to comprehensive audit trails, every feature reflects the demands of sophisticated users.
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
          <h2 className="text-xl font-bold text-white mb-3">Compliance &amp; Verification</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Vaultex Market operates with a KYC workflow and maintains a comprehensive audit trail for
            every account action, trade, deposit, and withdrawal. User data is transmitted over TLS
            and passwords are hashed using bcrypt. Your responsibilities and the associated risks are
            detailed in our{" "}
            <a href="/terms" className="text-sky-400 hover:text-sky-300">Terms of Service</a>,{" "}
            <a href="/privacy" className="text-sky-400 hover:text-sky-300">Privacy Policy</a>, and{" "}
            <a href="/risk" className="text-sky-400 hover:text-sky-300">Risk Disclosure</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
