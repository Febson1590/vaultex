import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, Shield, Zap, Globe, Users, BarChart3,
  ChevronRight, CheckCircle2, Lock, Eye, RefreshCw, Award,
  ArrowUpRight, ArrowDownRight, LineChart, HeadphonesIcon,
  Clock, DollarSign, Activity, Wallet, TrendingUp,
} from "lucide-react";
import { getMarketAssets } from "@/lib/coingecko";
import { formatCurrency, formatPercent, formatCompact } from "@/lib/utils";

/* ─── Per-symbol brand colours for ticker icons ───────────────────────── */
const CRYPTO_COLORS: Record<string, string> = {
  BTC:   "#f7931a", ETH:  "#627eea", USDT: "#26a17b", BNB:  "#f3ba2f",
  SOL:   "#9945ff", XRP:  "#346aa9", ADA:  "#3cc8c8", DOGE: "#c2a633",
  AVAX:  "#e84142", MATIC:"#8247e5", DOT:  "#e6007a", LINK: "#2a5ada",
  LTC:   "#bebebe", UNI:  "#ff007a", ATOM: "#6f7390",
};


/* ─── Feature cards ───────────────────────────────────────────────────── */
const features = [
  {
    icon: BarChart3,
    title: "Portfolio Tracking",
    desc: "Monitor your holdings with P&L, asset allocation charts, and performance analytics across every session and device.",
  },
  {
    icon: Zap,
    title: "Fast Trade Execution",
    desc: "Place market and limit orders across all supported digital assets with clear confirmation and complete order history.",
  },
  {
    icon: Shield,
    title: "Account Security",
    desc: "Your account is protected with email one-time passcodes, hashed password storage, and a full audit trail of every action.",
  },
  {
    icon: LineChart,
    title: "Clean Charting",
    desc: "Track market trends, portfolio performance, and asset allocation with clear candlestick charts and essential indicators.",
  },
  {
    icon: HeadphonesIcon,
    title: "Dedicated Support Desk",
    desc: "Submit support tickets directly from your dashboard and receive responses from our team, with priority handling for verified users.",
  },
  {
    icon: Globe,
    title: "Broad Market Coverage",
    desc: "Access a curated selection of top digital assets with updated pricing and a unified view across every major trading pair.",
  },
];

/* ─── Platform stats ──────────────────────────────────────────────────── */
const stats = [
  { label: "Verified Traders",  value: "10,000+", icon: Users      },
  { label: "Assets Supported",  value: "50+",     icon: Activity   },
  { label: "Order Types",       value: "Market & Limit", icon: DollarSign },
  { label: "Support",           value: "24 / 7",  icon: Clock      },
];

/* ─── How It Works steps ──────────────────────────────────────────────── */
const steps = [
  { step: "01", title: "Create Your Account",   desc: "Register in minutes with your email address. No credit card or upfront commitment required." },
  { step: "02", title: "Complete Verification", desc: "Submit your identity documents to unlock full platform access, higher limits, and dedicated account support." },
  { step: "03", title: "Fund Your Account",     desc: "Deposit via supported channels into your Vaultex wallet. Funds are reviewed and credited by our finance team." },
  { step: "04", title: "Start Trading",         desc: "Buy and sell BTC, ETH, USDT and 50+ assets at up-to-date market prices with clear order confirmation." },
];

/* ─── Trust & Security items ──────────────────────────────────────────── */
const trust = [
  { icon: Lock,      title: "Encrypted Transport", desc: "All user data is transmitted over TLS and passwords are hashed using industry-standard bcrypt." },
  { icon: Eye,       title: "Full Transparency",   desc: "Every deposit, trade, and withdrawal is logged and visible in your complete transaction history." },
  { icon: RefreshCw, title: "Synced Account",      desc: "All balance and order updates reflect quickly across your sessions and devices." },
  { icon: Award,     title: "Identity Verified",   desc: "Built-in KYC workflow with reviewed document verification for every funded account." },
];

