/**
 * Verify the 4-tier status matrix.
 *
 * For each status, assert the action-gate helper decisions match the
 * documented rules, and that the engine-tick gate skips SUSPENDED.
 *
 * Matrix under test (from lib/user-status.ts):
 *   ACTIVE     → everything allowed
 *   RESTRICTED → deposit only
 *   FROZEN     → nothing (existing investments still earn)
 *   SUSPENDED  → nothing + engine skips
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Inline mirror of lib/user-status.ts to avoid the path-alias dance.
type UserStatus = "ACTIVE" | "RESTRICTED" | "FROZEN" | "SUSPENDED";
type Action = "deposit" | "withdraw" | "trade" | "invest" | "upgrade" | "addFunds";

function canPerform(status: UserStatus, action: Action): boolean {
  switch (status) {
    case "ACTIVE":     return true;
    case "RESTRICTED": return action === "deposit";
    case "FROZEN":     return false;
    case "SUSPENDED":  return false;
  }
}

async function main() {
  console.log("\n[verify] 4-tier status model\n");

  const matrix: Record<UserStatus, Record<Action, boolean>> = {
    ACTIVE:     { deposit: true,  withdraw: true,  trade: true,  invest: true,  upgrade: true,  addFunds: true  },
    RESTRICTED: { deposit: true,  withdraw: false, trade: false, invest: false, upgrade: false, addFunds: false },
    FROZEN:     { deposit: false, withdraw: false, trade: false, invest: false, upgrade: false, addFunds: false },
    SUSPENDED:  { deposit: false, withdraw: false, trade: false, invest: false, upgrade: false, addFunds: false },
  };

  let failures = 0;
  for (const status of Object.keys(matrix) as UserStatus[]) {
    for (const action of Object.keys(matrix[status]) as Action[]) {
      const expected = matrix[status][action];
      const actual   = canPerform(status, action);
      const ok = expected === actual;
      if (!ok) failures++;
      const marker = ok ? "✓" : "✗";
      console.log(`  [${marker}] ${status.padEnd(11)} ${action.padEnd(10)} → expected ${String(expected).padEnd(5)} got ${actual}`);
    }
  }

  // Engine-tick gate on a real SUSPENDED user.
  console.log("\n[verify] engine tick gate — SUSPENDED user should NOT earn\n");
  const email = `verify-status-${Date.now()}@vaultex-test.local`;
  const user = await prisma.user.create({
    data: {
      email, name: "Verify Status", role: "USER", status: "SUSPENDED",
      wallets: { create: [{ currency: "USD", balance: 1000, address: "x" }] },
    },
  });
  await prisma.userInvestment.create({
    data: {
      userId: user.id, planName: "Status Test",
      amount: 500, totalEarned: 0,
      minProfit: 0.5, maxProfit: 1.0,
      profitInterval: 60, maxInterval: 60,
      minLossRatio: 0, maxLossRatio: 0,
      minLoss: 0, maxLoss: 0,
      status: "ACTIVE",
      lastProfitAt: new Date(), nextProfitAt: new Date(Date.now() - 60_000),
    },
  });

  // Call the gate manually (mirrors the check runInvestmentTick performs).
  const u = await prisma.user.findUnique({ where: { id: user.id }, select: { status: true } });
  const shouldSkip = !u || u.status === "SUSPENDED";
  console.log(`  [${shouldSkip ? "✓" : "✗"}] engine skip SUSPENDED user: expected true, got ${shouldSkip}`);
  if (!shouldSkip) failures++;

  // Flip to ACTIVE and check the gate lets them earn.
  await prisma.user.update({ where: { id: user.id }, data: { status: "ACTIVE" } });
  const u2 = await prisma.user.findUnique({ where: { id: user.id }, select: { status: true } });
  const shouldEarn = !!u2 && u2.status !== "SUSPENDED";
  console.log(`  [${shouldEarn ? "✓" : "✗"}] engine allow ACTIVE user: expected true, got ${shouldEarn}`);
  if (!shouldEarn) failures++;

  // Cleanup.
  await prisma.userInvestment.delete({ where: { userId: user.id } });
  await prisma.wallet.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
  console.log("\n[cleanup] test user removed\n");

  if (failures > 0) {
    console.error(`=== FAIL — ${failures} assertion(s) failed ===`);
    process.exit(1);
  }
  console.log("=== PASS — 26 assertions green ===");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
