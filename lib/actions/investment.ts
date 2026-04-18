"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireApprovedKyc } from "@/lib/kyc";
import { sendNotificationEmail, APP_URL } from "@/lib/notifications";

// ─── User: get available investment plans ────────────────────────────────────

export async function getAvailablePlans() {
  const session = await auth();
  if (!session?.user?.id) return [];
  return db.investmentPlan.findMany({
    where: { isActive: true },
    orderBy: { minAmount: "asc" },
  });
}

// ─── User: get available copy traders ───────────────────────────────────

export async function getAvailableTraders() {
  const session = await auth();
  if (!session?.user?.id) return [];
  return db.copyTrader.findMany({
    where: { isActive: true },
    orderBy: { performance30d: "desc" },
  });
}

export async function getCopyTraderById(id: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  return db.copyTrader.findUnique({ where: { id } });
}

// ─── User: start an investment plan ─────────────────────────────────────

export async function userStartInvestment(data: {
  planId: string;
  amount: number;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const userId = session.user.id;

  const kycError = await requireApprovedKyc(userId);
  if (kycError) return kycError;

  const plan = await db.investmentPlan.findUnique({ where: { id: data.planId } });
  if (!plan || !plan.isActive) return { error: "Plan not found or inactive" };
  if (data.amount < Number(plan.minAmount)) {
    return { error: `Minimum investment is $${Number(plan.minAmount).toLocaleString()}` };
  }
  if (plan.maxAmount !== null && data.amount > Number(plan.maxAmount)) {
    return { error: `Maximum investment for this plan is $${Number(plan.maxAmount).toLocaleString()}` };
  }

  const existing = await db.userInvestment.findUnique({ where: { userId } });
  if (existing && existing.status === "ACTIVE") {
    return { error: "You already have an active investment plan" };
  }

  const usdWallet = await db.wallet.findFirst({ where: { userId, currency: "USD" } });
  if (!usdWallet || Number(usdWallet.balance) < data.amount) {
    return { error: "Insufficient USD balance" };
  }

  const now = new Date();
  const intervalSecs = Number(plan.profitInterval);
  const nextProfitAt = new Date(now.getTime() + intervalSecs * 1000);

  const invData = {
    planId: plan.id,
    planName: plan.name,
    amount: data.amount,
    totalEarned: 0,
    minProfit: plan.minProfit,
    maxProfit: plan.maxProfit,
    profitInterval: plan.profitInterval,
    maxInterval: plan.maxInterval,
    status: "ACTIVE" as const,
    lastProfitAt: now,
    nextProfitAt,
  };

  await db.$transaction([
    db.wallet.update({ where: { id: usdWallet.id }, data: { balance: { decrement: data.amount } } }),
    ...(existing
      ? [db.userInvestment.update({ where: { userId }, data: invData })]
      : [db.userInvestment.create({ data: { userId, ...invData } })]),
    db.transaction.create({
      data: { userId, type: "ADJUSTMENT", currency: "USD", amount: data.amount, description: `Investment in ${plan.name}` },
    }),
    db.activityLog.create({
      data: { userId, type: "INVESTMENT_STARTED", title: `Invested $${data.amount.toLocaleString()} in ${plan.name}`, amount: data.amount, currency: "USD" },
    }),
    db.notification.create({
      data: { userId, title: "Investment Activated", message: `Your ${plan.name} investment of $${data.amount.toLocaleString()} is now active.`, type: "SUCCESS" },
    }),
  ]);

  // Fire-and-forget email notification
  try {
    const user = await db.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
    if (user?.email) {
      sendNotificationEmail({
        to: user.email,
        name: user.name || "Trader",
        subject: `Investment Activated — ${plan.name}`,
        heading: "Investment Activated",
        body: [
          `Your investment of $${data.amount.toLocaleString()} in the ${plan.name} plan is now active.`,
          "Your funds are now working for you. You can track your earnings in real time from your dashboard.",
        ],
        cta: { label: "View Investments", url: `${APP_URL}/dashboard/investments` },
      }).catch((err) => console.error("[userStartInvestment] email failed:", err));
    }
  } catch (_) { /* non-blocking */ }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/investments");
  return { success: true };
}
// ─── User: start copying a trader ─────────────────────────────────────

export async function userStartCopyTrade(data: {
  traderId: string;
  amount: number;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const userId = session.user.id;

  const kycError = await requireApprovedKyc(userId);
  if (kycError) return kycError;

  const trader = await db.copyTrader.findUnique({ where: { id: data.traderId } });
  if (!trader || !trader.isActive) return { error: "Trader not found or inactive" };
  if (data.amount < Number(trader.minCopyAmount)) {
    return { error: `Minimum copy amount is $${Number(trader.minCopyAmount).toLocaleString()}` };
  }
  if (trader.maxCopyAmount !== null && data.amount > Number(trader.maxCopyAmount)) {
    return { error: `Maximum copy amount is $${Number(trader.maxCopyAmount).toLocaleString()}` };
  }

  const existing = await db.userCopyTrade.findFirst({
    where: { userId, traderId: data.traderId, status: { not: "STOPPED" } },
  });
  if (existing) return { error: `You are already copying ${trader.name}` };

  const usdWallet = await db.wallet.findFirst({ where: { userId, currency: "USD" } });
  if (!usdWallet || Number(usdWallet.balance) < data.amount) {
    return { error: "Insufficient USD balance" };
  }

  const now = new Date();
  const intervalSecs = Number(trader.profitInterval);
  const nextProfitAt = new Date(now.getTime() + intervalSecs * 1000);

  await db.$transaction([
    db.wallet.update({ where: { id: usdWallet.id }, data: { balance: { decrement: data.amount } } }),
    db.userCopyTrade.create({
      data: {
        userId, traderId: data.traderId, traderName: trader.name,
        amount: data.amount, totalEarned: 0,
        minProfit: trader.minProfit, maxProfit: trader.maxProfit,
        profitInterval: trader.profitInterval, maxInterval: trader.maxInterval,
        status: "ACTIVE", lastProfitAt: now, nextProfitAt,
      },
    }),
    db.transaction.create({
      data: { userId, type: "ADJUSTMENT", currency: "USD", amount: data.amount, description: `Copy trading ${trader.name}` },
    }),
    db.activityLog.create({
      data: { userId, type: "COPY_TRADE_STARTED", title: `Started copying ${trader.name}`, amount: data.amount, currency: "USD" },
    }),
    db.notification.create({
      data: { userId, title: "Copy Trade Started", message: `You are now copying ${trader.name} with $${data.amount.toLocaleString()}.`, type: "SUCCESS" },
    }),
  ]);

  // Fire-and-forget email notification
  try {
    const user = await db.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
    if (user?.email) {
      sendNotificationEmail({
        to: user.email,
        name: user.name || "Trader",
        subject: `Copy Trade Started — ${trader.name}`,
        heading: "Copy Trade Started",
        body: [
          `You are now copying ${trader.name} with $${data.amount.toLocaleString()}.`,
          "All trades made by this expert will be mirrored in your account automatically.",
        ],
        cta: { label: "View Copy Trades", url: `${APP_URL}/dashboard/copy-trading` },
      }).catch((err) => console.error("[userStartCopyTrade] email failed:", err));
    }
  } catch (_) { /* non-blocking */ }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/copy-trading");
  return { success: true };
}

// ─── User: add funds to investment ───────────────────────────────────────

export async function addInvestmentFunds(amount: number) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const userId = session.user.id;

  const kycError = await requireApprovedKyc(userId);
  if (kycError) return kycError;

  const investment = await db.userInvestment.findUnique({ where: { userId } });
  if (!investment) return { error: "No active investment found" };

  const usdWallet = await db.wallet.findFirst({ where: { userId, currency: "USD" } });
  if (!usdWallet || Number(usdWallet.balance) < amount) return { error: "Insufficient USD balance" };

  await db.$transaction([
    db.wallet.update({ where: { id: usdWallet.id }, data: { balance: { decrement: amount } } }),
    db.userInvestment.update({ where: { userId }, data: { amount: { increment: amount } } }),
    db.activityLog.create({
      data: { userId, type: "INVESTMENT_FUNDS_ADDED", title: `Added $${amount.toLocaleString()} to ${investment.planName}`, amount, currency: "USD" },
    }),
  ]);

  // Fire-and-forget email notification
  try {
    const user = await db.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
    if (user?.email) {
      sendNotificationEmail({
        to: user.email,
        name: user.name || "Trader",
        subject: `Funds Added to ${investment.planName}`,
        heading: "Investment Funds Added",
        body: [
          `You have successfully added $${amount.toLocaleString()} to your ${investment.planName} investment.`,
          "Your updated investment is now generating returns on the increased amount.",
        ],
        cta: { label: "View Investments", url: `${APP_URL}/dashboard/investments` },
      }).catch((err) => console.error("[addInvestmentFunds] email failed:", err));
    }
  } catch (_) { /* non-blocking */ }

  revalidatePath("/dashboard");
  return { success: true };
}

// ─── User: stop copying a trader ──────────────────────────────────────

export async function stopCopyTrade(copyTradeId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const userId = session.user.id;

  const trade = await db.userCopyTrade.findFirst({ where: { id: copyTradeId, userId } });
  if (!trade) return { error: "Trade not found" };

  await db.$transaction([
    db.userCopyTrade.update({ where: { id: copyTradeId }, data: { status: "STOPPED" } }),
    db.activityLog.create({
      data: { userId, type: "COPY_TRADE_STOPPED", title: `Stopped copying ${trade.traderName}`, amount: Number(trade.amount), currency: "USD" },
    }),
  ]);

  // Fire-and-forget email notification
  try {
    const user = await db.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
    if (user?.email) {
      sendNotificationEmail({
        to: user.email,
        name: user.name || "Trader",
        subject: `Copy Trade Stopped — ${trade.traderName}`,
        heading: "Copy Trade Stopped",
        body: [
          `You have stopped copying ${trade.traderName}.`,
          `Your total invested amount was $${Number(trade.amount).toLocaleString()} with $${Number(trade.totalEarned).toLocaleString()} earned.`,
        ],
        cta: { label: "View Dashboard", url: `${APP_URL}/dashboard` },
      }).catch((err) => console.error("[stopCopyTrade] email failed:", err));
    }
  } catch (_) { /* non-blocking */ }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/copy-trading");
  return { success: true };
}

// ─── Admin: investment plan CRUD ─────────────────────────────────────────

export async function adminGetInvestmentPlans() {
  const session = await auth();
  if (!session?.user?.id) return [];
  const admin = await db.user.findUnique({ where: { id: session.user.id } });
  if (admin?.role !== "ADMIN") return [];
  return db.investmentPlan.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { userInvestments: true } } },
  });
}

