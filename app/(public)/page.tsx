import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  ArrowRight, TrendingUp, Shield, Zap, Globe, Users, BarChart3,
  ChevronRight, CheckCircle2, Lock, Eye, RefreshCw, Award,
  ArrowUpRight, ArrowDownRight, LineChart, HeadphonesIcon,
  Clock, DollarSign, Activity,
} from "lucide-react";
import { db } from "@/lib/db";
import { formatCurrency, formatPercent, formatCompact } from "@/lib/utils";

async function getMarketData() {
  try {
    return await db.marketAsset.findMany({ where: { isActive: true }, orderBy: { rank: "asc" }, take: 6 });
  } catch { return []; }
}

const features = [
  { icon: BarChart3, title: "Real-Time Portfolio Tracking", desc: "Monitor your simulated portfolio with live P&L, asset allocation charts, and performance analytics." },
  { icon: Zap, title: "Instant Trade Execution", desc: "Place simulated buy and sell orders instantly with market and limit order types across all supported assets." },
  { icon: Shield, title: "Institutional-Grade Security", desc: "Your account is protected with industry-standard authentication and encrypted data storage." },
  { icon: LineChart, title: "Advanced Charting", desc: "Visualize market trends, portfolio performance, and asset allocation with professional-grade charts." },
  { icon: HeadphonesIcon, title: "24/7 Support Desk", desc: "Submit support tickets and get responses from our team any time. Priority support for verified accounts." },
  { icon: Globe, title: "Global Market Coverage", desc: "Access a curated selection of top cryptocurrencies with real-time simulated pricing and market data." },
];

const stats = [
  { label: "Active Traders", value: "12,400+", icon: Users },
  { label: "Assets Supported", value: "50+", icon: Activity },
  { label: "Daily Volume", value: "$2.4B", icon: DollarSign },
  { label: "Uptime", value: "99.9%", icon: Clock },
];

const steps = [
  { step: "01", title: "Create Your Account", desc: "Register in under 2 minutes with your email address. No credit card required to get started." },
  { step: "02", title: "Complete Verification", desc: "Submit your identity documents to unlock full platform access and higher portfolio limits." },
  { step: "03", title: "Fund Your Wallet", desc: "Submit a simulated deposit request and get your virtual wallet funded by the platform team." },
  { step: "04", title: "Start Trading", desc: "Execute simulated trades across BTC, ETH, USDT and more with real-time price data." },
];

const trust = [
  { icon: Lock, title: "Encrypted Data", desc: "All user data is encrypted at rest and in transit using AES-256 encryption." },
  { icon: Eye, title: "Full Transparency", desc: "Every transaction is logged and visible in your complete transaction history." },
  { icon: RefreshCw, title: "Real-Time Updates", desc: "All admin changes reflect instantly across your sessions and devices." },
  { icon: Award, title: "Compliance Ready", desc: "Built with KYC/AML workflow and regulatory-grade user verification." },
];

