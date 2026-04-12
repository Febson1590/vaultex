import { Badge } from "@/components/ui/badge";
import { Shield, Lock, Eye, Server, Key, AlertTriangle } from "lucide-react";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Security" };

const measures = [
  { icon: Lock,          title: "TLS In Transit",         desc: "All traffic between your browser and the platform is transmitted over HTTPS with modern TLS. Sensitive credentials are never sent in plain text." },
  { icon: Key,           title: "Secure Authentication",  desc: "Auth.js-powered login with bcrypt-hashed passwords, session tokens, and an email one-time passcode flow for every sign-in." },
  { icon: Eye,           title: "Full Audit Trail",       desc: "Every admin action, account change, deposit, withdrawal, and trade is logged with timestamps and actor information." },
  { icon: Server,        title: "Managed Infrastructure", desc: "The platform runs on managed infrastructure with regular backups and standard hardening practices." },
  { icon: Shield,        title: "KYC Workflow",           desc: "Identity verification is required before unlocking full platform features. All submissions are reviewed manually by our compliance team." },
  { icon: AlertTriangle, title: "Manual Review",          desc: "Deposits and withdrawals are reviewed by our finance team to help catch suspicious activity before funds leave the platform." },
];

export default function SecurityPage() {
  return (
    <div className="min-h-screen pt-28 pb-16 hero-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <Badge className="mb-4 bg-sky-500/10 text-sky-400 border-sky-500/20 text-xs tracking-widest uppercase">Security Center</Badge>
          <h1 className="text-4xl font-bold text-white mb-4">Your Security Is Our Priority</h1>
          <p className="text-slate-400 max-w-xl mx-auto">Vaultex Market is built with sensible security defaults at every layer of the stack.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
          {measures.map((m) => (
            <div key={m.title} className="glass-card glass-card-hover rounded-xl p-6">
              <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-4">
                <m.icon className="h-5 w-5 text-sky-400" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{m.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>

        <div className="glass-card rounded-xl p-6 border border-emerald-500/20 bg-emerald-500/5">
          <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-400" />
            Report a Vulnerability
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            If you discover a security issue, please report it responsibly to{" "}
            <a href="mailto:security@vaultexmarket.com" className="text-sky-400 hover:text-sky-300">
              security@vaultexmarket.com
            </a>
            . We review every report and aim to respond within one business day.
          </p>
        </div>
      </div>
    </div>
  );
}