export async function adminCreatePlan(data: {
  name: string;
  description?: string;
  minAmount: number;
  maxAmount?: number | null;
  minProfit: number;
  maxProfit: number;
  profitInterval: number;
  maxInterval: number;
  isPopular?: boolean;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const admin = await db.user.findUnique({ where: { id: session.user.id } });
  if (admin?.role !== "ADMIN") return { error: "Forbidden" };

  // Only one plan can be flagged as popular — clear others first
  if (data.isPopular) {
    await db.investmentPlan.updateMany({ where: { isPopular: true }, data: { isPopular: false } });
  }
  await db.investmentPlan.create({ data });
  revalidatePath("/admin/investments");
  revalidatePath("/dashboard/investments");
  return { success: true };
}

export async function adminUpdatePlan(planId: string, data: Partial<{
  name: string; description: string; minAmount: number; maxAmount: number | null;
  minProfit: number; maxProfit: number; profitInterval: number;
  maxInterval: number; isActive: boolean; isPopular: boolean;
}>) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const admin = await db.user.findUnique({ where: { id: session.user.id } });
  if (admin?.role !== "ADMIN") return { error: "Forbidden" };

  // Only one plan can be flagged as popular — clear others first
  if (data.isPopular === true) {
    await db.investmentPlan.updateMany({
      where: { isPopular: true, NOT: { id: planId } },
      data: { isPopular: false },
    });
  }
  await db.investmentPlan.update({ where: { id: planId }, data });
  revalidatePath("/admin/investments");
  revalidatePath("/dashboard/investments");
  return { success: true };
}

