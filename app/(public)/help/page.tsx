import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpCircle, ArrowRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Help Center" };

const faqs = [
  {
    q: "How do I open a Vaultex Market account?",
    a: "Click “Open Free Account” on the homepage and complete the 3-step registration form. You’ll receive an email verification code to activate your account.",
  },
  {
    q: "How does identity verification (KYC) work?",
    a: "From your dashboard, open the Verification section and upload a government-issued ID along with a short selfie. Our compliance team reviews submissions manually — most are processed within one business day.",
  },
  {
    q: "How do deposits and withdrawals work?",
    a: "Deposits and withdrawals are processed through your Wallets page. Our finance team reviews every request to help protect your account. Processing time depends on the method and network conditions.",
  },
  {
    q: "What trading fees do you charge?",
    a: (
      <>
        Our current fees are listed on the{" "}
        <Link href="/pricing" className="text-sky-400 hover:text-sky-300">Fees &amp; Pricing</Link>{" "}
        page. There are no deposit, withdrawal, or account maintenance fees.
      </>
    ),
  },
  {
    q: "I forgot my password — what should I do?",
    a: (
      <>
        Contact our support team via the{" "}
        <Link href="/contact" className="text-sky-400 hover:text-sky-300">Contact page</Link>{" "}
        and we will help you securely reset your password.
      </>
    ),
  },
  {
    q: "How do I contact support?",
    a: (
      <>
        Verified users can submit a support ticket from inside the dashboard. You can also email{" "}
        <a href="mailto:support@vaultexmarket.com" className="text-sky-400 hover:text-sky-300">
          support@vaultexmarket.com
        </a>{" "}
        and we reply within one business day during published hours.
      </>
    ),
  },
  {
    q: "Is Vaultex Market available in my country?",
    a: "Vaultex Market is available in most jurisdictions worldwide. Some countries may be restricted due to local regulation. Your region is checked during onboarding.",
  },
  {
    q: "How is my account kept secure?",
    a: "Logins are protected with email one-time passcodes, passwords are hashed using bcrypt, and every sensitive action is written to an audit log. We recommend using a unique password and securing your email inbox.",
  },
];

export default function HelpPage() {
  return (
    <div className="min-h-screen pt-28 pb-16 hero-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-sky-500/10 text-sky-400 border-sky-500/20 text-xs tracking-widest uppercase">
            Help Center
          </Badge>
          <h1 className="text-4xl font-bold text-white mb-3">How can we help?</h1>
          <p className="text-slate-400 max-w-xl mx-auto">
            Answers to the most common questions about accounts, deposits, trading, and security.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {faqs.map((faq, i) => (
            <div key={i} className="glass-card rounded-xl p-5">
              <div className="flex items-start gap-3 mb-2">
                <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center flex-shrink-0">
                  <HelpCircle className="h-3.5 w-3.5 text-sky-400" />
                </div>
                <h3 className="text-sm font-semibold text-white leading-snug">{faq.q}</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed pl-10">{faq.a}</p>
            </div>
          ))}
        </div>

        <div className="glass-card rounded-2xl p-6 border border-sky-500/20 bg-sky-500/5 text-center">
          <h2 className="text-lg font-bold text-white mb-1">Still need help?</h2>
          <p className="text-sm text-slate-400 mb-5">
            Our support team replies within one business day during published hours
            ({"Monday\u2013Friday, 09:00\u201318:00 UTC"}).
          </p>
          <Button
            render={<Link href="/contact" />}
            className="bg-sky-500 hover:bg-sky-400 text-white font-semibold px-6 h-11"
          >
            Contact Support <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