export default async function HomePage() {
  const assets = await getMarketData();

  return (
    <div className="hero-bg">
      {/* Ticker */}
      {assets.length > 0 && (
        <div className="fixed top-16 left-0 right-0 z-40 bg-[#020b18]/80 backdrop-blur-sm border-b border-sky-500/10 overflow-hidden h-8 flex items-center">
          <div className="flex animate-ticker whitespace-nowrap">
            {[...assets, ...assets].map((asset, i) => (
              <span key={i} className="inline-flex items-center gap-2 px-6 text-xs">
                <span className="font-semibold text-white">{asset.symbol}/USD</span>
                <span className="text-slate-400">{formatCurrency(Number(asset.currentPrice))}</span>
                <span className={Number(asset.priceChange24h) >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {formatPercent(Number(asset.priceChange24h))}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="pt-44 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <Badge className="mb-6 bg-sky-500/10 text-sky-400 border-sky-500/20 px-4 py-1.5 text-xs font-medium tracking-widest uppercase">
            Premium Crypto Broker Platform
          </Badge>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-[1.1] tracking-tight">
            Trade Digital Assets{" "}
            <span className="gradient-text">with Institutional</span>
            <br />
            Confidence
          </h1>
          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Experience the future of crypto trading on a secure, simulated brokerage platform
            tailored for professionals. BTC, ETH, USDT and more.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Button
              size="lg"
              render={<Link href="/register" />}
              className="bg-sky-500 hover:bg-sky-400 text-white font-semibold px-8 h-12 shadow-lg shadow-sky-500/30 hover:shadow-sky-500/50 hover:scale-[1.02] transition-all duration-200"
            >
              Open Free Account <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              render={<Link href="/markets" />}
              className="border-white/10 text-white hover:bg-white/5 h-12 px-8"
            >
              Explore Markets <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {stats.map((stat) => (
              <div key={stat.label} className="glass-card rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-xs text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Market Overview */}
      {assets.length > 0 && (
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Market Overview</h2>
                <p className="text-sm text-slate-500">Top assets by market cap</p>
              </div>
              <Button variant="ghost" render={<Link href="/markets" />} className="text-sky-400 hover:text-sky-300 hover:bg-sky-500/10">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assets.map((asset) => {
                const change = Number(asset.priceChange24h);
                const isUp = change >= 0;
                return (
                  <Card key={asset.id} className="glass-card glass-card-hover p-5 rounded-xl border-0 cursor-pointer">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                          <span className="text-xs font-bold text-sky-400">{asset.symbol.slice(0, 3)}</span>
                        </div>
                        <div>
                          <div className="font-semibold text-white text-sm">{asset.name}</div>
                          <div className="text-xs text-slate-500">{asset.symbol}/USD</div>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md ${isUp ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                        {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {formatPercent(change)}
                      </div>
                    </div>
                    <div className="text-xl font-bold text-white">{formatCurrency(Number(asset.currentPrice))}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Vol: {formatCompact(Number(asset.volume24h || 0))} · MCap: {formatCompact(Number(asset.marketCap || 0))}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#040f1f]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <Badge className="mb-4 bg-sky-500/10 text-sky-400 border-sky-500/20 text-xs tracking-widest uppercase">Platform Features</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Built for Serious Traders</h2>
            <p className="text-slate-400 max-w-xl mx-auto">Every tool you need to manage, track, and grow your simulated portfolio like a professional.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="glass-card glass-card-hover rounded-xl p-6">
                <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-sky-400" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <Badge className="mb-4 bg-sky-500/10 text-sky-400 border-sky-500/20 text-xs tracking-widest uppercase">How It Works</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Get Started in Minutes</h2>
            <p className="text-slate-400 max-w-xl mx-auto">Four simple steps from registration to your first simulated trade.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step) => (
              <div key={step.step} className="glass-card rounded-xl p-6">
                <div className="text-4xl font-black gradient-text mb-4">{step.step}</div>
                <h3 className="text-base font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Security */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#040f1f]">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <Badge className="mb-4 bg-sky-500/10 text-sky-400 border-sky-500/20 text-xs tracking-widest uppercase">Security First</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Institutional-Grade <span className="gradient-text">Security</span>
              </h2>
              <p className="text-slate-400 mb-8 leading-relaxed">
                We take security seriously. Your account, data, and simulated assets are protected with
                best-in-class security infrastructure built for enterprise-grade applications.
              </p>
              <div className="space-y-3">
                {[
                  "Multi-layer account authentication",
                  "256-bit encrypted data storage",
                  "Admin-controlled access controls",
                  "Comprehensive audit trail for all actions",
                  "Real-time fraud detection system",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-sm text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {trust.map((t) => (
                <div key={t.title} className="glass-card rounded-xl p-5">
                  <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-3">
                    <t.icon className="h-4 w-4 text-sky-400" />
                  </div>
                  <h4 className="text-sm font-semibold text-white mb-1">{t.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">{t.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="glass-card rounded-2xl p-12 border-sky-500/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-cyan-500/5" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to Start Trading?</h2>
              <p className="text-slate-400 mb-8 max-w-lg mx-auto">
                Join thousands of traders on Vaultex Market. Create your free account and start
                your simulated trading journey today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  render={<Link href="/register" />}
                  className="bg-sky-500 hover:bg-sky-400 text-white font-semibold px-8 h-12 shadow-lg shadow-sky-500/30 hover:shadow-sky-500/50 hover:scale-[1.02] transition-all duration-200"
                >
                  Create Free Account <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  render={<Link href="/login" />}
                  className="border-white/10 text-white hover:bg-white/5 h-12 px-8"
                >
                  Sign In
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