// ─── Admin: user investment management ───────────────────────────────────────

export async function adminEditInvestment(userId: string, data: {
  planName: string; amount: number; minProfit: number;
  maxProfit: number; profitInterval: number; maxInterval: number;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const admin = await db.user.findUnique({ where: { id: session.user.id } });
  if (admin?.role !== "ADMIN") return { error: "Forbidden" };
  const now = new Date();
  const nextProfitAt = new Date(now.getTime() + data.profitInterval * 1000);
  await db.userInvestment.update({ where: { userId }, data: { ...data, nextProfitAt } });
  revalidatePath("/admin/investments");
  return { success: true };
}

export async function adminAddFundsToInvestment(userId: string, amount: number) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const admin = await db.user.findUnique({ where: { id: session.user.id } });
  if (admin?.role !== "ADMIN") return { error: "Forbidden" };
  const inv = await db.userInvestment.findUnique({ where: { userId } });
  if (!inv) return { error: "Investment not found" };
  await db.$transaction([
    db.userInvestment.update({ where: { userId }, data: { amount: { increment: amount } } }),
    db.activityLog.create({
      data: { userId, type: "INVESTMENT_FUNDS_ADDED", title: `Admin added $${amount.toLocaleString()} to ${inv.planName}`, amount, currency: "USD" },
    }),
  ]);
  revalidatePath("/admin/investments");
  return { success: true };
}

