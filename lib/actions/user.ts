"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;

  return db.user.findUnique({
    where: { id: session.user.id },
    include: {
      profile: true,
      wallets: true,
      holdings: { include: { asset: true } },
      verifications: { orderBy: { submittedAt: "desc" }, take: 1 },
      notifications: { where: { isRead: false }, orderBy: { createdAt: "desc" } },
    },
  });
}

export async function updateProfile(data: {
  firstName?: string;
  lastName?: string;
  phone?: string;
  country?: string;
  address?: string;
  city?: string;
  zipCode?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  await db.profile.upsert({
    where: { userId: session.user.id },
    update: data,
    create: { userId: session.user.id, ...data },
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function getDashboardData(userId: string) {
  const [wallets, holdings, transactions, notifications] = await Promise.all([
    db.wallet.findMany({ where: { userId } }),
    db.assetHolding.findMany({
      where: { userId },
      include: { asset: true },
    }),
    db.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return { wallets, holdings, transactions, notifications };
}

export async function markNotificationRead(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  await db.notification.update({
    where: { id, userId: session.user.id },
    data: { isRead: true },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function markAllNotificationsRead(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  await db.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data: { isRead: true },
  });

  revalidatePath("/dashboard");
}

export async function getTransactions(userId: string, limit = 20) {
  return db.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getPortfolioPerformance(userId: string) {
  const tradeOrders = await db.tradeOrder.findMany({
    where: { userId },
    include: { asset: true },
    orderBy: { executedAt: "asc" },
  });

  // Build cumulative portfolio value over time (last 30 days)
  const now = new Date();
  const days = 30;
  const data = [];

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    // Simulated portfolio value with slight random variation
    const base = 15000 + Math.sin(i * 0.3) * 3000 + (days - i) * 80;
    data.push({
      date: dateStr,
      value: Math.round(base + Math.random() * 500),
    });
  }

  return data;
}
