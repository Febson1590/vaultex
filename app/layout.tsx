import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { GoogleTranslateHost } from "@/components/language-switcher";
import { TawkChat } from "@/components/tawk-chat";
import { CookieConsent } from "@/components/cookie-consent";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Vaultex Market — Premium Crypto Brokerage",
    template: "%s | Vaultex Market",
  },
  description:
    "Vaultex Market — a premium crypto brokerage platform. Trade BTC, ETH, USDT and 50+ digital assets with clean execution, professional charts, and strong account security.",
  keywords: ["crypto", "trading", "bitcoin", "ethereum", "broker", "digital assets", "portfolio", "brokerage"],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  applicationName: "Vaultex Market",
  authors: [{ name: "Vaultex Market" }],
  creator: "Vaultex Market",
  publisher: "Vaultex Market",

  /* Browser tab / home-screen icons.
     Next also auto-discovers `app/icon.svg`, `app/apple-icon.tsx` and
     `app/favicon.ico` via file conventions, but we set them explicitly
     here so the <head> gets belt-and-braces references (some legacy
     bookmarks and RSS readers look for shortcut/icon in addition to
     icon). All roads lead to a Vaultex asset — no Vercel defaults. */
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg",    type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },

  openGraph: {
    title: "Vaultex Market | Premium Crypto Broker Platform",
    description: "One terminal. Every major market.",
    siteName: "Vaultex Market",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vaultex Market — Premium Crypto Brokerage",
    description: "Trade global markets with confidence.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0ea5e9",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <GoogleTranslateHost />
        <TawkChat />
        <CookieConsent />
        <Toaster
          position="top-center"
          theme="dark"
          richColors
          expand={false}
          closeButton
          duration={5000}
          offset={16}
          visibleToasts={3}
        />
      </body>
    </html>
  );
}
