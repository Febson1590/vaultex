import { ImageResponse } from "next/og";

/**
 * iOS / Android home-screen icon — 180x180 PNG.
 *
 * Next.js auto-wires this file as `<link rel="apple-touch-icon">` via
 * the App Router's icon file convention. Rendered with ImageResponse
 * (Satori) at request time; a deep-navy rounded square hosts the
 * Vaultex hexagon mark with the cyan trending arrow.
 */

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f1b36 0%, #050b1e 100%)",
          borderRadius: 40,
        }}
      >
        <svg
          width="148"
          height="148"
          viewBox="0 0 64 64"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="hex-outer" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#eef2f8" />
              <stop offset="45%" stopColor="#b7c2d4" />
              <stop offset="100%" stopColor="#6b7896" />
            </linearGradient>
            <linearGradient id="hex-inner" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0c1b3a" />
              <stop offset="100%" stopColor="#050b1e" />
            </linearGradient>
            <linearGradient id="bar" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#7dd3fc" />
              <stop offset="60%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
            <linearGradient id="arrow" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="60%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#e0f2fe" />
            </linearGradient>
          </defs>
          <path d="M32 5 L54 17 V47 L32 59 L10 47 V17 Z" fill="url(#hex-outer)" />
          <path d="M32 10 L50 20.25 V43.75 L32 54 L14 43.75 V20.25 Z" fill="url(#hex-inner)" />
          <rect x="19"   y="39" width="5" height="9"  rx="1" fill="url(#bar)" />
          <rect x="26.5" y="31" width="5" height="17" rx="1" fill="url(#bar)" />
          <rect x="34"   y="23" width="5" height="25" rx="1" fill="url(#bar)" />
          <path
            d="M14 44 Q30 46 42 34 Q50 26 57 15"
            stroke="url(#arrow)"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M50 13 L57 15 L55.5 22"
            stroke="url(#arrow)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
