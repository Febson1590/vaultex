import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

// Admin deposit list — joins each DepositRequest to the DepositWallet the
// user was shown (by walletId) so the review table can display coin,
// network, and destination address. walletId is a plain string column
// (no FK), so we look wallets up in a second query and merge in memory.
export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deposits = await db.depositRequest.findMany({
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  const walletIds = Array.from(
    new Set(deposits.map((d) => d.walletId).filter((x): x is string => !!x)),
  );
  const walletsById: Record<string, { asset: string; network: string | null; address: string; label: string }> = {};
  if (walletIds.length > 0) {
    const wallets = await db.depositWallet.findMany({
      where:  { id: { in: walletIds } },
      select: { id: true, asset: true, network: true, address: true, label: true },
    });
    for (const w of wallets) {
      walletsById[w.id] = { asset: w.asset, network: w.network, address: w.address, label: w.label };
    }
  }

  const enriched = deposits.map((d) => ({
    ...d,
    wallet: d.walletId ? (walletsById[d.walletId] ?? null) : null,
  }));

  return NextResponse.json(enriched);
}
