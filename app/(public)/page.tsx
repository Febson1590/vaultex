import Link from "next/link";
import {
  ArrowRight, Zap, Globe, BarChart3,
  CheckCircle2, Lock, Eye, RefreshCw, Award,
  ArrowUpRight, ArrowDownRight, LineChart, HeadphonesIcon,
  Activity, ShieldCheck, KeyRound, FileCheck2,
  ChevronRight, LayoutGrid,
} from "lucide-react";
import { getMarketAssets } from "@/lib/coingecko";
import { formatCurrency, formatPercent, formatCompact } from "@/lib/utils";
import { MarketPanel }     from "@/components/public/market-panel";
import { Sparkline }       from "@/components/public/sparkline";
import { WatchlistStrip }  from "@/components/public/watchlist-strip";
import { QuickTrade }      from "@/components/public/quick-trade";

/* ─── Per-symbol brand color accents ──────────────────────────────────── */
const CRYPTO_COLORS: Record<string, string> = {
  BTC:  "#f7931a", ETH:  "#627eea", USDT: "#26a17b", BNB:  "#f3ba2f",
  SOL:  "#9945ff", XRP:  "#346aa9", ADA:  "#3cc8c8", DOGE: "#c2a633",
  AVAX: "#e84142", POL:  "#8247e5", DOT:  "#e6007a", LINK: "#2a5ada",
  LTC:  "#bebebe", UNI:  "#ff007a", ATOM: "#6f7390",
};

/* ─── Feature cards ───────────────────────────────────────────────────── */
const features = [
  {
    icon: BarChart3,
    title: "Portfolio Tracking",
    desc: "Monitor holdings with clean P&L, asset allocation charts, and performance analytics across every session.",
  },
  {
    icon: Zap,
    title: "Fast Trade Execution",
    desc: "Place market and limit orders across 50+ digital assets with clear confirmation and full order history.",
  },
  {
    icon: ShieldCheck,
    title: "Account Security",
    desc: "Email one-time passcodes, bcrypt-hashed passwords, and a complete audit trail on every account action.",
  },
  {
    icon: LineChart,
    title: "Professional Charts",
    desc: "Multi-timeframe candlestick charts, essential indicators, and clean price action visuals.",
  },
  {
    icon: HeadphonesIcon,
    title: "Dedicated Support",
    desc: "Submit tickets from your dashboard and get responses from our team, with priority handling for verified users.",
  },
  {
    icon: Globe,
    title: "Broad Market Coverage",
    desc: "A curated selection of top digital assets with updated pricing and a single unified view of every pair.",
  },
];

/* ─── Trust items ──────────────────────────────────────────────────────── */
const trust = [
  { icon: Lock,      title: "Encrypted Transport",  desc: "All user data is transmitted over TLS and passwords are hashed with industry-standard bcrypt." },
  { icon: Eye,       title: "Full Transparency",    desc: "Every deposit, trade, and withdrawal is logged and visible in your complete transaction history." },
  { icon: RefreshCw, title: "Synced Account",       desc: "Balances and order updates reflect quickly across every session and device you use." },
  { icon: Award,     title: "Identity Verified",    desc: "A reviewed KYC workflow with manual document verification for every funded account." },
];

/* ─── How it works steps ──────────────────────────────────────────────── */
const steps = [
  { n: "01", title: "Create Account",     desc: "Register in minutes with your email. No credit card or commitment up front."                       },
  { n: "02", title: "Verify Identity",    desc: "Submit your ID documents to unlock full access, higher limits, and dedicated support."             },
  { n: "03", title: "Fund Your Wallet",   desc: "Deposit via supported channels. Every transfer is reviewed and credited by our finance team."      },
  { n: "04", title: "Start Trading",      desc: "Buy and sell BTC, ETH, USDT and 50+ assets with clear order confirmation and a full audit trail."  },
];

