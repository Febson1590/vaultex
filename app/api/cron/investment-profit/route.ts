import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  catchUpUserInvestment, catchUpCopyTrade,
} from "@/lib/engine/investment-tick";

/**
 * Server-side cron endpoint — the thing that actually makes profits
 * pay out while the user is offline. Runs every minute via
 * vercel.json. Iterates every ACTIVE investment + copy-trade that has
 * a due `nextProfitAt`, catches up each one.
 *
 * Security
 * --------
 * Gated by `CRON_SECRET` env var. Requests must present it as either:
 *   Authorization: Bearer <secret>     ← Vercel Cron sends this
 *   ?secret=<secret>                   ← handy for manual test runs
 *
 * Set CRON_SECRET in Vercel project env (Production + Preview). If the
 * variable isn't set at all, the endpoint 503s so we never accidentally
 * expose an unauthenticated tick driver.
 *
 * Per-row safety cap
 * ------------------
 * Each row runs at most 10 ticks per cron invocation to keep the run
 * inside the Vercel function time budget (well under 60s). If a row
 * has more missed ticks than that, subsequent cron runs finish the
 * catch-up naturally.
 */
export const dynamic = "force-dynamic";

const MAX_PER_ROW = 10;

function authorise(req: NextRequest): { ok: true } | { ok: false; reason: string; status: number } {
  const expected = process.env.CRON_SECRET;
  if (!expected) return { ok: false, reason: "CRON_SECRET not set", status: 503 };

  const hdr = req.headers.get("authorization") ?? "";
  const qry = req.nextUrl.searchParams.get("secret") ?? "";

  const bearerOk = hdr.toLowerCase().startsWith("bearer ") && hdr.slice(7).trim() === expected;
  const queryOk  = qry === expected;

  if (!bearerOk && !queryOk) {
    return { ok: false, reason: "Forbidden", status: 403 };
  }
  return { ok: true };
}

async function run(now: Date) {
  const counts = {
    investmentsChecked: 0,
    investmentsCredited: 0,
    investmentTicks: 0,
    copyTradesChecked: 0,
    copyTradesCredited: 0,
    copyTradeTicks: 0,
  };

  // Process every ACTIVE investment with a due tick.
  const dueInvestments = await db.userInvestment.findMany({
    where: {
      status:       "ACTIVE",
      nextProfitAt: { lte: now, not: null },
    },
    select: { userId: true },
  });
  counts.investmentsChecked = dueInvestments.length;
  for (const row of dueInvestments) {
    const deltas = await catchUpUserInvestment(row.userId, now, MAX_PER_ROW);
    if (deltas.length > 0) {
      counts.investmentsCredited += 1;
      counts.investmentTicks     += deltas.length;
    }
  }

  // Process every ACTIVE copy trade with a due tick.
  const dueTrades = await db.userCopyTrade.findMany({
    where: {
      status:       "ACTIVE",
      nextProfitAt: { lte: now, not: null },
    },
    select: { id: true },
  });
  counts.copyTradesChecked = dueTrades.length;
  for (const t of dueTrades) {
    const deltas = await catchUpCopyTrade(t.id, now, MAX_PER_ROW);
    if (deltas.length > 0) {
      counts.copyTradesCredited += 1;
      counts.copyTradeTicks     += deltas.length;
    }
  }

  return counts;
}

export async function GET(req: NextRequest) {
  const auth = authorise(req);
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: auth.status });

  const now = new Date();
  const counts = await run(now);
  return NextResponse.json({ ok: true, at: now.toISOString(), ...counts });
}

export async function POST(req: NextRequest) {
  // Accept POST too for cron providers that default to POST.
  return GET(req);
}
