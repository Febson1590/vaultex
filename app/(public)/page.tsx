import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, Shield, Zap, Globe, Users, BarChart3,
  ChevronRight, CheckCircle2, Lock, Eye, RefreshCw, Award,
  ArrowUpRight, ArrowDownRight, LineChart, HeadphonesIcon,
  Clock, DollarSign, Activity, Wallet, TrendingUp,
} from "lucide-react";
import { db } from "@/lib/db";
import { formatCurrency, formatPercent, formatCompact } from "@/lib/utils";

/* ─── Static ticker data — major cryptocurrencies ─────────────────────── */
const STATIC_TICKERS = [
  { symbol: "BTC",   name: "Bitcoin",   price: 84231.50, change:  2.34 },
  { symbol: "ETH",   name: "Ethereum",  price:  3921.80, change:  1.87 },
  { symbol: "USDT",  name: "Tether",    price:     1.00, change:  0.01 },
  { symbol: "BNB",   name: "BNB",       price:   621.40, change:  3.12 },
  { symbol: "SOL",   name: "Solana",    price:   182.60, change:  4.21 },
  { symbol: "XRP",   name: "XRP",       price:     0.62, change: -0.82 },
  { symbol: "ADA",   name: "Cardano",   price:     0.58, change:  1.24 },
  { symbol: "DOGE",  name: "Dogecoin",  price:     0.18, change:  5.63 },
  { symbol: "AVAX",  name: "Avalanche", price:    42.18, change: -1.34 },
  { symbol: "MATIC", name: "Polygon",   price:     0.93, change:  2.09 },
  { symbol: "DOT",   name: "Polkadot",  price:     8.21, change:  0.73 },
  { symbol: "LINK",  name: "Chainlink", price:    18.52, change:  2.94 },
  { symbol: "LTC",   name: "Litecoin",  price:    98.34, change: -0.45 },
  { symbol: "UNI",   name: "Uniswap",   price:    12.64, change:  3.41 },
  { symbol: "ATOM",  name: "Cosmos",    price:     9.82, change:  1.16 },
];

/* ─── Feature cards ───────────────────────────────────────────────────── */
const features = [
  {
    icon: BarChart3,
    title: "Real-Time Portfolio Tracking",
    desc: "Monitor your simulated portfolio with live P&L, asset allocation charts, and performance analytics updated continuously.",
  },
  {
    icon: Zap,
    title: "Instant Trade Execution",
    desc: "Place simulated buy and sell orders instantly with market and limit order types across all supported digital assets.",
  },
  {
    icon: Shield,
    title: "Institutional-Grade Security",
    desc: "Your account is protected with industry-standard authentication, encrypted data storage, and comprehensive audit trails.",
  },
  {
    icon: LineChart,
    title: "Advanced Charting",
    desc: "Visualize market trends, portfolio performance, and asset allocation with professional-grade interactive charts.",
  },
  {
    icon: HeadphonesIcon,
    title: "24/7 Support Desk",
    desc: "Submit support tickets and get responses from our team any time. Priority support for verified accounts.",
  },
  {
    icon: Globe,
    title: "Global Market Coverage",
    desc: "Access a curated selection of top cryptocurrencies with real-time simulated pricing and market data.",
  },
];

/* ─── Platform stats ──────────────────────────────────────────────────── */
const stats = [
  { label: "Active Traders",   value: "12,400+", icon: Users      },
  { label: "Assets Supported", value: "50+",     icon: Activity   },
  { label: "Daily Volume",     value: "$2.4B",   icon: DollarSign },
  { label: "Uptime",           value: "99.9%",   icon: Clock      },
];

/* ─── How It Works steps ──────────────────────────────────────────────── */
const steps = [
  { step: "01", title: "Create Your Account",   desc: "Register in under 2 minutes with your email address. No credit card required to get started." },
  { step: "02", title: "Complete Verification", desc: "Submit your identity documents to unlock full platform access and higher portfolio limits." },
  { step: "03", title: "Fund Your Wallet",      desc: "Submit a simulated deposit request and get your virtual wallet funded by the platform team." },
  { step: "04", title: "Start Trading",         desc: "Execute simulated trades across BTC, ETH, USDT and more with real-time price data." },
];

