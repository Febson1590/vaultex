import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Risk Disclosure" };

export default function RiskPage() {
  return (
    <div className="min-h-screen pt-28 pb-16 hero-bg">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-sky-500/10 text-sky-400 border-sky-500/20 text-xs tracking-widest uppercase">
            Legal
          </Badge>
          <h1 className="text-4xl font-bold text-white mb-3">Risk Disclosure</h1>
          <p className="text-sm text-slate-500">Please read carefully before trading digital assets.</p>
        </div>

        <div className="glass-card rounded-2xl p-6 mb-6 border border-yellow-500/20 bg-yellow-500/5 flex items-start gap-4">
          <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-slate-300 leading-relaxed">
            Trading digital assets involves a high degree of risk, including the possibility of losing
            some or all of the funds you deposit. You should only trade with money you can afford to lose.
          </p>
        </div>

        <div className="glass-card rounded-2xl p-8 space-y-6 text-sm text-slate-400 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">1. Market Risk</h2>
            <p>
              The value of digital assets can fluctuate significantly, sometimes within seconds. Prices
              are driven by supply, demand, news, regulation, and macroeconomic events. Past performance
              is not an indicator of future results.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">2. Liquidity Risk</h2>
            <p>
              Some assets may have limited liquidity, which can lead to wider spreads and slippage on
              large orders. You may not always be able to exit a position at your desired price.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">3. Technology &amp; Operational Risk</h2>
            <p>
              The platform depends on internet connectivity, third-party infrastructure, and blockchain
              networks. Temporary outages, congestion, or failures of external providers can delay orders,
              deposits, or withdrawals. We maintain monitoring and support processes to minimize impact,
              but cannot guarantee uninterrupted service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">4. Regulatory Risk</h2>
            <p>
              The regulatory environment for digital assets is evolving and varies by jurisdiction. Changes
              in law, taxation, or regulation may affect the availability of certain assets, features, or
              your ability to use the platform in your region.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">5. Security Risk</h2>
            <p>
              While we take reasonable steps to protect your account, you are responsible for keeping
              your credentials and email inbox secure. Never share your password or one-time codes with
              anyone, including people claiming to be Vaultex Market support.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">6. Deposits &amp; Custody</h2>
            <p>
              Vaultex Market is a brokerage, not a bank. Funds you deposit are not covered by FDIC,
              NDIC, or any other government deposit-insurance scheme. We hold balances in segregated
              custodial wallets with monitored controls and a manual review on every withdrawal — but
              it&apos;s good practice to keep your account funded with amounts that fit your overall
              plan, not your entire savings.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">7. Investment Plans</h2>
            <p>
              The daily-return ranges shown on each plan are <strong className="text-slate-300">projections
              based on historical market activity</strong>, not fixed payouts or guaranteed returns. Actual
              earnings vary with market conditions and can be lower than projected — including periods
              with no return or simulated drawdowns. Past performance of any plan is not a reliable
              indicator of future results.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">8. Copy Trading</h2>
            <p>
              When you copy a trader, your account mirrors their wins{" "}
              <strong className="text-slate-300">and</strong> their losses. The win rates and historical
              statistics displayed on trader profiles describe past activity only; the same trader can
              underperform or lose money going forward. Choose traders whose style and risk profile you
              understand, and treat copy-trading as one part of a diversified plan rather than a
              guaranteed income stream.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">9. No Investment Advice</h2>
            <p>
              Vaultex Market does not provide investment, tax, or legal advice. All content on the platform
              is for informational purposes only. You should consult a qualified professional before making
              any investment decision.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">10. Your Responsibility</h2>
            <p>
              By using Vaultex Market, you acknowledge that you understand these risks and accept full
              responsibility for your trading decisions and the outcomes of those decisions.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
