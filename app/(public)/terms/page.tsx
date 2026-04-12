import { Badge } from "@/components/ui/badge";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <div className="min-h-screen pt-28 pb-16 hero-bg">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-sky-500/10 text-sky-400 border-sky-500/20 text-xs tracking-widest uppercase">
            Legal
          </Badge>
          <h1 className="text-4xl font-bold text-white mb-3">Terms of Service</h1>
          <p className="text-sm text-slate-500">Last updated: April 2026</p>
        </div>

        <div className="glass-card rounded-2xl p-8 space-y-6 text-sm text-slate-400 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">1. Acceptance of Terms</h2>
            <p>
              By creating a Vaultex Market account or using any part of the platform, you agree to be
              bound by these Terms of Service, our Privacy Policy, and our Risk Disclosure. If you do
              not agree with any part of these terms, you must not use the platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">2. Eligibility</h2>
            <p>
              You must be at least 18 years old and legally able to enter into binding contracts in your
              jurisdiction to open an account. You are responsible for ensuring that the use of digital
              asset services is permitted in the country or region where you reside.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">3. Account Registration &amp; Verification</h2>
            <p>
              You agree to provide accurate, current, and complete information during registration and
              to keep it updated. Vaultex Market may require identity verification (KYC) before unlocking
              deposits, withdrawals, or higher trading limits. We may suspend or close accounts that
              provide false information or fail verification.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">4. Trading &amp; Orders</h2>
            <p>
              Trades executed on Vaultex Market are final once confirmed. Prices and market data are
              provided for informational purposes and may differ from execution prices due to market
              movement. You are solely responsible for reviewing each order before confirmation.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">5. Deposits &amp; Withdrawals</h2>
            <p>
              Deposits and withdrawals are reviewed and processed by our finance team. Processing times
              vary based on method, compliance checks, and network conditions. Vaultex Market is not
              responsible for losses caused by incorrect wallet addresses or third-party network issues.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">6. Prohibited Activities</h2>
            <p>
              You agree not to use Vaultex Market for any unlawful activity, including money laundering,
              fraud, market manipulation, financing of illegal activities, or sanctioned-party transactions.
              Accounts engaging in prohibited activity will be suspended and reported as required by law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">7. Fees</h2>
            <p>
              Current trading fees are listed on our{" "}
              <a href="/pricing" className="text-sky-400 hover:text-sky-300">Fees &amp; Pricing</a> page.
              Fees may be updated from time to time, and continued use of the platform after a fee change
              constitutes acceptance of the updated fees.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">8. Limitation of Liability</h2>
            <p>
              Vaultex Market is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. To the
              maximum extent permitted by law, we shall not be liable for any indirect, incidental, or
              consequential loss arising from platform downtime, market volatility, third-party service
              failures, or user error.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">9. Changes to These Terms</h2>
            <p>
              We may update these Terms of Service from time to time. Material changes will be communicated
              through the platform or via email. Continued use of the service after an update constitutes
              your acceptance of the revised terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">10. Contact</h2>
            <p>
              Questions about these terms can be sent to{" "}
              <a href="mailto:support@vaultexmarket.com" className="text-sky-400 hover:text-sky-300">
                support@vaultexmarket.com
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
