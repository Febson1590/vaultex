import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
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
    default: "Vaultex Market | Trade Digital Assets with Institutional Confidence",
    template: "%s | Vaultex Market",
  },
  description:
    "Vaultex Market — institutional-grade crypto brokerage platform. Trade BTC, ETH, USDT and 50+ digital assets with real-time execution, advanced charting, and enterprise security.",
  keywords: ["crypto", "trading", "bitcoin", "ethereum", "broker", "digital assets", "portfolio", "brokerage", "institutional"],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  openGraph: {
    title: "Vaultex Market | Premium Crypto Broker Platform",
    description: "Trade Digital Assets with Institutional Confidence",
    siteName: "Vaultex Market",
    type: "website",
  },
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
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "oklch(0.10 0.02 240)",
              border: "1px solid oklch(0.20 0.03 240)",
              color: "oklch(0.95 0.01 220)",
            },
          }}
        />
      </body>
    </html>
  );
}
