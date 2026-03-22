import { Badge } from "@/components/ui/badge";
import { Shield, Lock, Eye, Server, Key, AlertTriangle } from "lucide-react";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Security" };

const measures = [
  { icon: Lock, title: "End-to-End Encryption", desc: "All data is encrypted using AES-256 in transit and at rest. Sensitive information is never stored in plain text." },
  { icon: Key, title: "Secure Authentication", desc: "Auth.js-powered credential system with bcrypt-hashed passwords, session tokens, and optional 2FA." },
  { icon: Eye, title: "Full Audit Trail", desc: "Every admin action, account change, and transaction is logged with timestamps and actor information." },
  { icon: Server, title: "Infrastructure Security", desc: "Enterprise-grade infrastructure with automatic backups, DDoS protection, and 99.9% uptime SLA." },
  { icon: Shield, title: "KYC/AML Compliance", desc: "Identity verification workflow ensures all users are verified before accessing full platform features." },
  { icon: AlertTriangle, title: "Fraud Prevention", desc: "Real-time monitoring for suspicious account activity with automatic restriction triggers." },
];

export default function SecurityPage() {
  return (
    <div className="min-h-screen pt-28 pb-16 hero-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <Badge className="mb-4 bg-sky-500/10 text-sky-400 border-sky-500/20 text-xs tracking-widest uppercase">Security Center</Badge>
          <h1 className="text-4xl font-bold text-white mb-4">Your Security Is Our Priority</h1>
          <p className="text-slate-400 max-w-xl mx-auto">Vaultex Market is built with institutional-grade security at every layer of the stack.</p>
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
            If you discover a security vulnerability, please report it to{" "}
            <a href="mailto:security@vaultexmarket.com" className="text-sky-400 hover:text-sky-300">
              security@vaultexmarket.com
            </a>
            . We take all security reports seriously and will respond within 24 hours.
          </p>
        </div>
      </div>
    </div>
  );
}