/* ─── Page component ──────────────────────────────────────────────────── */
export default async function HomePage() {
  // Single unified source for every public market surface on this page
  const marketAssets = await getMarketAssets();
  const tickerItems  = marketAssets;
  const overviewAssets = marketAssets.slice(0, 6);

  // Build a quick symbol lookup so the hero preview mockup stays in sync
  // with the same data the ticker and market snapshot use.
  const bySymbol = Object.fromEntries(marketAssets.map((a) => [a.symbol, a]));
  const previewRows = (
    [
      { symbol: "BTC", alloc: "42%", color: "#f7931a" },
      { symbol: "ETH", alloc: "28%", color: "#627eea" },
      { symbol: "SOL", alloc: "18%", color: "#9945ff" },
      { symbol: "BNB", alloc: "12%", color: "#f3ba2f" },
    ] as const
  ).map((row) => {
    const asset = bySymbol[row.symbol];
    return {
      ...row,
      name:   asset?.name   ?? row.symbol,
      price:  asset?.price  ?? 0,
      change: asset?.change ?? 0,
    };
  });
  const btcPreview = bySymbol["BTC"];

  return (
    <div className="hero-bg overflow-x-hidden">

      {/* ── Global grain texture overlay ────────────────────────────────── */}
      <div className="noise-grain fixed inset-0 pointer-events-none z-0 opacity-[0.018]" aria-hidden="true" />

      {/* ── Ticker Bar ─────────────────────────────────────────────────── */}
      <div className="ticker-wrap fixed top-16 left-0 right-0 z-40 h-10 flex items-center overflow-hidden"
        style={{ background: "linear-gradient(180deg, rgba(2,11,24,0.97) 0%, rgba(3,13,27,0.94) 100%)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: "1px solid rgba(14,165,233,0.12)", boxShadow: "0 1px 0 rgba(14,165,233,0.04)" }}>
        <div className="flex animate-ticker whitespace-nowrap select-none">
          {[...tickerItems, ...tickerItems].map((asset, i) => {
            const color = CRYPTO_COLORS[asset.symbol] ?? "#0ea5e9";
            const isUp  = asset.change >= 0;
            return (
              <span
                key={i}
                className="inline-flex items-center gap-2.5 px-6 text-[11px] border-r border-white/[0.06]"
              >
                {/* Coloured icon circle */}
                <span
                  className="inline-flex w-4 h-4 rounded-full items-center justify-center flex-shrink-0 text-[7px] font-black"
                  style={{ background: `${color}22`, border: `1px solid ${color}55`, color }}
                >
                  {asset.symbol.slice(0, 1)}
                </span>
                <span className="font-bold text-white tracking-wide">{asset.symbol}</span>
                <span className="text-slate-300 font-medium">{formatCurrency(asset.price)}</span>
                <span className={`inline-flex items-center gap-0.5 font-semibold ${isUp ? "ticker-up" : "ticker-down"}`}>
                  {isUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                  {Math.abs(asset.change).toFixed(2)}%
                </span>
              </span>
            );
          })}
        </div>
      </div>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="pt-48 pb-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left — text content */}
            <div>
              <Badge className="mb-6 bg-sky-500/10 text-sky-400 border-sky-500/20 px-4 py-1.5 text-[11px] font-medium tracking-widest uppercase">
                Premium Crypto Broker Platform
              </Badge>
              <h1 className="text-5xl sm:text-6xl font-bold text-white mb-6 leading-[1.08] tracking-tight"
                style={{ textShadow: "0 2px 30px rgba(14,165,233,0.12), 0 0 60px rgba(255,255,255,0.04)" }}>
                Trade Digital Assets{" "}
                <span className="gradient-text">with Professional</span>
                <br />Confidence
              </h1>
              <p className="text-lg text-slate-400 max-w-lg mb-10 leading-relaxed">
                A premium crypto brokerage platform built for serious traders — with clean execution,
                strong account security, and a unified view of BTC, ETH, USDT and 50+ digital assets.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-12">
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

              {/* Trust indicators */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-400" /> TLS Secured
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-400" /> Email OTP Login
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-400" /> KYC Verified Accounts
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-400" /> Full Audit Trail
                </span>
              </div>
            </div>

            {/* Right — Dashboard mockup */}
            <div className="relative hidden lg:block animate-float-slow">
              {/* Layered ambient glow — brighter */}
              <div className="absolute -inset-14 rounded-3xl blur-3xl pointer-events-none"
                style={{ background: "radial-gradient(ellipse, rgba(14,165,233,0.18) 0%, transparent 65%)" }} />
              <div className="absolute -inset-6 bg-cyan-400/6 rounded-3xl blur-2xl pointer-events-none" />
              <div className="absolute -inset-2 bg-sky-500/4 rounded-3xl blur-lg  pointer-events-none" />
              {/* Gold accent glow — lower-left */}
              <div className="absolute -bottom-20 -left-12 w-72 h-56 rounded-full blur-3xl pointer-events-none"
                style={{ background: "radial-gradient(ellipse, rgba(251,191,36,0.07) 0%, transparent 65%)" }} />

              {/* App window frame */}
              <div className="relative mockup-frame rounded-3xl overflow-hidden">

                {/* Titlebar */}
                <div className="flex items-center gap-3 px-4 py-3 bg-[#020b18]/80 border-b border-white/[0.06]"
                  style={{ boxShadow: "inset 0 -1px 0 rgba(14,165,233,0.06)" }}>
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/60 ring-1 ring-red-500/20" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/60 ring-1 ring-yellow-500/20" />
                    <div className="w-3 h-3 rounded-full bg-green-500/60 ring-1 ring-green-500/20" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="text-[11px] text-slate-400 bg-[#040f1f]/80 px-4 py-1 rounded-lg border border-white/[0.07] tracking-wide">
                      vaultex.market — Portfolio Dashboard
                    </div>
                  </div>
                </div>

                {/* Nav tabs */}
                <div className="flex items-center gap-1 px-4 py-2 bg-[#020b18]/60 border-b border-white/[0.04]">
                  {["Portfolio", "Trade", "History", "Analytics"].map((tab, i) => (
                    <span key={tab} className={`text-[10px] px-3 py-1 rounded-md font-medium ${i === 0 ? "bg-sky-500/15 text-sky-400 border border-sky-500/20" : "text-slate-600 hover:text-slate-400"}`}>
                      {tab}
                    </span>
                  ))}
                </div>

                {/* Dashboard body */}
                <div className="p-5 space-y-3.5">

                  {/* Portfolio value row */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-[10px] text-slate-500 tracking-widest uppercase font-medium">Total Portfolio Value</div>
                        {/* Preview indicator — this entire panel is a static product preview */}
                        <div className="flex items-center gap-1 bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 rounded-md">
                          <div className="w-1.5 h-1.5 rounded-full bg-sky-400"
                            style={{ boxShadow: "0 0 4px rgba(14,165,233,0.8)" }} />
                          <span className="text-[8px] font-bold text-sky-400 tracking-wider">PREVIEW</span>
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-white tracking-tight"
                        style={{ textShadow: "0 2px 20px rgba(14,165,233,0.15), 0 0 40px rgba(255,255,255,0.06)" }}>
                        $284,392.50
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-emerald-400 text-sm flex items-center gap-0.5 font-bold"
                          style={{ textShadow: "0 0 14px rgba(16,185,129,0.55)" }}>
                          <ArrowUpRight size={14} /> +4.28%
                        </span>
                        <span className="text-slate-600 text-[10px]">vs yesterday</span>
                      </div>
                    </div>
                    <div className="text-right rounded-xl px-3 py-2.5"
                      style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", boxShadow: "inset 0 1px 0 rgba(16,185,129,0.08)" }}>
                      <div className="text-[10px] text-slate-500 mb-0.5 tracking-wider uppercase">24h P&amp;L</div>
                      <div className="text-lg font-bold text-emerald-400"
                        style={{ textShadow: "0 0 16px rgba(16,185,129,0.45)" }}>+$11,842</div>
                      <div className="text-[10px] text-slate-600 mt-0.5">+$234 unrealised</div>
                    </div>
                  </div>

                  {/* Separator */}
                  <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(14,165,233,0.1), transparent)" }} />

                  {/* SVG price chart — sharper, higher contrast */}
                  <div className="relative w-full h-24 rounded-xl overflow-hidden border border-white/[0.06]"
                    style={{ background: "linear-gradient(180deg, rgba(2,11,24,0.8) 0%, rgba(2,8,18,0.95) 100%)", boxShadow: "inset 0 0 24px rgba(14,165,233,0.06), inset 0 1px 0 rgba(14,165,233,0.1)" }}>
                    {/* Timeframe buttons */}
                    <div className="absolute top-2 right-2 flex gap-1 z-10">
                      {["1H","4H","1D","1W"].map((tf, i) => (
                        <span key={tf} className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${i === 2 ? "bg-sky-500/20 text-sky-400" : "text-slate-600"}`}>{tf}</span>
                      ))}
                    </div>
                    <svg viewBox="0 0 400 80" preserveAspectRatio="none" className="w-full h-full">
                      <defs>
                        <linearGradient id="heroChartGrad2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.6" />
                          <stop offset="60%" stopColor="#0ea5e9" stopOpacity="0.08" />
                          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
                        </linearGradient>
                        <filter id="chartGlow">
                          <feGaussianBlur stdDeviation="1.2" result="blur" />
                          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                        </filter>
                      </defs>
                      {/* Grid */}
                      {[20, 40, 60].map(y => (
                        <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="rgba(14,165,233,0.08)" strokeWidth="1" />
                      ))}
                      {/* Fill area */}
                      <path
                        d="M0,68 C30,65 55,62 80,57 C105,52 125,54 150,47 C175,40 195,43 220,34 C245,25 265,28 290,20 C315,12 335,14 360,8 C380,4 390,5 400,3 L400,80 L0,80 Z"
                        fill="url(#heroChartGrad2)"
                      />
                      {/* Main price line */}
                      <path
                        d="M0,68 C30,65 55,62 80,57 C105,52 125,54 150,47 C175,40 195,43 220,34 C245,25 265,28 290,20 C315,12 335,14 360,8 C380,4 390,5 400,3"
                        stroke="#38bdf8"
                        strokeWidth="2.5"
                        fill="none"
                        strokeLinecap="round"
                        filter="url(#chartGlow)"
                      />
                      {/* Live dot */}
                      <circle cx="400" cy="3" r="3.5" fill="#38bdf8" />
                      <circle cx="400" cy="3" r="7" fill="#38bdf8" fillOpacity="0.25" />
                    </svg>
                  </div>

                  {/* Asset allocation rows — prices pulled from unified market source */}
                  <div className="space-y-2.5">
                    {previewRows.map(asset => {
                      const up = asset.change >= 0;
                      return (
                        <div key={asset.symbol} className="flex items-center justify-between py-1 border-b border-white/[0.04] last:border-0">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ background: `${asset.color}18`, border: `1px solid ${asset.color}40` }}>
                              <span className="text-[8px] font-black leading-none" style={{ color: asset.color }}>{asset.symbol.slice(0,1)}</span>
                            </div>
                            <div>
                              <div className="text-[11px] font-semibold text-white">{asset.symbol}</div>
                              <div className="text-[9px] text-slate-600">{asset.alloc} allocation</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-0.5 rounded-full bg-white/5 overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: asset.alloc, background: asset.color, opacity: 0.5 }} />
                            </div>
                            <div className="text-right">
                              <div className="text-[11px] font-semibold text-slate-200">{formatCurrency(asset.price)}</div>
                              <div className={`text-[9px] font-bold ${up ? "text-emerald-400" : "text-red-400"}`}
                                style={{ textShadow: up ? "0 0 8px rgba(16,185,129,0.4)" : "0 0 8px rgba(239,68,68,0.4)" }}>
                                {formatPercent(asset.change)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Floating badge — sample order */}
              <div className="absolute -bottom-5 -right-7 mockup-frame rounded-xl px-4 py-3 shadow-2xl"
                style={{ borderColor: "rgba(16,185,129,0.22)" }}>
                <div className="text-[9px] text-slate-500 mb-0.5 uppercase tracking-wider">Sample Order</div>
                <div className="text-sm font-bold text-white">BTC +0.500</div>
                <div className="text-[10px] font-semibold text-emerald-400 mt-0.5" style={{ textShadow: "0 0 10px rgba(16,185,129,0.5)" }}>
                  @ {btcPreview ? formatCurrency(btcPreview.price) : "—"} · Market
                </div>
              </div>

              {/* Floating badge — markets status */}
              <div className="absolute -top-5 -left-7 mockup-frame rounded-xl px-4 py-3 shadow-2xl"
                style={{ borderColor: "rgba(14,165,233,0.2)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-sky-400 flex-shrink-0"
                    style={{ boxShadow: "0 0 6px rgba(14,165,233,0.7)" }} />
                  <div className="text-[10px] font-semibold text-slate-200 tracking-wide">Markets Open</div>
                </div>
                <div className="text-[10px] text-slate-500">50+ assets tracked</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Strip ────────────────────────────────────────────────── */}
      <div className="border-y border-sky-500/10 relative overflow-hidden"
        style={{ background: "linear-gradient(180deg, rgba(3,11,22,0.96) 0%, rgba(4,14,28,0.98) 100%)" }}>
        {/* Horizontal center glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-sky-500/[0.04] to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map(stat => (
              <div key={stat.label} className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center flex-shrink-0">
                  <stat.icon className="h-4 w-4 text-sky-400" />
                </div>
                <div>
                  <div className="text-xl font-bold text-white leading-tight">{stat.value}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Market Overview ─────────────────────────────────────────────── */}
      {overviewAssets.length > 0 && (
        <section className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
          {/* Section light source */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px pointer-events-none"
            style={{ background: "linear-gradient(90deg, transparent, rgba(14,165,233,0.15), transparent)" }} />
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-32 rounded-full blur-3xl pointer-events-none"
            style={{ background: "radial-gradient(ellipse, rgba(14,165,233,0.06), transparent)" }} />
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Market Snapshot</h2>
                <p className="text-sm text-slate-500">Top assets by market cap · Refreshed every minute</p>
              </div>
              <Button
                variant="ghost"
                render={<Link href="/markets" />}
                className="text-sky-400 hover:text-sky-300 hover:bg-sky-500/10"
              >
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {overviewAssets.map(asset => {
                const isUp = asset.change >= 0;
                return (
                  <div key={asset.id} className="glass-card glass-card-hover p-5 rounded-xl cursor-pointer">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                          <span className="text-xs font-bold text-sky-400">{asset.symbol.slice(0, 3)}</span>
                        </div>
                        <div>
                          <div className="font-semibold text-white text-sm">{asset.name}</div>
                          <div className="text-xs text-slate-500">{asset.symbol}/USD</div>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg ${isUp ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                        {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {formatPercent(asset.change)}
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">{formatCurrency(asset.price)}</div>
                    <div className="text-xs text-slate-500">
                      Vol: ${formatCompact(asset.volume24h)} · MCap: ${formatCompact(asset.marketCap)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Platform Preview ────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
        style={{ background: "linear-gradient(180deg, oklch(0.065 0.022 240) 0%, oklch(0.06 0.02 240) 55%, oklch(0.065 0.022 240) 100%)" }}>
        {/* Top border hairline */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-px pointer-events-none"
          style={{ background: "linear-gradient(90deg, transparent, rgba(14,165,233,0.15), transparent)" }} />
        {/* Left ambient glow — behind mockup */}
        <div className="absolute top-1/2 -translate-y-1/2 -left-20 w-64 h-96 rounded-full blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(14,165,233,0.07), transparent)" }} />
        {/* Right ambient glow */}
        <div className="absolute top-1/3 right-0 w-48 h-72 rounded-full blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(34,211,238,0.04), transparent)" }} />
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Trading interface mockup */}
            <div className="relative">
              <div className="absolute -inset-10 bg-sky-500/8 rounded-3xl blur-3xl pointer-events-none" />
              <div className="absolute -inset-4  bg-cyan-400/4 rounded-3xl blur-xl  pointer-events-none" />
              <div className="relative mockup-frame rounded-3xl overflow-hidden">

                {/* Top bar — price pulled from unified market source */}
                <div className="flex items-center justify-between px-4 py-3 bg-[#020b18]/80 border-b border-white/[0.06]"
                  style={{ boxShadow: "inset 0 -1px 0 rgba(14,165,233,0.06)" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[8px] font-black"
                      style={{ background: "#f7931a18", border: "1px solid #f7931a40", color: "#f7931a" }}>B</div>
                    <div>
                      <div className="text-sm font-bold text-white leading-tight">BTC / USD</div>
                      <div className="text-[9px] text-slate-500">Bitcoin · Spot</div>
                    </div>
                    <div className={`text-sm font-bold ml-1 ${btcPreview && btcPreview.change >= 0 ? "text-emerald-400" : "text-red-400"}`}
                      style={{ textShadow: "0 0 12px rgba(16,185,129,0.45)" }}>
                      {btcPreview ? formatCurrency(btcPreview.price) : "—"}
                    </div>
                    <div className={`text-[10px] border px-2 py-0.5 rounded-md font-semibold ${btcPreview && btcPreview.change >= 0 ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-red-400 bg-red-500/10 border-red-500/20"}`}>
                      {btcPreview && btcPreview.change >= 0 ? "▲" : "▼"} {formatPercent(btcPreview?.change ?? 0)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[10px]">
                    <span className="text-slate-600">Vol <span className="text-slate-400 font-medium">${formatCompact(btcPreview?.volume24h ?? 0)}</span></span>
                    <span className="text-slate-600">MCap <span className="text-slate-400 font-medium">${formatCompact(btcPreview?.marketCap ?? 0)}</span></span>
                  </div>
                </div>

                {/* Chart area */}
                <div className="p-4" style={{ background: "rgba(2,8,18,0.4)" }}>
                  {/* Timeframe selector */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] text-slate-500 font-medium">Price Chart</div>
                    <div className="flex gap-1">
                      {["15m","1H","4H","1D","1W"].map((tf, i) => (
                        <span key={tf} className={`text-[9px] px-2 py-0.5 rounded font-semibold cursor-pointer transition-colors ${i === 2 ? "bg-sky-500/20 text-sky-400 border border-sky-500/25" : "text-slate-600 hover:text-slate-400"}`}>{tf}</span>
                      ))}
                    </div>
                  </div>

                  <div className="h-40 relative rounded-xl overflow-hidden border border-white/[0.05]"
                    style={{ background: "linear-gradient(180deg, rgba(2,8,18,0.9) 0%, rgba(1,6,14,1) 100%)" }}>
                    <svg viewBox="0 0 500 120" preserveAspectRatio="none" className="w-full h-full">
                      <defs>
                        <linearGradient id="tradeGrad2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
                        </linearGradient>
                        <filter id="candleGlow">
                          <feGaussianBlur stdDeviation="0.8" result="blur"/>
                          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                        </filter>
                      </defs>
                      {/* Grid lines */}
                      {[24, 48, 72, 96].map(y => (
                        <line key={y} x1="0" y1={y} x2="500" y2={y} stroke="rgba(14,165,233,0.07)" strokeWidth="1" />
                      ))}
                      {/* Candlestick bars */}
                      {[
                        [25,92,20,9,false],[50,82,18,8,true],[75,72,22,9,true],[100,82,20,8,false],
                        [125,68,18,8,true],[150,58,20,8,true],[175,65,22,9,false],[200,50,18,8,true],
                        [225,42,20,8,true],[250,34,18,8,true],[275,27,20,8,true],[300,20,18,8,true],
                        [325,26,22,9,false],[350,18,20,8,true],[375,11,18,8,true],[400,15,20,8,false],
                        [425,9,18,8,true],[450,5,20,8,true],[475,7,18,8,false],
                      ].map(([x,y,h,w,up], i) => (
                        <g key={i} filter="url(#candleGlow)">
                          <line
                            x1={Number(x)} y1={Number(y) - 6}
                            x2={Number(x)} y2={Number(y) + Number(h) + 6}
                            stroke={up ? "rgba(16,185,129,0.6)" : "rgba(239,68,68,0.6)"}
                            strokeWidth="1.5"
                          />
                          <rect
                            x={Number(x) - Number(w) / 2}
                            y={Number(y)}
                            width={Number(w)}
                            height={Number(h)}
                            fill={up ? "rgba(16,185,129,0.9)" : "rgba(239,68,68,0.9)"}
                            rx="1.5"
                          />
                        </g>
                      ))}
                      {/* Trend line */}
                      <path
                        d="M0,110 L50,100 L100,92 L150,82 L200,72 L250,60 L300,46 L350,35 L400,24 L450,13 L500,7"
                        stroke="#38bdf8" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5"
                      />
                      <path
                        d="M0,110 L50,100 L100,92 L150,82 L200,72 L250,60 L300,46 L350,35 L400,24 L450,13 L500,7 L500,120 L0,120 Z"
                        fill="url(#tradeGrad2)"
                      />
                    </svg>
                  </div>

                  {/* Order book — synthesized around the same BTC price as above */}
                  {(() => {
                    const mid = btcPreview?.price ?? 0;
                    const buys  = [
                      { offset: -130, amt: "0.420" },
                      { offset: -180, amt: "1.205" },
                      { offset: -230, amt: "2.840" },
                    ];
                    const sells = [
                      { offset:  120, amt: "0.310" },
                      { offset:  170, amt: "0.985" },
                      { offset:  220, amt: "1.620" },
                    ];
                    return (
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <div className="text-[10px] font-bold text-emerald-400 mb-2 tracking-wider uppercase"
                            style={{ textShadow: "0 0 8px rgba(16,185,129,0.4)" }}>Buy Orders</div>
                          {buys.map((row) => (
                            <div key={row.offset} className="flex justify-between text-[10px] py-1 border-b border-white/[0.04]">
                              <span className="text-emerald-400 font-medium">{formatCurrency(mid + row.offset)}</span>
                              <span className="text-slate-500">{row.amt} BTC</span>
                            </div>
                          ))}
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-red-400 mb-2 tracking-wider uppercase"
                            style={{ textShadow: "0 0 8px rgba(239,68,68,0.4)" }}>Sell Orders</div>
                          {sells.map((row) => (
                            <div key={row.offset} className="flex justify-between text-[10px] py-1 border-b border-white/[0.04]">
                              <span className="text-red-400 font-medium">{formatCurrency(mid + row.offset)}</span>
                              <span className="text-slate-500">{row.amt} BTC</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Trade buttons */}
                <div className="px-4 py-3 bg-[#020b18]/70 border-t border-white/[0.05] grid grid-cols-2 gap-3">
                  <div className="text-xs font-bold py-2.5 rounded-xl text-center transition-all cursor-default"
                    style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981", textShadow: "0 0 10px rgba(16,185,129,0.4)" }}>
                    BUY BTC
                  </div>
                  <div className="text-xs font-bold py-2.5 rounded-xl text-center transition-all cursor-default"
                    style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", textShadow: "0 0 10px rgba(239,68,68,0.4)" }}>
                    SELL BTC
                  </div>
                </div>
              </div>
            </div>

            {/* Text content */}
            <div>
              <Badge className="mb-4 bg-sky-500/10 text-sky-400 border-sky-500/20 text-xs tracking-widest uppercase">
                Trading Platform
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5">
                Professional-Grade{" "}
                <span className="gradient-text">Trading Interface</span>
              </h2>
              <p className="text-slate-400 mb-8 leading-relaxed">
                A full-featured trading environment with clear order books, advanced charting,
                and clean execution — engineered for serious traders who want a premium interface
                without the clutter.
              </p>
              <div className="space-y-5">
                {[
                  { icon: BarChart3,  label: "Candlestick Charts",     desc: "Multi-timeframe charts with volume, indicators, and price action" },
                  { icon: Zap,        label: "Clean Order Execution",  desc: "Market & limit orders with clear confirmation and full history" },
                  { icon: Wallet,     label: "Multi-Asset Portfolio",  desc: "Manage BTC, ETH, SOL and 50+ assets in one unified dashboard" },
                  { icon: TrendingUp, label: "Performance Analytics",  desc: "Track P&L, ROI, win rate, and portfolio growth over time" },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <item.icon className="h-4 w-4 text-sky-400" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{item.label}</div>
                      <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                size="lg"
                render={<Link href="/register" />}
                className="mt-8 bg-sky-500 hover:bg-sky-400 text-white font-semibold px-8 h-11 shadow-lg shadow-sky-500/25 hover:scale-[1.02] transition-all duration-200"
              >
                Start Trading Now <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
        style={{ background: "linear-gradient(180deg, oklch(0.07 0.02 240) 0%, oklch(0.075 0.022 238) 50%, oklch(0.07 0.02 240) 100%)" }}>
        {/* Top border light */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-px pointer-events-none"
          style={{ background: "linear-gradient(90deg, transparent, rgba(14,165,233,0.14), transparent)" }} />
        {/* Ambient top-center light */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-[500px] h-48 rounded-full blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(14,165,233,0.06), transparent)" }} />
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <Badge className="mb-4 bg-sky-500/10 text-sky-400 border-sky-500/20 text-xs tracking-widest uppercase">
              Platform Features
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Built for Serious Traders</h2>
            <p className="text-slate-400 max-w-xl mx-auto leading-relaxed">
              Every tool you need to manage, analyze, and grow your portfolio with the precision and confidence of an institutional trader.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(feature => (
              <div key={feature.title} className="feature-card rounded-xl p-6 group">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110"
                  style={{ background: "rgba(14,165,233,0.12)", border: "1px solid rgba(14,165,233,0.25)", boxShadow: "0 0 0 0 rgba(14,165,233,0)" }}
                >
                  <feature.icon className="h-5 w-5 text-sky-400 group-hover:text-sky-300 transition-colors duration-200"
                    style={{ filter: "drop-shadow(0 0 6px rgba(14,165,233,0.5))" }} />
                </div>
                <h3 className="text-base font-semibold text-white mb-2 group-hover:text-sky-100 transition-colors duration-200">{feature.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors duration-200">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
        style={{ background: "linear-gradient(180deg, #040f1f 0%, #030c1c 50%, #040f1f 100%)" }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px pointer-events-none"
          style={{ background: "linear-gradient(90deg, transparent, rgba(14,165,233,0.1), transparent)" }} />
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <Badge className="mb-4 bg-sky-500/10 text-sky-400 border-sky-500/20 text-xs tracking-widest uppercase">
              How It Works
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Get Started in Minutes</h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Four simple steps from registration to your first live trade.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {/* Connector line — desktop only */}
            <div className="hidden lg:block absolute top-[2.6rem] left-[14%] right-[14%] h-px bg-gradient-to-r from-transparent via-sky-500/25 to-transparent pointer-events-none" />
            {steps.map(step => (
              <div key={step.step} className="relative glass-card rounded-xl p-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mx-auto mb-5">
                  <div className="text-xl font-black gradient-text leading-none">{step.step}</div>
                </div>
                <h3 className="text-sm font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust & Security ───────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
        style={{ background: "linear-gradient(180deg, oklch(0.075 0.022 238) 0%, oklch(0.08 0.02 240) 50%, oklch(0.075 0.022 238) 100%)" }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-px pointer-events-none"
          style={{ background: "linear-gradient(90deg, transparent, rgba(14,165,233,0.14), transparent)" }} />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-px pointer-events-none"
          style={{ background: "linear-gradient(90deg, transparent, rgba(14,165,233,0.08), transparent)" }} />
        {/* Shield glow — top-right */}
        <div className="absolute -top-10 right-0 w-80 h-64 rounded-full blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(14,165,233,0.07), transparent)" }} />
        {/* Emerald accent — bottom-left */}
        <div className="absolute -bottom-16 -left-8 w-64 h-48 rounded-full blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(16,185,129,0.04), transparent)" }} />
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <Badge className="mb-4 bg-sky-500/10 text-sky-400 border-sky-500/20 text-xs tracking-widest uppercase">
                Security First
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5">
                Premium Account <span className="gradient-text">Security</span>
              </h2>
              <p className="text-slate-400 mb-8 leading-relaxed">
                We take security seriously. Your account, data, and digital assets are protected
                with clean, well-audited infrastructure and sensible defaults at every layer.
              </p>
              <div className="space-y-3.5">
                {[
                  "Email one-time passcode login flow",
                  "Bcrypt-hashed password storage",
                  "Role-based admin access controls",
                  "Comprehensive audit trail for every action",
                  "Manual review for deposits & withdrawals",
                ].map(item => (
                  <div key={item} className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-sm text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {trust.map(t => (
                <div key={t.title} className="glass-card glass-card-hover rounded-xl p-5">
                  <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-4">
                    <t.icon className="h-5 w-5 text-sky-400" />
                  </div>
                  <h4 className="text-sm font-semibold text-white mb-1.5">{t.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">{t.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
        style={{ background: "linear-gradient(180deg, oklch(0.065 0.022 240) 0%, oklch(0.055 0.018 240) 50%, oklch(0.06 0.02 240) 100%)" }}>
        {/* Primary centered glow — much larger and brighter */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[900px] h-[550px] rounded-full blur-[140px]"
            style={{ background: "radial-gradient(ellipse, rgba(14,165,233,0.26) 0%, rgba(34,211,238,0.12) 35%, transparent 65%)" }} />
        </div>
        {/* Secondary cyan ring glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[320px] rounded-full blur-[80px]"
            style={{ background: "radial-gradient(ellipse, rgba(56,189,248,0.1) 0%, transparent 60%)" }} />
        </div>
        {/* Corner accent lights */}
        <div className="absolute top-0 left-0 w-64 h-48 rounded-full blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(14,165,233,0.06), transparent)" }} />
        <div className="absolute bottom-0 right-0 w-64 h-48 rounded-full blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(34,211,238,0.05), transparent)" }} />

        <div className="max-w-4xl mx-auto text-center relative">
          <div className="rounded-3xl p-12 relative overflow-hidden"
            style={{
              background: "rgba(3, 9, 20, 0.92)",
              border: "1px solid rgba(14,165,233,0.28)",
              backdropFilter: "blur(32px)",
              WebkitBackdropFilter: "blur(32px)",
              boxShadow: "0 0 0 1px rgba(14,165,233,0.08), 0 50px 120px rgba(0,0,0,0.7), 0 0 80px rgba(14,165,233,0.08), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 0 60px rgba(14,165,233,0.025)"
            }}>
            {/* Card inner gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/8 via-transparent to-cyan-500/5 pointer-events-none rounded-3xl" />
            {/* Top shimmer line — brighter */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-px"
              style={{ background: "linear-gradient(90deg, transparent, rgba(14,165,233,0.85), transparent)" }} />
            {/* Bottom subtle light */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-56 h-px"
              style={{ background: "linear-gradient(90deg, transparent, rgba(14,165,233,0.25), transparent)" }} />

            <div className="relative">
              <Badge className="mb-6 bg-sky-500/10 text-sky-400 border-sky-500/25 text-xs tracking-widest uppercase">
                Ready to Trade?
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Start Your Trading Journey
              </h2>
              <p className="text-slate-400 mb-10 max-w-lg mx-auto leading-relaxed">
                Join thousands of verified traders on Vaultex Market. Open your account today and
                access clean execution, up-to-date market data, and dedicated support.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  render={<Link href="/register" />}
                  className="animate-btn-glow bg-sky-500 hover:bg-sky-400 text-white font-bold px-12 h-14 hover:scale-[1.04] active:scale-[0.98] transition-all duration-200 rounded-xl text-base"
                >
                  Create Free Account <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  render={<Link href="/login" />}
                  className="border-sky-500/20 text-slate-300 hover:bg-sky-500/8 hover:text-white hover:border-sky-500/35 h-14 px-8 rounded-xl transition-all duration-200"
                >
                  Sign In
                </Button>
              </div>
              <p className="text-xs text-slate-600 mt-6">No setup fees · KYC-verified onboarding · Instant account activation</p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
