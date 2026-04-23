/**
 * Verify that a copy trader saved with a 1-minute (60 s) interval
 * reloads correctly — no silent revert to an empty/placeholder value.
 * Mirrors what the admin form does client-side.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { resolvePlanSecs, secondsToDisplay } from "../lib/duration";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const name = `verify-trader-${Date.now()}`;
  console.log(`\n[verify] trader name: ${name}\n`);

  // 1. Admin form saves a trader with min 1 min, max 2 min.
  const saved = await prisma.copyTrader.create({
    data: {
      name,
      winRate:        70,
      totalROI:       30,
      performance30d: 8,
      riskLevel:      "MEDIUM",
      followers:      500,
      minCopyAmount:  100,
      maxCopyAmount:  null,
      minProfit:      0.5,
      maxProfit:      1.2,
      profitInterval: 60,   // 1 min
      maxInterval:    120,  // 2 min
      minDurationHours: null,
      maxDurationHours: null,
      minLossRatio: 8,
      maxLossRatio: 12,
      minLoss:      0.1,
      maxLoss:      0.3,
      isActive:     true,
      isSeeded:     false,
    },
  });
  console.log(`[1] saved trader id=${saved.id}`);
  console.log(`    profitInterval=${saved.profitInterval}s, maxInterval=${saved.maxInterval}s`);

  // 2. Reload — same query the admin page uses.
  const reloaded = await prisma.copyTrader.findUnique({ where: { id: saved.id } });
  if (!reloaded) { console.error("row missing after reload"); process.exit(1); }
  console.log(`[2] reloaded: profitInterval=${reloaded.profitInterval}s, maxInterval=${reloaded.maxInterval}s`);

  // 3. Resolve via the shared helper the form uses on prefill.
  const resolved = resolvePlanSecs(reloaded);
  const minD = secondsToDisplay(resolved.minSecs);
  const maxD = secondsToDisplay(resolved.maxSecs);
  console.log(`[3] resolver output:`);
  console.log(`    min: ${minD.value} ${minD.unit}  (expected: 1 minutes)`);
  console.log(`    max: ${maxD.value} ${maxD.unit}  (expected: 2 minutes)`);

  const minOk = resolved.minSecs === 60 && minD.value === 1 && minD.unit === "minutes";
  const maxOk = resolved.maxSecs === 120 && maxD.value === 2 && maxD.unit === "minutes";

  // Cleanup.
  await prisma.copyTrader.delete({ where: { id: saved.id } });
  console.log(`[4] cleanup complete\n`);

  console.log(`=== VERDICT ===`);
  console.log(`min side (1 minute) survives round-trip: ${minOk ? "PASS" : "FAIL"}`);
  console.log(`max side (2 minutes) survives round-trip: ${maxOk ? "PASS" : "FAIL"}`);
  if (!minOk || !maxOk) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