export async function adminAssignInvestment(data: {
  userId: string; planName: string; amount: number;
  minProfit: number; maxProfit: number; profitInterval: number;
  maxInterval: number; planId?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const admin = await db.user.findUnique({ where: { id: session.user.id } });
  if (admin?.role !== "ADMIN") return { error: "Forbidden" };
  const now = new Date();
  const nextProfitAt = new Date(now.getTime() + data.profitInterval * 1000);
  const invPayload = {
    planId: data.planId || null, planName: data.planName, amount: data.amount,
    minProfit: data.minProfit, maxProfit: data.maxProfit,
    profitInterval: data.profitInterval, maxInterval: data.maxInterval,
    status: "ACTIVE" as const, lastProfitAt: now, nextProfitAt,
  };
  await db.userInvestment.upsert({
    where: { userId: data.userId },
    create: { userId: data.userId, totalEarned: 0, ...invPayload },
    update: invPayload,
  });
  await db.activityLog.create({
    data: { userId: data.userId, type: "INVESTMENT_STARTED", title: `Investment started — ${data.planName}`, amount: data.amount, currency: "USD" },
  });
  revalidatePath("/admin/investments");
  revalidatePath(`/admin/users/${data.userId}`);
  return { success: true };
}

export async function adminToggleInvestment(userId: string, status: "ACTIVE" | "PAUSED") {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const admin = await db.user.findUnique({ where: { id: session.user.id } });
  if (admin?.role !== "ADMIN") return { error: "Forbidden" };
  await db.userInvestment.update({ where: { userId }, data: { status } });
  revalidatePath("/admin/investments");
  return { success: true };
}

export async function adminCancelInvestment(userId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const admin = await db.user.findUnique({ where: { id: session.user.id } });
  if (admin?.role !== "ADMIN") return { error: "Forbidden" };
  await db.userInvestment.update({ where: { userId }, data: { status: "CANCELLED" } });
  await db.activityLog.create({
    data: { userId, type: "INVESTMENT_CANCELLED", title: "Investment cancelled by admin", currency: "USD" },
  });
  revalidatePath("/admin/investments");
  return { success: true };
}

// ─── Admin: copy traders ───────────────────────────────────────────────────

export async function adminCreateCopyTrader(data: {
  name: string; avatarUrl?: string; country?: string;
  specialty?: string; description?: string;
  winRate: number; totalROI: number; performance30d?: number;
  riskLevel?: string; followers: number;
  totalTrades?: number; successfulTrades?: number;
  failedTrades?: number; maxDrawdown?: number;
  minCopyAmount: number; maxCopyAmount?: number | null;
  profitInterval: number; maxInterval: number;
  minProfit: number; maxProfit: number;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const admin = await db.user.findUnique({ where: { id: session.user.id } });
  if (admin?.role !== "ADMIN") return { error: "Forbidden" };
  try {
    const trader = await db.copyTrader.create({ data });
    revalidatePath("/admin/copy-traders");
    revalidatePath("/dashboard/copy-trading");
    return { success: true, traderId: trader.id };
  } catch (e: any) {
    console.error("[adminCreateCopyTrader]", e);
    return { error: e?.message ?? "Failed to create trader" };
  }
}

export async function adminUpdateCopyTrader(traderId: string, data: Partial<{
  name: string; avatarUrl: string; country: string;
  specialty: string; description: string;
  winRate: number; totalROI: number; performance30d: number;
  riskLevel: string; followers: number;
  totalTrades: number; successfulTrades: number;
  failedTrades: number; maxDrawdown: number;
  minCopyAmount: number; maxCopyAmount: number | null;
  profitInterval: number; maxInterval: number;
  minProfit: number; maxProfit: number; isActive: boolean;
}>) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const admin = await db.user.findUnique({ where: { id: session.user.id } });
  if (admin?.role !== "ADMIN") return { error: "Forbidden" };
  try {
    await db.copyTrader.update({ where: { id: traderId }, data });
    revalidatePath("/admin/copy-traders");
    revalidatePath("/dashboard/copy-trading");
    return { success: true };
  } catch (e: any) {
    console.error("[adminUpdateCopyTrader]", e);
    return { error: e?.message ?? "Failed to update trader" };
  }
}

export async function adminDeleteCopyTrader(traderId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const admin = await db.user.findUnique({ where: { id: session.user.id } });
  if (admin?.role !== "ADMIN") return { error: "Forbidden" };
  try {
    // UserCopyTrade has no onDelete cascade — must delete child records first
    await db.userCopyTrade.deleteMany({ where: { traderId } });
    await db.copyTrader.delete({ where: { id: traderId } });
    revalidatePath("/admin/copy-traders");
    revalidatePath("/dashboard/copy-trading");
    return { success: true };
  } catch (e: any) {
    console.error("[adminDeleteCopyTrader]", e);
    return { error: e?.message ?? "Failed to delete trader" };
  }
}

export async function adminAssignCopyTrade(data: { userId: string; traderId: string; amount: number }) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const admin = await db.user.findUnique({ where: { id: session.user.id } });
  if (admin?.role !== "ADMIN") return { error: "Forbidden" };
  const trader = await db.copyTrader.findUnique({ where: { id: data.traderId } });
  if (!trader) return { error: "Trader not found" };
  const now = new Date();
  const nextProfitAt = new Date(now.getTime() + trader.profitInterval * 1000);
  await db.userCopyTrade.create({
    data: {
      userId: data.userId, traderId: data.traderId, traderName: trader.name,
      amount: data.amount, totalEarned: 0,
      minProfit: trader.minProfit, maxProfit: trader.maxProfit,
      profitInterval: trader.profitInterval, maxInterval: trader.maxInterval,
      status: "ACTIVE", lastProfitAt: now, nextProfitAt,
    },
  });
  await db.activityLog.create({
    data: { userId: data.userId, type: "COPY_TRADE_STARTED", title: `Started copying ${trader.name}`, amount: data.amount, currency: "USD" },
  });
  revalidatePath("/admin/copy-traders");
  return { success: true };
}