/* ─── Trust & Security items ──────────────────────────────────────────── */
const trust = [
  { icon: Lock,      title: "Encrypted Data",    desc: "All user data is encrypted at rest and in transit using AES-256 encryption." },
  { icon: Eye,       title: "Full Transparency",  desc: "Every transaction is logged and visible in your complete transaction history." },
  { icon: RefreshCw, title: "Real-Time Updates",  desc: "All admin changes reflect instantly across your sessions and devices." },
  { icon: Award,     title: "Compliance Ready",   desc: "Built with KYC/AML workflow and regulatory-grade user verification." },
];

/* ─── Data fetching ───────────────────────────────────────────────────── */
async function getMarketData() {
  try {
    return await db.marketAsset.findMany({
      where: { isActive: true },
      orderBy: { rank: "asc" },
      take: 6,
    });
  } catch { return []; }
}

/* ─── Page component ──────────────────────────────────────────────────── */
export default async function HomePage() {
  const dbAssets = await getMarketData();

  // Merge DB assets (authoritative prices) with static ticker list
  const dbSymbols = new Set(dbAssets.map(a => a.symbol));
  const tickerItems = [
    ...dbAssets.map(a => ({
      symbol: a.symbol,
      name:   a.name,
      price:  Number(a.currentPrice),
      change: Number(a.priceChange24h),
    })),
    ...STATIC_TICKERS.filter(t => !dbSymbols.has(t.symbol)),
  ];

  return (
    <div className="hero-bg overflow-x-hidden">

      {/* ── Ticker Bar ─────────────────────────────────────────────────── */}
      <div className="ticker-wrap fixed top-16 left-0 right-0 z-40 bg-[#020b18]/90 backdrop-blur-md border-b border-sky-500/10 h-9 flex items-center overflow-hidden">
        <div className="flex animate-ticker whitespace-nowrap select-none">
          {[...tickerItems, ...tickerItems].map((asset, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-2 px-5 text-[11px] border-r border-white/5 last:border-0"
            >
              <span className="font-bold text-white tracking-wide">{asset.symbol}</span>
              <span className="text-slate-400">{formatCurrency(asset.price)}</span>
              <span className={`flex items-center gap-0.5 font-medium ${asset.change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {asset.change >= 0
                  ? <ArrowUpRight size={10} />
                  : <ArrowDownRight size={10} />}
                {Math.abs(asset.change).toFixed(2)}%
              </span>
            </span>
          ))}
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
              <h1 className="text-5xl sm:text-6xl font-bold text-white mb-6 leading-[1.08] tracking-tight">
                Trade Digital Assets{" "}
                <span className="gradient-text">with Institutional</span>
                <br />Confidence
              </h1>
              <p className="text-lg text-slate-400 max-w-lg mb-10 leading-relaxed">
                Experience the future of crypto trading on a secure, simulated brokerage platform
                tailored for professionals. BTC, ETH, USDT and 50+ assets — all in one place.
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
                  <CheckCircle2 size={13} className="text-emerald-400" /> SSL Secured
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-400" /> 2FA Protected
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-400" /> KYC / AML Compliant
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-400" /> No Risk — Simulated
                </span>
              </div>
            </div>

            {/* Right — Dashboard mockup */}
            <div className="relative hidden lg:block">
              {/* Ambient glow layers */}
              <div className="absolute -inset-10 bg-sky-500/8 rounded-3xl blur-3xl pointer-events-none" />
              <div className="absolute -inset-6 bg-cyan-400/4 rounded-3xl blur-2xl pointer-events-none" />

              {/* App window frame */}
              <div className="relative glass-card rounded-2xl overflow-hidden border border-sky-500/25 shadow-2xl">

                {/* Titlebar */}
                <div className="flex items-center gap-3 px-4 py-3 bg-[#030d1a] border-b border-white/5">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                    <div className="w-3 h-3 rounded-full bg-green-500/50" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="text-[11px] text-slate-500 bg-[#040f1f] px-4 py-1 rounded-md border border-white/5">
                      vaultex.market — Portfolio Dashboard
                    </div>
                  </div>
                </div>

                {/* Dashboard body */}
                <div className="p-5 space-y-5 bg-[#030d1a]/60">

                  {/* Portfolio value row */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-[10px] text-slate-500 mb-0.5 tracking-wider uppercase">Total Portfolio Value</div>
                      <div className="text-3xl font-bold text-white tracking-tight">$284,392.50</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-emerald-400 text-sm flex items-center gap-0.5 font-semibold">
                          <ArrowUpRight size={14} /> +4.28%
                        </span>
                        <span className="text-slate-500 text-xs">vs yesterday</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500 mb-0.5 tracking-wider uppercase">24h P&amp;L</div>
                      <div className="text-xl font-bold text-emerald-400">+$11,842</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">+$234 unrealised</div>
                    </div>
                  </div>

                  {/* SVG price chart */}
                  <div className="relative w-full h-20 rounded-lg overflow-hidden bg-[#020b18]/60 border border-white/5">
                    <svg viewBox="0 0 400 70" preserveAspectRatio="none" className="w-full h-full">
                      <defs>
                        <linearGradient id="heroChartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {/* Subtle grid */}
                      {[17, 35, 52].map(y => (
                        <line key={y} x1="0" y1={y} x2="400" y2={y}
                          stroke="rgba(14,165,233,0.06)" strokeWidth="1" />
                      ))}
                      {/* Fill */}
                      <path
                        d="M0,60 C30,58 55,54 80,50 C105,46 125,48 150,42 C175,36 195,38 220,30 C245,22 265,25 290,18 C315,11 335,13 360,7 C380,3 390,4 400,2 L400,70 L0,70 Z"
                        fill="url(#heroChartGrad)"
                      />
                      {/* Line */}
                      <path
                        d="M0,60 C30,58 55,54 80,50 C105,46 125,48 150,42 C175,36 195,38 220,30 C245,22 265,25 290,18 C315,11 335,13 360,7 C380,3 390,4 400,2"
                        stroke="#0ea5e9"
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                      />
                      {/* Dot at current price */}
                      <circle cx="400" cy="2" r="3" fill="#0ea5e9" />
                      <circle cx="400" cy="2" r="6" fill="#0ea5e9" fillOpacity="0.2" />
                    </svg>
                  </div>

                  {/* Asset allocation rows */}
                  <div className="space-y-3">
                    {[
                      { s: "BTC", n: "Bitcoin",  p: "$84,231", c: "+2.34%", alloc: "42%", up: true  },
                      { s: "ETH", n: "Ethereum", p: "$3,921",  c: "+1.87%", alloc: "28%", up: true  },
                      { s: "SOL", n: "Solana",   p: "$182.60", c: "+4.21%", alloc: "18%", up: true  },
                      { s: "BNB", n: "BNB",      p: "$621.40", c: "+3.12%", alloc: "12%", up: true  },
                    ].map(asset => (
                      <div key={asset.s} className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-[9px] font-bold text-sky-400 leading-none">{asset.s}</span>
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-white">{asset.s}</div>
                            <div className="text-[10px] text-slate-500">{asset.alloc} portfolio</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {/* Mini allocation bar */}
                          <div className="hidden sm:flex items-center gap-1">
                            <div className="w-14 h-1 rounded-full bg-white/5 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-sky-500/60"
                                style={{ width: asset.alloc }}
                              />
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-semibold text-white">{asset.p}</div>
                            <div className={`text-[10px] font-medium ${asset.up ? "text-emerald-400" : "text-red-400"}`}>{asset.c}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating badge — trade executed */}
              <div className="absolute -bottom-5 -right-6 glass-card rounded-xl px-4 py-3 border border-emerald-500/25 shadow-xl animate-float">
                <div className="text-[10px] text-slate-500 mb-0.5">Order Filled</div>
                <div className="text-sm font-bold text-white">BTC +0.500</div>
                <div className="text-[10px] text-emerald-400 mt-0.5">@ $84,231.50 · Market</div>
              </div>

              {/* Floating badge — live status */}
              <div className="absolute -top-5 -left-6 glass-card rounded-xl px-4 py-3 border border-sky-500/25 shadow-xl">
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                  <div className="text-[10px] font-semibold text-slate-300">Markets Live</div>
                </div>
                <div className="text-[10px] text-slate-500">50+ assets active</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Strip ────────────────────────────────────────────────── */}
      <div className="border-y border-white/5 bg-[#040f1f]/80">
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
      {dbAssets.length > 0 && (
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Market Overview</h2>
                <p className="text-sm text-slate-500">Top assets by market cap · Updated live</p>
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
              {dbAssets.map(asset => {
                const change = Number(asset.priceChange24h);
                const isUp = change >= 0;
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
                        {formatPercent(change)}
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">{formatCurrency(Number(asset.currentPrice))}</div>
                    <div className="text-xs text-slate-500">
                      Vol: {formatCompact(Number(asset.volume24h || 0))} · MCap: {formatCompact(Number(asset.marketCap || 0))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Platform Preview ────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#040f1f]">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Trading interface mockup */}
            <div className="relative">
              <div className="absolute -inset-8 bg-sky-500/6 rounded-3xl blur-3xl pointer-events-none" />
              <div className="relative glass-card rounded-2xl overflow-hidden border border-sky-500/20">

                {/* Top bar */}
                <div className="flex items-center justify-between px-4 py-3 bg-[#020b18]/90 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-bold text-white">BTC / USD</div>
                    <div className="text-sm font-semibold text-emerald-400">$84,231.50</div>
                    <div className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-medium">▲ +2.34%</div>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] text-slate-500">
                    <span>H <span className="text-slate-400">$85,100</span></span>
                    <span>L <span className="text-slate-400">$82,400</span></span>
                    <span>Vol <span className="text-slate-400">$28.4B</span></span>
                  </div>
                </div>

                {/* Chart area */}
                <div className="p-4 bg-[#020b18]/30">
                  <div className="h-36 relative rounded-lg overflow-hidden border border-white/5 bg-[#020b18]/40">
                    <svg viewBox="0 0 500 110" preserveAspectRatio="none" className="w-full h-full">
                      <defs>
                        <linearGradient id="tradeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.15" />
                          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {/* Grid lines */}
                      {[22, 44, 66, 88].map(y => (
                        <line key={y} x1="0" y1={y} x2="500" y2={y}
                          stroke="rgba(14,165,233,0.05)" strokeWidth="1" />
                      ))}
                      {/* Candlestick bars */}
                      {[
                        [25,80,18,8,false],[50,72,16,7,true],[75,64,20,9,true],[100,72,18,8,false],
                        [125,60,16,7,true],[150,52,18,8,true],[175,58,20,9,false],[200,44,16,7,true],
                        [225,38,18,8,true],[250,30,16,7,true],[275,24,18,8,true],[300,18,16,7,true],
                        [325,24,20,9,false],[350,16,18,8,true],[375,10,16,7,true],[400,14,18,8,false],
                        [425,8,16,7,true],[450,4,18,8,true],[475,6,16,7,false],
                      ].map(([x,y,h,w,up], i) => (
                        <g key={i}>
                          <line
                            x1={Number(x)} y1={Number(y) - 5}
                            x2={Number(x)} y2={Number(y) + Number(h) + 5}
                            stroke={up ? "rgba(16,185,129,0.5)" : "rgba(239,68,68,0.5)"}
                            strokeWidth="1"
                          />
                          <rect
                            x={Number(x) - Number(w) / 2}
                            y={Number(y)}
                            width={Number(w)}
                            height={Number(h)}
                            fill={up ? "rgba(16,185,129,0.8)" : "rgba(239,68,68,0.8)"}
                            rx="1"
                          />
                        </g>
                      ))}
                      {/* Overlay trend line */}
                      <path
                        d="M0,100 L50,90 L100,85 L150,75 L200,65 L250,55 L300,42 L350,32 L400,22 L450,12 L500,6"
                        stroke="#0ea5e9"
                        strokeWidth="1.5"
                        fill="none"
                        strokeLinecap="round"
                        opacity="0.6"
                      />
                      <path
                        d="M0,100 L50,90 L100,85 L150,75 L200,65 L250,55 L300,42 L350,32 L400,22 L450,12 L500,6 L500,110 L0,110 Z"
                        fill="url(#tradeGrad)"
                      />
                    </svg>
                  </div>

                  {/* Order book */}
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <div className="text-[10px] font-semibold text-emerald-400 mb-2 tracking-wider">BUY ORDERS</div>
                      {[
                        ["$84,100.00", "0.420 BTC"],
                        ["$84,050.00", "1.205 BTC"],
                        ["$84,000.00", "2.840 BTC"],
                      ].map(([price, amt]) => (
                        <div key={price} className="flex justify-between text-[10px] py-0.5 border-b border-white/3">
                          <span className="text-emerald-400">{price}</span>
                          <span className="text-slate-500">{amt}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold text-red-400 mb-2 tracking-wider">SELL ORDERS</div>
                      {[
                        ["$84,350.00", "0.310 BTC"],
                        ["$84,400.00", "0.985 BTC"],
                        ["$84,450.00", "1.620 BTC"],
                      ].map(([price, amt]) => (
                        <div key={price} className="flex justify-between text-[10px] py-0.5 border-b border-white/3">
                          <span className="text-red-400">{price}</span>
                          <span className="text-slate-500">{amt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Trade buttons */}
                <div className="px-4 py-3 bg-[#020b18]/70 border-t border-white/5 grid grid-cols-2 gap-3">
                  <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold py-2 rounded-lg text-center">
                    BUY BTC
                  </div>
                  <div className="bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold py-2 rounded-lg text-center">
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
                Experience a full-featured simulated trading environment with real-time order books,
                advanced charting, and instant execution — designed for serious traders who demand
                institutional-quality tools.
              </p>
              <div className="space-y-5">
                {[
                  { icon: BarChart3,  label: "Candlestick Charts",        desc: "Multi-timeframe charts with volume, indicators, and price action" },
                  { icon: Zap,        label: "Instant Order Execution",    desc: "Market & limit orders with real-time confirmation and history" },
                  { icon: Wallet,     label: "Multi-Asset Portfolio",      desc: "Manage BTC, ETH, SOL and 50+ assets in one unified dashboard" },
                  { icon: TrendingUp, label: "Performance Analytics",      desc: "Track P&L, ROI, win rate, and portfolio growth over time" },
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
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <Badge className="mb-4 bg-sky-500/10 text-sky-400 border-sky-500/20 text-xs tracking-widest uppercase">
              Platform Features
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Built for Serious Traders</h2>
            <p className="text-slate-400 max-w-xl mx-auto leading-relaxed">
              Every tool you need to manage, track, and grow your simulated portfolio like a professional.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(feature => (
              <div key={feature.title} className="glass-card glass-card-hover rounded-xl p-6 group">
                <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-5 group-hover:bg-sky-500/15 transition-colors duration-200">
                  <feature.icon className="h-5 w-5 text-sky-400" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#040f1f]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <Badge className="mb-4 bg-sky-500/10 text-sky-400 border-sky-500/20 text-xs tracking-widest uppercase">
              How It Works
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Get Started in Minutes</h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Four simple steps from registration to your first simulated trade.
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
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <Badge className="mb-4 bg-sky-500/10 text-sky-400 border-sky-500/20 text-xs tracking-widest uppercase">
                Security First
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5">
                Institutional-Grade <span className="gradient-text">Security</span>
              </h2>
              <p className="text-slate-400 mb-8 leading-relaxed">
                We take security seriously. Your account, data, and simulated assets are protected with
                best-in-class security infrastructure built for enterprise-grade applications.
              </p>
              <div className="space-y-3.5">
                {[
                  "Multi-layer account authentication",
                  "256-bit encrypted data storage",
                  "Admin-controlled access controls",
                  "Comprehensive audit trail for all actions",
                  "Real-time fraud detection system",
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
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#040f1f]">
        <div className="max-w-4xl mx-auto text-center">
          <div className="glass-card rounded-2xl p-12 border-sky-500/20 relative overflow-hidden">
            {/* Background gradients */}
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 via-transparent to-cyan-500/5 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-transparent via-sky-500/2 to-transparent pointer-events-none" />
            {/* Top accent line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-sky-500/60 to-transparent" />

            <div className="relative">
              <Badge className="mb-6 bg-sky-500/10 text-sky-400 border-sky-500/20 text-xs tracking-widest uppercase">
                Ready to Trade?
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Start Your Trading Journey
              </h2>
              <p className="text-slate-400 mb-8 max-w-lg mx-auto leading-relaxed">
                Join thousands of traders on Vaultex Market. Create your free account and start
                your simulated trading journey today — zero risk, full experience.
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
              <p className="text-xs text-slate-600 mt-6">No credit card required · Free forever · Instant access</p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
