import { Logo } from "@/components/logo";

/* ─ Typed data for SVG layers ──────────────────────────────────────────── */
type Candle = [number, number, number, number, boolean]; // [x, y, bodyH, bodyW, isUp]
type Dot    = [number, number, number];                  // [cx, cy, r]
type Line2  = [number, number, number, number];          // [x1,y1, x2,y2]

const CANDLES: Candle[] = [
  [60,  210, 52, 17, true],  [118, 188, 48, 17, true],  [176, 172, 52, 17, false],
  [234, 182, 50, 17, true],  [292, 158, 52, 17, true],  [350, 136, 48, 17, true],
  [408, 148, 50, 17, false], [466, 126, 48, 17, true],  [524, 108, 46, 17, true],
  [582,  92, 44, 17, true],  [640,  76, 44, 17, false], [698,  62, 42, 17, true],
];

const DOTS: Dot[] = [
  [90,140,1.5],[185,285,1.2],[325,88,1.5],[430,395,1.2],[560,195,1.5],
  [685,335,1.2],[805,142,1.5],[930,272,1.2],[1038,396,1.5],[1162,193,1.2],
  [1265,315,1.5],[1372,143,1.2],[142,495,1.5],[295,592,1.2],[484,695,1.5],
  [635,545,1.2],[784,672,1.5],[884,494,1.2],[1085,615,1.5],[1235,544,1.2],
  [1346,694,1.5],[75,745,1.2],[394,792,1.5],[694,743,1.2],[994,793,1.5],
  [1194,743,1.2],[1392,773,1.5],[245,443,1.2],[595,472,1.5],[1044,198,1.2],
];

const DOT_LINKS: Line2[] = [
  [90,140,185,285],[185,285,325,88],[560,195,685,335],[685,335,805,142],
  [930,272,1038,396],[1038,396,1162,193],[142,495,295,592],[295,592,484,695],
  [635,545,784,672],[784,672,884,494],
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: "linear-gradient(160deg,#0c1a2e 0%,#071018 45%,#030c18 75%,#01060f 100%)" }}
    >

      {/* ── 1. World map: grid + continent silhouettes ───────────────── */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 1 }}
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <g opacity="0.055" stroke="#7dd3fc" strokeWidth="0.65" fill="none">
          {/* Meridians */}
          {([180,360,540,720,900,1080,1260] as number[]).map(x => (
            <line key={`m${x}`} x1={x} y1={0} x2={x} y2={900} />
          ))}
          {/* Parallels */}
          {([150,300,450,600,750] as number[]).map(y => (
            <line key={`p${y}`} x1={0} y1={y} x2={1440} y2={y} />
          ))}
          {/* North America */}
          <path d="M140,80 L240,60 L295,92 L312,154 L302,232 L280,312 L250,372 L210,402 L174,362 L158,290 L138,210 L120,152 Z" />
          {/* South America */}
          <path d="M222,432 L292,416 L322,478 L316,562 L290,642 L254,682 L224,662 L204,602 L200,522 L210,456 Z" />
          {/* Europe */}
          <path d="M632,80 L724,70 L762,102 L782,142 L762,182 L730,202 L700,197 L670,177 L646,142 L634,112 Z" />
          {/* Africa */}
          <path d="M642,202 L782,192 L832,252 L852,362 L842,472 L812,562 L762,602 L702,612 L652,572 L622,472 L620,352 L630,252 Z" />
          {/* Asia */}
          <path d="M782,52 L1102,42 L1202,112 L1222,202 L1182,282 L1102,322 L1002,332 L902,302 L832,242 L792,162 Z" />
          {/* Australia */}
          <path d="M1082,482 L1202,458 L1252,512 L1236,592 L1176,622 L1102,602 L1066,547 Z" />
        </g>
      </svg>

      {/* ── 2. Candlestick chart — right-side background ─────────────── */}
      <svg
        className="absolute right-0 top-0 pointer-events-none"
        style={{ zIndex: 2, width: "52%", height: "100%", opacity: 0.12 }}
        viewBox="0 0 760 900"
        preserveAspectRatio="xMaxYMid meet"
        aria-hidden="true"
      >
        {/* Horizontal grid */}
        {([100,200,300,400,500,600,700,800] as number[]).map(y => (
          <line key={y} x1={0} y1={y} x2={760} y2={y} stroke="#38bdf8" strokeWidth="0.5" opacity="0.35" />
        ))}
        {/* Candles */}
        {CANDLES.map(([x, y, h, w, up], i) => (
          <g key={i}>
            <line
              x1={x} y1={y - 13}
              x2={x} y2={y + h + 13}
              stroke={up ? "#10b981" : "#ef4444"}
              strokeWidth="1"
            />
            <rect
              x={x - w / 2} y={y}
              width={w} height={h}
              fill={up ? "rgba(16,185,129,0.6)" : "rgba(239,68,68,0.6)"}
            />
          </g>
        ))}
        {/* Trend line */}
        <path
          d="M 0,870 C 120,800 240,720 360,620 C 460,532 560,440 640,360 C 690,310 730,270 760,240"
          stroke="#38bdf8" strokeWidth="1.5" fill="none" opacity="0.55"
        />
      </svg>

      {/* ── 3. Curved trading lines ──────────────────────────────────── */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 3 }}
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <g opacity="0.065" stroke="#38bdf8" fill="none">
          <path d="M -60,575 C 210,475 420,680 660,502 C 862,352 1062,582 1292,402 C 1362,352 1422,330 1500,308" strokeWidth="1" />
          <path d="M -60,378 C 252,278 504,480 724,330 C 924,192 1152,445 1500,218" strokeWidth="0.8" />
          <path d="M -60,728 C 202,658 454,782 724,632 C 952,512 1202,682 1500,582" strokeWidth="0.7" />
        </g>
      </svg>

      {/* ── 4. Particle / dot network ────────────────────────────────── */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 4 }}
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <g opacity="0.2" fill="#7dd3fc">
          {DOTS.map(([cx, cy, r], i) => (
            <circle key={i} cx={cx} cy={cy} r={r} />
          ))}
        </g>
        <g opacity="0.055" stroke="#7dd3fc" strokeWidth="0.55">
          {DOT_LINKS.map(([x1, y1, x2, y2], i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
          ))}
        </g>
      </svg>

      {/* ── 5. Vignette overlay ──────────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 5,
          background: "radial-gradient(ellipse 140% 120% at 50% 50%, transparent 18%, rgba(1,5,13,0.42) 62%, rgba(1,4,10,0.78) 100%)",
        }}
        aria-hidden="true"
      />

      {/* ── Content ──────────────────────────────────────────────────── */}
      <div className="relative z-10 p-6">
        <Logo size="md" href="/" />
      </div>
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </div>
      <div className="relative z-10 p-6 text-center">
        <p className="text-xs text-slate-600">
          © {new Date().getFullYear()} Vaultex Market · All rights reserved · AES-256 Encrypted · KYC/AML Compliant
        </p>
      </div>

    </div>
  );
}
