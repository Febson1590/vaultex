import { Badge } from "@/components/ui/badge";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen pt-28 pb-16 hero-bg">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-sky-500/10 text-sky-400 border-sky-500/20 text-xs tracking-widest uppercase">
            Legal
          </Badge>
          <h1 className="text-4xl font-bold text-white mb-3">Privacy Policy</h1>
          <p className="text-sm text-slate-500">Last updated: April 2026</p>
        </div>

        <div className="glass-card rounded-2xl p-8 space-y-6 text-sm text-slate-400 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">1. Information We Collect</h2>
            <p className="mb-2">
              When you create a Vaultex Market account and use the platform, we collect the following
              categories of information:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Account details (name, email, phone number, country).</li>
              <li>Identity verification documents submitted for KYC review.</li>
              <li>Transaction data (deposits, withdrawals, trades, order history).</li>
              <li>Technical data such as IP address, device type, and session timestamps.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">2. How We Use Your Information</h2>
            <p>
              We use your data to operate and secure your account, process deposits and withdrawals,
              execute trades, perform KYC and compliance checks, send transactional emails (such as OTP
              codes), and to improve the platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">3. Data Storage &amp; Security</h2>
            <p>
              User data is transmitted over TLS and stored in a managed relational database with restricted
              access. Passwords are hashed using bcrypt and are never stored in plain text. Access to
              personal information is limited to authorized personnel on a need-to-know basis.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">4. Sharing of Information</h2>
            <p>
              We do not sell your personal data. We may share limited information with trusted service
              providers that help us operate the platform (such as email delivery, document verification,
              and market data feeds), and with law enforcement or regulators when legally required.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">5. Cookies</h2>
            <p>
              We use strictly necessary cookies to keep you signed in and to maintain session security.
              We do not use third-party advertising cookies on the public site.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">6. Your Rights</h2>
            <p>
              Depending on your jurisdiction, you may have the right to access, correct, or request
              deletion of the personal data we hold about you. To exercise these rights, contact us at
              the email address below. Some data (such as transaction records) may need to be retained
              for regulatory or audit reasons.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">7. Data Retention</h2>
            <p>
              We retain account and transaction data for as long as your account is active, and for a
              reasonable period afterwards as required by applicable anti-money-laundering and tax laws.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">8. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Any material changes will be communicated
              through the platform or via email.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">9. Contact</h2>
            <p>
              Privacy questions can be sent to{" "}
              <a href="mailto:privacy@vaultexmarket.com" className="text-sky-400 hover:text-sky-300">
                privacy@vaultexmarket.com
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
