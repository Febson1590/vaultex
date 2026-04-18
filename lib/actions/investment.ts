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

// ─── Admin: wipe any legacy seeded / auto-generated copy traders ──────────
//
// The "Seed 10 Defaults" feature has been removed. This one-shot cleanup
// action lets admin delete any trader that was ever auto-created by the
// old seed button (isSeeded = true) so the list starts from a clean slate.
// Active copy trades are protected — if anyone is actively copying a
// seeded trader, that row is left alone and the admin has to stop the
// copy trade first before removing the trader manually.

export async function adminDeleteAllSeededCopyTraders() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const admin = await db.user.findUnique({ where: { id: session.user.id } });
  if (admin?.role !== "ADMIN") return { error: "Forbidden" };

  try {
    const seeded = await db.copyTrader.findMany({
      where:   { isSeeded: true },
      include: { userCopyTrades: { where: { status: "ACTIVE" } } },
    });

    let removed = 0;
    let blocked = 0;

    for (const t of seeded) {
      if (t.userCopyTrades.length > 0) { blocked++; continue; }
      await db.userCopyTrade.deleteMany({ where: { traderId: t.id } });
      await db.copyTrader.delete({ where: { id: t.id } });
      removed++;
    }

    revalidatePath("/admin/copy-traders");
    revalidatePath("/dashboard/copy-trading");
    return { success: true, removed, blocked };
  } catch (e: any) {
    console.error("[adminDeleteAllSeededCopyTraders]", e);
    return { error: e?.message ?? "Failed to remove seeded traders" };
  }
}
