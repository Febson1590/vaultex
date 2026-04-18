import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCryptoRates } from "@/lib/rates";

/**
 * Public rates endpoint — used by the deposit/withdraw forms to keep the
 * dual USD↔crypto amount inputs in sync. Authenticated-only to match the
 * rest of the dashboard API surface.
 *
 * Returns `{ BTC: 84231.5, ETH: 3921.8, USDT: 1, BNB: 621.4, SOL: 182.6 }`.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rates = await getCryptoRates();
  return NextResponse.json(rates, {
    headers: {
      // Underlying data is already cached for 60 s by CoinGecko fetch
      "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
    },
  });
}
