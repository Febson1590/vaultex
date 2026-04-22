import type { MetadataRoute } from "next";

/**
 * PWA Web App Manifest. Next's file convention serves this at
 * `/manifest.webmanifest` and Next auto-injects
 * `<link rel="manifest">` into every page's <head>.
 *
 * Icons point at the pre-baked PNGs under /public — stable URLs, not
 * hashed — so Android install flows, iOS "Add to Home Screen" and
 * desktop PWA installers all pick up real Vaultex branding.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             "Vaultex Market",
    short_name:       "Vaultex",
    description:
      "Premium crypto brokerage. Trade BTC, ETH, USDT and 50+ digital assets with clean execution, professional charts, and strong account security.",
    start_url:        "/",
    scope:            "/",
    display:          "standalone",
    orientation:      "portrait-primary",
    background_color: "#040f1f",
    theme_color:      "#0ea5e9",
    categories:       ["finance", "business", "productivity"],
    icons: [
      { src: "/icon-192.png",      sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png",      sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