export async function adminStopCopyTrade(copyTradeId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const admin = await db.user.findUnique({ where: { id: session.user.id } });
  if (admin?.role !== "ADMIN") return { error: "Forbidden" };
  const trade = await db.userCopyTrade.findUnique({ where: { id: copyTradeId } });
  if (!trade) return { error: "Trade not found" };
  await db.$transaction([
    db.userCopyTrade.update({ where: { id: copyTradeId }, data: { status: "STOPPED" } }),
    db.activityLog.create({
      data: { userId: trade.userId, type: "COPY_TRADE_STOPPED", title: `Copy trade stopped — ${trade.traderName}`, currency: "USD" },
    }),
  ]);
  revalidatePath("/admin/copy-traders");
  return { success: true };
}

// ─── List helpers ──────────────────────────────────────────────────────────

export async function adminGetAllInvestments() {
  const session = await auth();
  if (!session?.user?.id) return [];
  const admin = await db.user.findUnique({ where: { id: session.user.id } });
  if (admin?.role !== "ADMIN") return [];
  return db.userInvestment.findMany({
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { startedAt: "desc" },
  });
}

export async function adminGetAllCopyTrades() {
  const session = await auth();
  if (!session?.user?.id) return [];
  const admin = await db.user.findUnique({ where: { id: session.user.id } });
  if (admin?.role !== "ADMIN") return [];
  return db.userCopyTrade.findMany({
    include: { user: { select: { id: true, name: true, email: true } }, trader: true },
    orderBy: { startedAt: "desc" },
  });
}

