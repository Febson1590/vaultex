"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { buildBalanceChart } from "@/lib/chart";

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

/**
 * Returns real 30-day USD balance history for the dashboard chart.
 * Delegates to buildBalanceChart which uses backward reconstruction
 * from the live wallet balance to guarantee accuracy.
 */
export async function getPortfolioPerformance(userId: string) {
  return buildBalanceChart(userId, 30);
}
