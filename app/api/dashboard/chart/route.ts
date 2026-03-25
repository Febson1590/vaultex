import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildBalanceChart, rangeToDays } from "@/lib/chart";

/**
 * GET /api/dashboard/chart?range=7d|30d|90d|1y
 *
 * Returns real USD balance history built from transactions + activity logs
 * using backward reconstruction from the current wallet balance.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const range = req.nextUrl.searchParams.get("range") ?? "30d";
  const days  = rangeToDays(range);

  const data = await buildBalanceChart(session.user.id, days);

  return NextResponse.json({ data, range });
}