export async function adminGetAllCopyTraders() {
  const session = await auth();
  if (!session?.user?.id) return [];
  const admin = await db.user.findUnique({ where: { id: session.user.id } });
  if (admin?.role !== "ADMIN") return [];
  return db.copyTrader.findMany({
    include: { userCopyTrades: { where: { status: "ACTIVE" } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function adminGetAllUsers() {
  const session = await auth();
  if (!session?.user?.id) return [];
  const admin = await db.user.findUnique({ where: { id: session.user.id } });
  if (admin?.role !== "ADMIN") return [];
  return db.user.findMany({
    where: { role: "USER" },
    select: { id: true, name: true, email: true },
    orderBy: { createdAt: "desc" },
  });
}

// ─── Admin: seed 10 default copy traders ───────────────────────────────────
//
// Inserts a fixed catalogue of 10 realistic copy traders using the exact
// same field schema as the admin Create Copy Trader form. Values are
// generated deterministically from each trader's name, so:
//   - re-running the seed does NOT change any stats
//   - every trader ends up with its own distinct, realistic profile
//   - successful + failed always equals totalTrades
//   - risk level drives profit range + interval speed
//
// Traders that already exist (matched by name) are skipped, so admin
// edits are preserved across re-seeds.

interface SeededPreset {
  name:        string;
  country:     string;    // ISO alpha-2
  specialty:   string;
  description: string;
  riskLevel:   "LOW" | "MEDIUM" | "HIGH";
}

/*
 * The default seed list is flavoured after ten globally recognised
 * investors/traders so the demo feels realistic. Stats are still
 * fully fictional (generated by the deterministic PRNG below) — admin
 * can edit any field and upload a photo via the existing Trader Photo
 * flow. `avatarUrl` is intentionally null so the in-app initials
 * fallback renders a clean branded identity until a real photo is
 * uploaded. Re-seeding never overwrites admin edits to existing rows.
 */
const SEEDED_TRADERS: SeededPreset[] = [
  {
    name: "Warren Buffett",
    country: "US",
    specialty: "Value Investing",
    description: "Long-term value investing in high-quality businesses with durable competitive moats.",
    riskLevel: "LOW",
  },
  {
    name: "George Soros",
    country: "HU",
    specialty: "Macro Speculation",
    description: "Contrarian macro speculation built on reflexivity and aggressive position sizing.",
    riskLevel: "HIGH",
  },
  {
    name: "Ray Dalio",
    country: "US",
    specialty: "Systematic Macro",
    description: "All-weather macro framework using risk parity across economic regimes.",
    riskLevel: "MEDIUM",
  },
  {
    name: "Paul Tudor Jones",
    country: "US",
    specialty: "Global Macro",
    description: "Discretionary macro trading across currencies, rates, and equity index futures.",
    riskLevel: "HIGH",
  },
  {
    name: "Stanley Druckenmiller",
    country: "US",
    specialty: "Macro Trading",
    description: "Concentrated macro bets focused on asymmetric risk/reward setups.",
    riskLevel: "HIGH",
  },
  {
    name: "Jim Simons",
    country: "US",
    specialty: "Quantitative Strategies",
    description: "Medallion-style quantitative strategies driven by short-horizon statistical edges.",
    riskLevel: "MEDIUM",
  },
  {
    name: "Peter Lynch",
    country: "US",
    specialty: "Growth Investing",
    description: "Growth-at-a-reasonable-price investing in companies with understandable business models.",
    riskLevel: "LOW",
  },
  {
    name: "Cathie Wood",
    country: "US",
    specialty: "Disruptive Innovation",
    description: "High-conviction positions in disruptive innovation across genomics, AI, and fintech.",
    riskLevel: "HIGH",
  },
  {
    name: "Michael Burry",
    country: "US",
    specialty: "Contrarian Value",
    description: "Deep-value contrarian research combined with targeted credit-cycle hedges.",
    riskLevel: "MEDIUM",
  },
  {
    name: "Carl Icahn",
    country: "US",
    specialty: "Activist Investing",
    description: "Activist positions pushing corporate governance and capital-return changes.",
    riskLevel: "MEDIUM",
  },
];

/**
 * Cheap deterministic PRNG seeded by a string (xmur3 + mulberry32). Re-running
 * the same name always produces the same sequence, so seeded stats don't
 * re-randomise across deploys.
 */
function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let state = h >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Derive a full stat block for a preset using its name as RNG seed. */
function makeStatsFor(preset: SeededPreset) {
  const rng = seededRandom(preset.name);
  const pick = (lo: number, hi: number) => lo + rng() * (hi - lo);
  const pickInt = (lo: number, hi: number) => Math.floor(pick(lo, hi + 1));
  const round = (n: number, dp = 2) => {
    const m = 10 ** dp;
    return Math.round(n * m) / m;
  };

  // Risk-driven bands — low risk = steadier numbers, high risk = punchier.
  const bands = {
    LOW:    { winRate: [72, 82], roi: [40,  90],  p30: [3,   8], drawdown: [-6,  -2],
              minP: [0.15, 0.35], maxP: [0.6, 1.0],
              intLo: [90, 150],   intHi: [180, 300] },
    MEDIUM: { winRate: [78, 88], roi: [80, 180],  p30: [6,  14], drawdown: [-12, -5],
              minP: [0.3,  0.6],  maxP: [1.0, 1.8],
              intLo: [60, 120],   intHi: [120, 240] },
    HIGH:   { winRate: [65, 80], roi: [140, 320], p30: [10, 26], drawdown: [-22, -10],
              minP: [0.6,  1.2],  maxP: [1.8, 3.2],
              intLo: [30,  90],   intHi: [90,  180] },
  }[preset.riskLevel];

  const winRate        = round(pick(bands.winRate[0], bands.winRate[1]));
  const totalROI       = round(pick(bands.roi[0],     bands.roi[1]));
  const performance30d = round(pick(bands.p30[0],     bands.p30[1]), 1);
  const maxDrawdown    = round(pick(bands.drawdown[0], bands.drawdown[1]), 1);
  const followers      = pickInt(400, 18000);
  const totalTrades    = pickInt(300, 2400);
  const successfulTrades = Math.round((winRate / 100) * totalTrades);
  const failedTrades   = totalTrades - successfulTrades;
  const minProfitRaw   = round(pick(bands.minP[0], bands.minP[1]), 2);
  const maxProfitRaw   = round(pick(bands.maxP[0], bands.maxP[1]), 2);
  const minProfit      = Math.min(minProfitRaw, maxProfitRaw);
  const maxProfit      = Math.max(minProfitRaw, maxProfitRaw);
  const profitInterval = pickInt(bands.intLo[0], bands.intLo[1]);
  const maxIntervalRaw = pickInt(bands.intHi[0], bands.intHi[1]);
  const maxInterval    = Math.max(profitInterval, maxIntervalRaw);
  const minCopyAmount  = [100, 200, 250, 500, 1000][pickInt(0, 4)];
  const maxCopyAmount  = [25000, 50000, 100000, null, null][pickInt(0, 4)];

  return {
    country:        preset.country,
    specialty:      preset.specialty,
    description:    preset.description,
    riskLevel:      preset.riskLevel,
    winRate,
    totalROI,
    performance30d,
    followers,
    totalTrades,
    successfulTrades,
    failedTrades,
    maxDrawdown,
    minCopyAmount,
    maxCopyAmount,
    profitInterval,
    maxInterval,
    minProfit,
    maxProfit,
  };
}

export async function adminSeedDefaultCopyTraders() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const admin = await db.user.findUnique({ where: { id: session.user.id } });
  if (admin?.role !== "ADMIN") return { error: "Forbidden" };

  try {
    let created = 0;
    let skipped = 0;
    let removed = 0;

    /* Remove stale seeded traders — rows previously inserted by an older
       version of this preset list (e.g. the original ApexQuant Capital /
       NovaTrade Labs set). Only delete rows that:
         - were seeded (isSeeded = true), never manually created
         - are NOT in the current preset list, so admin-edited seed rows
           matching a current name are preserved
         - have no active user copy trades, so we never rip out a trader
           someone is currently copying. */
    const presetNames = SEEDED_TRADERS.map((p) => p.name);
    const stale = await db.copyTrader.findMany({
      where: {
        isSeeded: true,
        name:     { notIn: presetNames },
      },
      include: { userCopyTrades: { where: { status: "ACTIVE" } } },
    });

    for (const t of stale) {
      if (t.userCopyTrades.length > 0) continue;        // someone's actively copying — leave it
      await db.userCopyTrade.deleteMany({ where: { traderId: t.id } });
      await db.copyTrader.delete({ where: { id: t.id } });
      removed++;
    }

    /* Create any presets that don't already exist. Existing rows (even
       manually edited ones) are left untouched. */
    for (const preset of SEEDED_TRADERS) {
      const existing = await db.copyTrader.findFirst({ where: { name: preset.name } });
      if (existing) { skipped++; continue; }

      const stats = makeStatsFor(preset);
      await db.copyTrader.create({
        data: {
          name:             preset.name,
          avatarUrl:        null,                // initials fallback already renders a branded identity
          isSeeded:         true,
          isActive:         true,
          ...stats,
        },
      });
      created++;
    }

    revalidatePath("/admin/copy-traders");
    revalidatePath("/dashboard/copy-trading");
    return { success: true, created, skipped, removed };
  } catch (e: any) {
    console.error("[adminSeedDefaultCopyTraders]", e);
    return { error: e?.message ?? "Failed to seed traders" };
  }
}
