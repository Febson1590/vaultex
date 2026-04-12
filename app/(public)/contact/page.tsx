import { Badge } from "@/components/ui/badge";
import { Mail, LifeBuoy, Shield, Clock } from "lucide-react";
import type { Metadata } from "next";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = { title: "Contact" };

const contactInfo = [
  { icon: Mail,     title: "General Support",  value: "support@vaultexmarket.com",  sub: "Response within one business day" },
  { icon: LifeBuoy, title: "Verified Users",   value: "Dashboard Support",          sub: "Submit tickets directly from your account" },
  { icon: Shield,   title: "Security Reports", value: "security@vaultexmarket.com", sub: "Responsible disclosure reviewed within 24 hours" },
  { icon: Clock,    title: "Support Hours",    value: "Monday – Friday",            sub: "09:00 – 18:00 UTC" },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen pt-28 pb-16 hero-bg">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <Badge className="mb-4 bg-sky-500/10 text-sky-400 border-sky-500/20 text-xs tracking-widest uppercase">Contact Us</Badge>
          <h1 className="text-4xl font-bold text-white mb-4">Get In Touch</h1>
          <p className="text-slate-400">Our support team is here to help with any question about your account.</p>
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {contactInfo.map((item) => (
              <div key={item.title} className="glass-card rounded-xl p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center flex-shrink-0">
                  <item.icon className="h-4 w-4 text-sky-400" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-0.5">{item.title}</div>
                  <div className="text-sm font-medium text-white break-all">{item.value}</div>
                  <div className="text-xs text-slate-500">{item.sub}</div>
                </div>
              </div>
            ))}
          </div>

          <ContactForm />
        </div>
      </div>
    </div>
  );
}
