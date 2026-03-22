"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// ─── User actions ────────────────────────────────────────────────────────────

export async function getDashboardData() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const userId = session.user.id;

  const [user, wallets, investment, copyTrades, activity] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      include: { verifications: { orderBy: { submittedAt: "desc" }, take: 1 } },
    }),
    db.wallet.findMany({ where: { userId } }),
    db.userInvestment.findUnique({ where: { userId } }),
    db.userCopyTrade.findMany({
      where: { userId, status: { not: "STOPPED" } },
      orderBy: { startedAt: "desc" },
    }),
    db.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return { user, wallets, investment, copyTrades, activity };
}

export async function addInvestmentFunds(amount: number) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const userId = session.user.id;

  const investment = await db.userInvestment.findUnique({ where: { userId } });
  if (!investment) return { error: "No active investment found" };

  const usdWallet = await db.wallet.findFirst({ where: { userId, currency: "USD" } });
  if (!usdWallet || Number(usdWallet.balance) < amount) return { error: "Insufficient USD balance" };

  await db.$transaction([
    db.wallet.update({
      where: { id: usdWallet.id },
      data: { balance: { decrement: amount } },
    }),
    db.userInvestment.update({
      where: { userId },
      data: { amount: { increment: amount } },
    }),
    db.activityLog.create({
      data: {
        userId,
        type: "INVESTMENT_FUNDS_ADDED",
        title: `Added $${amount.toLocaleString()} to ${investment.planName}`,
        amount,
        currency: "USD",
      },
    }),
  ]);

  revalidatePath("/dashboard");
  return { success: true };
}

export async function stopCopyTrade(copyTradeId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const userId = session.user.id;

  const trade = await db.userCopyTrade.findFirst({
    where: { id: copyTradeId, userId },
  });
  if (!trade) return { error: "Trade not found" };

  await db.$transaction([
    db.userCopyTrade.update({
      where: { id: copyTradeId },
      data: { status: "STOPPED" },
    }),
    db.activityLog.create({
      data: {
        userId,
        type: "COPY_TRADE_STOPPED",
        title: `Stopped copying ${trade.traderName}`,
        amount: Number(trade.amount),
        currency: "USD",
      },
    }),
  ]);

  revalidatePath("/dashboard");
  return { success: true };
}

// ─── Admin actions ───────────────────────────────────────────────────────────

export async function adminAssignInvestment(data: {
  userId: string;
  planName: string;
  amount: number;
  minProfit: number;
  maxProfit: number;
  profitInterval: number;
  planId?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const admin = await db.user.findUnique({ where: { id: session.user.id } });
  if (admin?.role !== "ADMIN") return { error: "Forbidden" };

  const now = new Date();
  const nextProfitAt = new Date(now.getTime() + data.profitInterval * 1000);

  // Upsert investment (one per user)
  await db.userInvestment.upsert({
    where: { userId: data.userId },
    create: {
      userId: data.userId,
      planId: data.planId || null,
      planName: data.planName,
      amount: data.amount,
      totalEarned: 0,
      minProfit: data.minProfit,
      maxProfit: data.maxProfit,
      profitInterval: data.profitInterval,
      status: "ACTIVE",
      lastProfitAt: now,
      nextProfitAt,
    },
    update: {
      planId: data.planId || null,
      planName: data.planName,
      amount: data.amount,
      minProfit: data.minProfit,
      maxProfit: data.maxProfit,
      profitInterval: data.profitInterval,
      status: "ACTIVE",
      lastProfitAt: now,
      nextProfitAt,
    },
  });

  await db.activityLog.create({
    data: {
      userId: data.userId,
      type: "INVESTMENT_STARTED",
      title: `Investment started — ${data.planName}`,
      amount: data.amount,
      currency: "USD",
    },
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

  await db.userInvestment.update({
    where: { userId },
    data: { status },
  });

  revalidatePath("/admin/investments");
  return { success: true };
}

export async function adminCancelInvestment(userId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const admin = await db.user.findUnique({ where: { id: session.user.id } });
  if (admin?.role !== "ADMIN") return { error: "Forbidden" };

  await db.userInvestment.update({
    where: { userId },
    data: { status: "CANCELLED" },
  });

  await db.activityLog.create({
    data: {
      userId,
      type: "INVESTMENT_CANCELLED",
      title: "Investment cancelled by admin",
      currency: "USD",
    },
  });

  revalidatePath("/admin/investments");
  return { success: true };
}

// ─── Admin: copy traders ─────────────────────────────────────────────────────

export async function adminCreateCopyTrader(data: {
  name: string;
  avatarUrl?: string;
  specialty?: string;
  winRate: number;
  totalROI: number;
  followers: number;
  minCopyAmount: number;
  description?: string;
  profitInterval: number;
  minProfit: number;
  maxProfit: number;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const admin = await db.user.findUnique({ where: { id: session.user.id } });
  if (admin?.role !== "ADMIN") return { error: "Forbidden" };

  const trader = await db.copyTrader.create({ data });
  revalidatePath("/admin/copy-traders");
  return { success: true, traderId: trader.id };
}

export async function adminUpdateCopyTrader(traderId: string, data: Partial<{
  name: string;
  avatarUrl: string;
  specialty: string;
  winRate: number;
  totalROI: number;
  followers: number;
  minCopyAmount: number;
  description: string;
  profitInterval: number;
  minProfit: number;
  maxProfit: number;
  isActive: boolean;
}>) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const admin = await db.user.findUnique({ where: { id: session.user.id } });
  if (admin?.role !== "ADMIN") return { error: "Forbidden" };

  await db.copyTrader.update({ where: { id: traderId }, data });
  revalidatePath("/admin/copy-traders");
  return { success: true };
}

export async function adminAssignCopyTrade(data: {
  userId: string;
  traderId: string;
  amount: number;
}) {
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
      userId: data.userId,
      traderId: data.traderId,
      traderName: trader.name,
      amount: data.amount,
      totalEarned: 0,
      minProfit: trader.minProfit,
      maxProfit: trader.maxProfit,
      profitInterval: trader.profitInterval,
      status: "ACTIVE",
      lastProfitAt: now,
      nextProfitAt,
    },
  });

  await db.activityLog.create({
    data: {
      userId: data.userId,
      type: "COPY_TRADE_STARTED",
      title: `Started copying ${trader.name}`,
      amount: data.amount,
      currency: "USD",
    },
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
      data: {
        userId: trade.userId,
        type: "COPY_TRADE_STOPPED",
        title: `Copy trade stopped — ${trade.traderName}`,
        currency: "USD",
      },
    }),
  ]);

  revalidatePath("/admin/copy-traders");
  return { success: true };
}

// ─── Admin: Investment Plans ──────────────────────────────────────────────────

export async function adminGetInvestmentPlans() {
  const session = await auth();
  if (!session?.user?.id) return [];
  return db.investmentPlan.findMany({ orderBy: { createdAt: "asc" } });
}

export async function adminCreatePlan(data: {
  name: string;
  description?: string;
  minAmount: number;
  minProfit: number;
  maxProfit: number;
  profitInterval: number;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const admin = await db.user.findUnique({ where: { id: session.user.id } });
  if (admin?.role !== "ADMIN") return { error: "Forbidden" };

  await db.investmentPlan.create({ data });
  revalidatePath("/admin/investments");
  return { success: true };
}

// ─── List helpers for admin pages ────────────────────────────────────────────

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
    include: {
      user: { select: { id: true, name: true, email: true } },
      trader: true,
    },
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
