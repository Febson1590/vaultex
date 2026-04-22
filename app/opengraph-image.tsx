import { ImageResponse } from "next/og";

/**
 * Root-level Open Graph preview image — 1200x630 PNG.
 *
 * Used by link-unfurlers (Facebook, LinkedIn, iMessage, Slack, etc.)
 * when the site is shared. A duplicate `app/twitter-image.tsx`
 * re-exports this so X/Twitter cards share the same visual.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Vaultex Market — premium crypto brokerage";

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px 96px",
          background:
            "radial-gradient(ellipse at top left, rgba(14,165,233,0.18), transparent 55%), linear-gradient(135deg, #0a1226 0%, #040a1c 100%)",
          color: "white",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        {/* Brand row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            marginBottom: 60,
          }}
        >
          <svg width="112" height="112" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="og-hex-outer" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#eef2f8" />
                <stop offset="45%" stopColor="#b7c2d4" />
                <stop offset="100%" stopColor="#6b7896" />
              </linearGradient>
              <linearGradient id="og-hex-inner" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0c1b3a" />
                <stop offset="100%" stopColor="#050b1e" />
              </linearGradient>
              <linearGradient id="og-bar" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#7dd3fc" />
                <stop offset="60%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
              <linearGradient id="og-arrow" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="60%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#e0f2fe" />
              </linearGradient>
            </defs>
            <path d="M32 5 L54 17 V47 L32 59 L10 47 V17 Z" fill="url(#og-hex-outer)" />
            <path d="M32 10 L50 20.25 V43.75 L32 54 L14 43.75 V20.25 Z" fill="url(#og-hex-inner)" />
            <rect x="19"   y="39" width="5" height="9"  rx="1" fill="url(#og-bar)" />
            <rect x="26.5" y="31" width="5" height="17" rx="1" fill="url(#og-bar)" />
            <rect x="34"   y="23" width="5" height="25" rx="1" fill="url(#og-bar)" />
            <path d="M14 44 Q30 46 42 34 Q50 26 57 15" stroke="url(#og-arrow)" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M50 13 L57 15 L55.5 22"          stroke="url(#og-arrow)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
            <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: 8 }}>VAULTEX</div>
            <div style={{ fontSize: 24, fontWeight: 500, letterSpacing: 12, color: "#38bdf8", marginTop: 10 }}>
              MARKET
            </div>
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            lineHeight: 1.08,
            maxWidth: 1000,
          }}
        >
          <div style={{ fontSize: 68, fontWeight: 700, letterSpacing: "-0.01em" }}>
            Trade global markets
          </div>
          <div
            style={{
              fontSize: 68,
              fontWeight: 700,
              background: "linear-gradient(90deg, #38bdf8, #e0f2fe)",
              backgroundClip: "text",
              color: "transparent",
              letterSpacing: "-0.01em",
            }}
          >
            with confidence.
          </div>
        </div>

        {/* Footer strip */}
        <div
          style={{
            position: "absolute",
            left: 96,
            bottom: 56,
            display: "flex",
            alignItems: "center",
            gap: 20,
            fontSize: 20,
            color: "#94a3b8",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          <span>Premium crypto brokerage</span>
          <span style={{ color: "#475569" }}>·</span>
          <span>vaultexmarket.com</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