export default async function HomePage() {
  /* Single unified data source for every public surface on this page. */
  const marketAssets = await getMarketAssets();
  const tickerItems  = marketAssets;
  const btc          = marketAssets.find((a) => a.symbol === "BTC");
  const eth          = marketAssets.find((a) => a.symbol === "ETH");

  /* Derived stats for the hero. */
  const totalVolume = marketAssets.reduce((acc, a) => acc + a.volume24h, 0);
  const totalMcap   = marketAssets.reduce((acc, a) => acc + a.marketCap, 0);
  const avgChange   = marketAssets.reduce((acc, a) => acc + a.change, 0) / (marketAssets.length || 1);

  const heroStats: { label: string; value: string; accent?: "up" | "down" }[] = [
    { label: "24h Volume",   value: `$${formatCompact(totalVolume)}` },
    { label: "Market Cap",   value: `$${formatCompact(totalMcap)}`   },
    { label: "Avg 24h Δ",    value: formatPercent(avgChange), accent: avgChange >= 0 ? "up" : "down" },
    { label: "Listed",       value: `${marketAssets.length}`         },
  ];

  return (
    <div className="hero-bg overflow-x-hidden">

      {/* ── Global grain texture overlay ──────────────────────────────── */}
      <div className="noise-grain fixed inset-0 pointer-events-none z-0 opacity-[0.018]" aria-hidden="true" />

      {/* ── Ticker Bar ────────────────────────────────────────────────── */}
      <div
        className="ticker-wrap fixed top-16 left-0 right-0 z-40 h-9 flex items-center overflow-hidden"
        style={{
          background: "linear-gradient(180deg, rgba(2,11,24,0.97) 0%, rgba(3,13,27,0.94) 100%)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(148,163,184,0.08)",
          boxShadow: "0 1px 0 rgba(14,165,233,0.04)",
        }}
      >
        <div className="flex animate-ticker whitespace-nowrap select-none">
          {[...tickerItems, ...tickerItems].map((asset, i) => {
            const color = CRYPTO_COLORS[asset.symbol] ?? "#0ea5e9";
            const isUp  = asset.change >= 0;
            return (
              <span
                key={i}
                className="inline-flex items-center gap-2.5 px-5 text-[11px] border-r border-white/[0.05] tabular-nums"
              >
                <span
                  className="inline-flex w-3.5 h-3.5 rounded-full items-center justify-center flex-shrink-0 text-[7px] font-black"
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

      {/* ══════════════════════════════════════════════════════════════════
           HERO — Exchange Terminal (3 product panels on the right)
      ══════════════════════════════════════════════════════════════════ */}
      <section className="pt-36 pb-12 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.35fr)] gap-8 lg:gap-10 items-start">

            {/* ── LEFT: Headline + CTAs + trust row + stats ─────────── */}
            <div className="pt-6 lg:pt-10">
              <div className="vx-eyebrow mb-4">
                Premium Crypto Brokerage
              </div>

              <h1 className="text-[38px] sm:text-[46px] lg:text-[52px] font-bold text-white leading-[1.04] tracking-tight mb-4">
                One terminal.
                <br />
                <span className="gradient-text">Every major market.</span>
              </h1>

              <p className="text-[14px] sm:text-[15px] text-slate-400 max-w-lg mb-7 leading-relaxed">
                Vaultex Market is a premium crypto brokerage built for serious traders — with clean
                execution, strong account security, and a unified view of BTC, ETH, USDT and 50+
                digital assets in one professional interface.
              </p>

              <div className="flex flex-col sm:flex-row gap-2.5 mb-7">
                <Link
                  href="/register"
                  className="vx-btn-primary inline-flex items-center justify-center gap-2 h-11 px-6 rounded-lg text-[13px]"
                >
                  Open Free Account <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/markets"
                  className="vx-btn-ghost inline-flex items-center justify-center gap-2 h-11 px-6 rounded-lg text-[13px]"
                >
                  Explore Markets <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              {/* Trust chips */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-500 mb-7">
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-400" /> TLS Secured</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-400" /> Email OTP</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-400" /> KYC Verified</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-400" /> Audit Trail</span>
              </div>

              {/* Stat chips — compact */}
              <div className="grid grid-cols-2 gap-px rounded-lg overflow-hidden border border-white/[0.06] bg-white/[0.02]">
                {heroStats.map((s) => (
                  <div key={s.label} className="px-3 py-3 bg-[#060f1e]/80">
                    <div className="text-[9px] uppercase tracking-widest text-slate-500 font-semibold">{s.label}</div>
                    <div
                      className={`mt-0.5 text-[14px] font-bold tabular-nums ${
                        s.accent === "up"   ? "text-emerald-400" :
                        s.accent === "down" ? "text-red-400" :
                        "text-white"
                      }`}
                    >
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── RIGHT: Stacked product panels ──────────────────────── */}
            <div className="relative space-y-4">
              {/* Ambient glow */}
              <div
                className="absolute -inset-10 rounded-3xl blur-3xl pointer-events-none"
                style={{ background: "radial-gradient(ellipse, rgba(14,165,233,0.14) 0%, transparent 65%)" }}
              />

              {/* 1. Watchlist strip */}
              <div className="relative">
                <WatchlistStrip assets={marketAssets} />
              </div>

              {/* 2. Market + Quick Trade: 2-column on xl, stacked on smaller */}
              <div className="relative grid grid-cols-1 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-4">
                <MarketPanel
                  assets={marketAssets}
                  title="Markets"
                  viewAllHref="/markets"
                  maxRows={6}
                />
                <QuickTrade assets={marketAssets} defaultSymbol="BTC" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
           TRADE TERMINAL
      ══════════════════════════════════════════════════════════════════ */}
      <section id="trade-terminal" className="py-14 px-4 sm:px-6 lg:px-8 relative overflow-hidden scroll-mt-24">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[820px] h-px pointer-events-none"
          style={{ background: "linear-gradient(90deg, transparent, rgba(148,163,184,0.18), transparent)" }} />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[820px] h-px pointer-events-none"
          style={{ background: "linear-gradient(90deg, transparent, rgba(148,163,184,0.12), transparent)" }} />

        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex items-end justify-between gap-6 flex-wrap">
            <div>
              <div className="vx-eyebrow mb-2">Trading Terminal</div>
              <h2 className="text-[26px] sm:text-[30px] font-bold text-white tracking-tight leading-[1.1] max-w-xl">
                A serious interface,{" "}
                <span className="gradient-text">built for serious traders.</span>
              </h2>
            </div>
            <p className="text-[13px] text-slate-400 max-w-md leading-relaxed">
              Real-time quotes, a clean order book, a professional chart surface, and a unified
              buy/sell panel — all wired to the same data feed you&apos;ll use inside the dashboard.
            </p>
          </div>

          <TradeTerminalPreview
            assets={marketAssets}
            btcPrice={btc?.price ?? 0}
            btcChange={btc?.change ?? 0}
            btcVolume={btc?.volume24h ?? 0}
            btcMcap={btc?.marketCap ?? 0}
            btcSpark={btc?.sparkline ?? []}
            ethPrice={eth?.price ?? 0}
            ethChange={eth?.change ?? 0}
          />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
           FEATURE GRID
      ══════════════════════════════════════════════════════════════════ */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
        style={{ background: "linear-gradient(180deg, oklch(0.07 0.02 240) 0%, oklch(0.075 0.022 238) 50%, oklch(0.07 0.02 240) 100%)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-10">
            <div className="vx-eyebrow mb-3">Platform Capabilities</div>
            <h2 className="text-[26px] sm:text-[32px] font-bold text-white tracking-tight leading-[1.1]">
              Everything you need,{" "}
              <span className="gradient-text">without the clutter.</span>
            </h2>
            <p className="text-[13px] text-slate-400 mt-3 leading-relaxed">
              A focused feature set designed around real trading workflows — not a marketing checklist.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {features.map((f) => (
              <div key={f.title} className="vx-panel vx-panel-hover p-5 group">
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: "rgba(14,165,233,0.10)",
                      border: "1px solid rgba(14,165,233,0.22)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
                    }}
                  >
                    <f.icon className="h-[18px] w-[18px] text-sky-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[14px] font-semibold text-white mb-1 group-hover:text-sky-100 transition-colors">
                      {f.title}
                    </h3>
                    <p className="text-[12.5px] text-slate-400 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
           HOW IT WORKS
      ══════════════════════════════════════════════════════════════════ */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
        style={{ background: "linear-gradient(180deg, #040f1f 0%, #030c1c 50%, #040f1f 100%)" }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px pointer-events-none"
          style={{ background: "linear-gradient(90deg, transparent, rgba(148,163,184,0.14), transparent)" }} />

        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between gap-6 flex-wrap mb-9">
            <div>
              <div className="vx-eyebrow mb-2">Onboarding</div>
              <h2 className="text-[26px] sm:text-[32px] font-bold text-white tracking-tight leading-[1.1]">
                Get started in minutes.
              </h2>
            </div>
            <p className="text-[13px] text-slate-400 max-w-md leading-relaxed">
              Four steps from first visit to your first order. No hidden friction, no marketing detours.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 relative">
            <div className="hidden lg:block absolute top-[54px] left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-sky-500/25 to-transparent pointer-events-none" />
            {steps.map((s) => (
              <div key={s.n} className="vx-panel vx-panel-hover p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-9 h-9 rounded-md flex items-center justify-center text-[12px] font-black gradient-text"
                    style={{
                      background: "rgba(14,165,233,0.08)",
                      border: "1px solid rgba(14,165,233,0.22)",
                    }}
                  >
                    {s.n}
                  </div>
                  <h3 className="text-[13.5px] font-semibold text-white leading-tight">{s.title}</h3>
                </div>
                <p className="text-[12px] text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
           TRUST & SECURITY
      ══════════════════════════════════════════════════════════════════ */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
        style={{ background: "linear-gradient(180deg, oklch(0.075 0.022 238) 0%, oklch(0.08 0.02 240) 50%, oklch(0.075 0.022 238) 100%)" }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-px pointer-events-none"
          style={{ background: "linear-gradient(90deg, transparent, rgba(148,163,184,0.14), transparent)" }} />

        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-12 items-start">
            <div>
              <div className="vx-eyebrow mb-2">Security First</div>
              <h2 className="text-[26px] sm:text-[32px] font-bold text-white tracking-tight leading-[1.1] mb-4">
                Premium account{" "}
                <span className="gradient-text">security by default.</span>
              </h2>
              <p className="text-[13px] text-slate-400 leading-relaxed mb-5 max-w-lg">
                We take security seriously. Your account, data, and digital assets are protected with
                clean, well-audited infrastructure and sensible defaults at every layer.
              </p>

              <ul className="space-y-2 max-w-md">
                {[
                  { icon: KeyRound,    text: "Email one-time passcode login flow"        },
                  { icon: Lock,        text: "Bcrypt-hashed password storage"            },
                  { icon: ShieldCheck, text: "Role-based admin access controls"          },
                  { icon: FileCheck2,  text: "Comprehensive audit trail on every action" },
                  { icon: Eye,         text: "Manual review for deposits & withdrawals"  },
                ].map((item) => (
                  <li key={item.text} className="flex items-center gap-3 text-[12.5px] text-slate-300">
                    <div className="w-7 h-7 rounded-md bg-sky-500/10 border border-sky-500/20 flex items-center justify-center flex-shrink-0">
                      <item.icon className="h-3.5 w-3.5 text-sky-400" />
                    </div>
                    {item.text}
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {trust.map((t) => (
                <div key={t.title} className="vx-panel vx-panel-hover p-5">
                  <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-3">
                    <t.icon className="h-4 w-4 text-sky-400" />
                  </div>
                  <h4 className="text-[13px] font-semibold text-white mb-1">{t.title}</h4>
                  <p className="text-[12px] text-slate-500 leading-relaxed">{t.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
           CTA
      ══════════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
        style={{ background: "linear-gradient(180deg, oklch(0.065 0.022 240) 0%, oklch(0.055 0.018 240) 50%, oklch(0.06 0.02 240) 100%)" }}>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="w-[900px] h-[500px] rounded-full blur-[140px]"
            style={{ background: "radial-gradient(ellipse, rgba(14,165,233,0.22) 0%, rgba(34,211,238,0.10) 35%, transparent 65%)" }}
          />
        </div>

        <div className="max-w-5xl mx-auto text-center relative">
          <div
            className="vx-panel p-10 sm:p-12 rounded-3xl"
            style={{
              background: "rgba(4, 12, 24, 0.92)",
              boxShadow:
                "0 0 0 1px rgba(14,165,233,0.08), 0 50px 120px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 60px rgba(14,165,233,0.025)",
            }}
          >
            <div className="vx-eyebrow mb-4 inline-flex">Ready to Trade?</div>
            <h2 className="text-[28px] sm:text-[36px] font-bold text-white mb-4 tracking-tight">
              Start your trading journey.
            </h2>
            <p className="text-[13px] sm:text-[14px] text-slate-400 mb-8 max-w-xl mx-auto leading-relaxed">
              Join thousands of verified traders on Vaultex Market. Open your account today and access
              clean execution, up-to-date market data, and dedicated support.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/register"
                className="vx-btn-primary inline-flex items-center justify-center gap-2 h-[52px] px-8 rounded-lg text-[14px]"
              >
                Create Free Account <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="vx-btn-ghost inline-flex items-center justify-center gap-2 h-[52px] px-7 rounded-lg text-[14px]"
              >
                Sign In
              </Link>
            </div>
            <p className="text-[11px] text-slate-600 mt-6">
              No setup fees · KYC-verified onboarding · Instant account activation
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   TRADE TERMINAL
   Exchange-style 3-column layout: chart | order book | order form.
   Recent trades sit below as a dense bottom row.
   ══════════════════════════════════════════════════════════════════════ */
function TradeTerminalPreview({
  assets, btcPrice, btcChange, btcVolume, btcMcap, btcSpark, ethPrice, ethChange,
}: {
  assets:    import("@/lib/coingecko").MarketAsset[];
  btcPrice:  number;
  btcChange: number;
  btcVolume: number;
  btcMcap:   number;
  btcSpark:  number[];
  ethPrice:  number;
  ethChange: number;
}) {
  const up  = btcChange >= 0;
  const mid = btcPrice;

  /* Order book around the live BTC price (visually consistent). */
  const bookBids = [
    { offset: -12.00, amt: 0.420 },
    { offset: -18.50, amt: 1.205 },
    { offset: -24.00, amt: 2.840 },
    { offset: -31.20, amt: 0.715 },
    { offset: -37.80, amt: 1.980 },
    { offset: -44.60, amt: 0.550 },
  ];
  const bookAsks = [
    { offset:  11.50, amt: 0.310 },
    { offset:  17.90, amt: 0.985 },
    { offset:  23.20, amt: 1.620 },
    { offset:  30.10, amt: 0.540 },
    { offset:  36.40, amt: 2.110 },
    { offset:  43.00, amt: 0.730 },
  ];

  const recentTrades = [
    { side: "buy",  price: mid + 0.80, amt: 0.0412, minutes: 0 },
    { side: "sell", price: mid - 1.10, amt: 0.1820, minutes: 0 },
    { side: "buy",  price: mid + 0.40, amt: 0.0075, minutes: 1 },
    { side: "buy",  price: mid + 1.20, amt: 0.2140, minutes: 1 },
    { side: "sell", price: mid - 0.50, amt: 0.0980, minutes: 2 },
    { side: "buy",  price: mid + 0.95, amt: 0.0330, minutes: 2 },
    { side: "sell", price: mid - 0.20, amt: 0.0450, minutes: 3 },
    { side: "buy",  price: mid + 0.30, amt: 0.1205, minutes: 3 },
  ];

  return (
    <div className="vx-panel relative">
      {/* ── Top bar — ticker + stats ──────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-white/[0.06] flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0"
            style={{ background: "#f7931a18", border: "1px solid #f7931a55", color: "#f7931a" }}
          >
            B
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-white leading-tight tracking-wide">BTC / USD</div>
            <div className="text-[10px] text-slate-500">Bitcoin · Spot</div>
          </div>
          <div className={`ml-2 tabular-nums text-[17px] sm:text-[19px] font-bold ${up ? "text-emerald-400" : "text-red-400"}`}>
            {formatCurrency(btcPrice)}
          </div>
          <span className={up ? "vx-chip vx-chip-up" : "vx-chip vx-chip-down"}>
            {up ? "▲" : "▼"} {formatPercent(btcChange)}
          </span>
        </div>

        <div className="hidden md:flex items-center gap-5 text-[11px] tabular-nums">
          <TermStat label="24h Volume"     value={`$${formatCompact(btcVolume)}`} />
          <TermStat label="24h Market Cap" value={`$${formatCompact(btcMcap)}`}   />
          <TermStat label="ETH / USD"      value={formatCurrency(ethPrice)} delta={ethChange} />
        </div>
      </div>

      {/* ── 3-column grid: chart | book | form ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,0.9fr)_minmax(0,1fr)]">

        {/* ══ LEFT: Chart + timeframes ══════════════════════════════════ */}
        <div className="border-b lg:border-b-0 lg:border-r border-white/[0.06]">
          {/* Timeframes */}
          <div className="flex items-center justify-between px-4 h-10 border-b border-white/[0.05]">
            <div className="vx-tabs">
              {["1H", "4H", "1D", "1W", "1M"].map((t, i) => (
                <span key={t} className="vx-tab" data-active={i === 2 ? "true" : "false"}>{t}</span>
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-widest">
              <LayoutGrid size={11} className="text-sky-400" /> Candlestick
            </div>
          </div>

          {/* Chart body */}
          <div className="relative h-[280px] sm:h-[320px] vx-grid-bg" style={{ background: "linear-gradient(180deg, rgba(3,10,22,0.45) 0%, rgba(2,8,18,0.9) 100%)" }}>
            <svg viewBox="0 0 500 300" preserveAspectRatio="none" className="w-full h-full">
              <defs>
                <linearGradient id="vx-trade-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#0ea5e9" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
                </linearGradient>
                <filter id="vx-chart-glow">
                  <feGaussianBlur stdDeviation="1" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {[
                [20, 230, 60, 9, true],  [45, 210, 40, 9, true], [70, 190, 35, 9, false],
                [95, 198, 30, 9, true],  [120, 168, 45, 9, true],[145, 150, 38, 9, false],
                [170, 158, 32, 9, true], [195, 128, 48, 9, true],[220, 138, 20, 9, false],
                [245, 110, 42, 9, true], [270, 98,  28, 9, true],[295, 108, 22, 9, false],
                [320, 82,  36, 9, true], [345, 70,  30, 9, true],[370, 78,  24, 9, false],
                [395, 50,  40, 9, true], [420, 38,  26, 9, true],[445, 42,  20, 9, false],
                [470, 26,  32, 9, true],
              ].map(([x, y, h, w, isUp], i) => {
                const ox = Number(x); const oy = Number(y); const oh = Number(h); const ow = Number(w);
                const green = Boolean(isUp);
                return (
                  <g key={i} filter="url(#vx-chart-glow)">
                    <line x1={ox} y1={oy - 8} x2={ox} y2={oy + oh + 8}
                      stroke={green ? "rgba(16,185,129,0.55)" : "rgba(239,68,68,0.55)"}
                      strokeWidth="1.4" />
                    <rect x={ox - ow / 2} y={oy} width={ow} height={oh}
                      fill={green ? "rgba(16,185,129,0.92)" : "rgba(239,68,68,0.92)"}
                      rx="1.5" />
                  </g>
                );
              })}
              <path
                d="M0,260 C60,240 100,220 150,190 C200,155 230,130 280,110 C330,90 360,70 400,55 C440,40 470,30 500,22"
                stroke="#38bdf8" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.55"
              />
              <path
                d="M0,260 C60,240 100,220 150,190 C200,155 230,130 280,110 C330,90 360,70 400,55 C440,40 470,30 500,22 L500,300 L0,300 Z"
                fill="url(#vx-trade-fill)"
              />
              <circle cx="500" cy="22" r="3" fill="#38bdf8" />
              <circle cx="500" cy="22" r="7" fill="#38bdf8" fillOpacity="0.2" />
            </svg>

            {/* Bottom-left: 7d spark pill */}
            <div className="absolute bottom-3 left-3 flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-[#020b18]/85 border border-white/[0.08]">
              <span className="text-[9px] uppercase tracking-widest text-slate-500 font-semibold">Last 7d</span>
              <Sparkline data={btcSpark} width={78} height={22} idSuffix="terminal-btc" />
            </div>

            {/* Top-right: y-axis tick labels */}
            <div className="absolute top-2 right-2 flex flex-col gap-1 text-[9px] tabular-nums text-slate-600 font-semibold">
              <span>{formatCurrency(btcPrice * 1.015)}</span>
              <span>{formatCurrency(btcPrice * 1.008)}</span>
              <span>{formatCurrency(btcPrice)}</span>
            </div>
          </div>
        </div>

        {/* ══ CENTER: Order book ═══════════════════════════════════════ */}
        <div className="border-b lg:border-b-0 lg:border-r border-white/[0.06]">
          <div className="px-3.5 h-10 flex items-center justify-between border-b border-white/[0.05]">
            <div className="vx-panel-title">
              <LayoutGrid size={12} className="text-sky-400" />
              Order Book
            </div>
            <div className="text-[10px] text-slate-600 uppercase tracking-widest">Spread ~ $23</div>
          </div>

          <div className="px-3.5 pt-2.5 pb-1 grid grid-cols-3 gap-2 text-[9px] uppercase tracking-widest text-slate-500 font-semibold">
            <div>Price</div>
            <div className="text-right">Amount</div>
            <div className="text-right">Total</div>
          </div>

          {/* Asks (descending toward mid) */}
          <div className="px-3.5">
            {bookAsks.slice().reverse().map((r, i) => (
              <OrderBookRow key={`ask-${i}`} price={mid + r.offset} amount={r.amt} side="ask" />
            ))}
          </div>

          {/* Mid-price strip */}
          <div className="mx-3.5 my-2 px-3 py-1.5 rounded-md border border-white/[0.06] bg-white/[0.02] flex items-center justify-between">
            <span className={`text-[12px] font-bold tabular-nums ${up ? "text-emerald-400" : "text-red-400"}`}>
              {formatCurrency(mid)}
            </span>
            <span className="text-[9px] uppercase tracking-widest text-slate-500 font-semibold">Last</span>
          </div>

          <div className="px-3.5 pb-4">
            {bookBids.map((r, i) => (
              <OrderBookRow key={`bid-${i}`} price={mid + r.offset} amount={r.amt} side="bid" />
            ))}
          </div>
        </div>

        {/* ══ RIGHT: Embedded order form ═══════════════════════════════ */}
        <div>
          <QuickTrade assets={assets} defaultSymbol="BTC" embedded />
        </div>
      </div>

      {/* ── BELOW: Recent trades ──────────────────────────────────────── */}
      <div className="border-t border-white/[0.06]">
        <div className="px-4 h-10 flex items-center justify-between border-b border-white/[0.05]">
          <div className="vx-panel-title">
            <Activity size={12} className="text-sky-400" />
            Recent Trades
          </div>
          <div className="text-[10px] text-slate-600 uppercase tracking-widest">BTC / USD</div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-x-4 gap-y-1 px-4 py-3 text-[11px] tabular-nums">
          {recentTrades.map((t, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <span className={t.side === "buy" ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>
                {formatCurrency(t.price)}
              </span>
              <span className="text-slate-400">{t.amt.toFixed(4)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Small subcomponents ─────────────────────────────────────────────── */
function TermStat({ label, value, delta }: { label: string; value: string; delta?: number }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[9.5px] uppercase tracking-widest text-slate-500 font-semibold">{label}</span>
      <span className="text-[12px] font-semibold text-slate-200">
        {value}
        {delta !== undefined && (
          <span className={`ml-1.5 text-[10px] font-bold ${delta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(2)}%
          </span>
        )}
      </span>
    </div>
  );
}

function OrderBookRow({
  price,
  amount,
  side,
}: {
  price:  number;
  amount: number;
  side:   "ask" | "bid";
}) {
  const pctWidth = Math.min(100, (amount / 3) * 100);
  const total    = price * amount;
  return (
    <div className="relative grid grid-cols-3 gap-2 py-[3px] text-[11px] tabular-nums">
      <div
        className="absolute inset-y-0 right-0 rounded-sm"
        style={{
          width: `${pctWidth}%`,
          background: side === "ask" ? "rgba(239,68,68,0.10)" : "rgba(16,185,129,0.10)",
        }}
        aria-hidden="true"
      />
      <span className={`relative ${side === "ask" ? "text-red-400" : "text-emerald-400"} font-semibold`}>
        {formatCurrency(price)}
      </span>
      <span className="relative text-right text-slate-400">{amount.toFixed(3)}</span>
      <span className="relative text-right text-slate-600">{formatCompact(total)}</span>
    </div>
  );
}
