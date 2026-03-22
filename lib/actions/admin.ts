"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { generateWalletAddress } from "@/lib/utils";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

async function logAction(adminId: string, action: string, targetId?: string, description?: string) {
  await db.adminActionLog.create({
    data: { adminId, targetId, action, description },
  });
}

export async function getAdminStats() {
  const adminId = await requireAdmin();

  const [totalUsers, activeUsers, pendingDeposits, pendingWithdrawals, openTickets, pendingKyc] = await Promise.all([
    db.user.count({ where: { role: "USER" } }),
    db.user.count({ where: { role: "USER", status: "ACTIVE" } }),
    db.depositRequest.count({ where: { status: "PENDING" } }),
    db.withdrawalRequest.count({ where: { status: "PENDING" } }),
    db.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    db.verification.count({ where: { status: "PENDING" } }),
  ]);

  return { totalUsers, activeUsers, pendingDeposits, pendingWithdrawals, openTickets, pendingKyc };
}

export async function getAdminUsers(page = 1, limit = 20, search?: string) {
  await requireAdmin();

  const where = search
    ? { OR: [{ email: { contains: search, mode: "insensitive" as const } }, { name: { contains: search, mode: "insensitive" as const } }], role: "USER" as const }
    : { role: "USER" as const };

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      include: { profile: true, wallets: true, verifications: { take: 1, orderBy: { submittedAt: "desc" } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.user.count({ where }),
  ]);

  return { users, total, pages: Math.ceil(total / limit) };
}

export async function updateUserStatus(userId: string, status: "ACTIVE" | "FROZEN" | "RESTRICTED" | "SUSPENDED") {
  const adminId = await requireAdmin();

  await db.user.update({ where: { id: userId }, data: { status } });
  await logAction(adminId, "UPDATE_USER_STATUS", userId, `Status changed to ${status}`);

  await db.notification.create({
    data: {
      userId,
      title: "Account Status Updated",
      message: `Your account status has been updated to ${status}. Contact support for more information.`,
      type: "WARNING",
    },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function adminUpdateWallet(userId: string, currency: string, amount: number, operation: "SET" | "ADD" | "SUBTRACT") {
  const adminId = await requireAdmin();

  const wallet = await db.wallet.findUnique({
    where: { userId_currency: { userId, currency } },
  });

  if (!wallet) {
    await db.wallet.create({
      data: { userId, currency, balance: amount, address: generateWalletAddress(currency) },
    });
  } else {
    let newBalance: number;
    if (operation === "SET") newBalance = amount;
    else if (operation === "ADD") newBalance = Number(wallet.balance) + amount;
    else newBalance = Math.max(0, Number(wallet.balance) - amount);

    await db.wallet.update({
      where: { userId_currency: { userId, currency } },
      data: { balance: newBalance },
    });
  }

  await db.transaction.create({
    data: {
      userId,
      type: "ADJUSTMENT",
      currency,
      amount,
      status: "COMPLETED",
      description: `Admin balance adjustment: ${operation} ${amount} ${currency}`,
    },
  });

  await logAction(adminId, "WALLET_ADJUSTMENT", userId, `${operation} ${amount} ${currency}`);

  await db.notification.create({
    data: {
      userId,
      title: "Balance Updated",
      message: `Your ${currency} wallet has been updated by our team.`,
      type: "INFO",
    },
  });

  revalidatePath("/admin/users");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function adminUpdateHolding(userId: string, assetId: string, quantity: number, avgBuyPrice: number) {
  const adminId = await requireAdmin();

  await db.assetHolding.upsert({
    where: { userId_assetId: { userId, assetId } },
    update: { quantity, avgBuyPrice, totalInvested: quantity * avgBuyPrice },
    create: { userId, assetId, quantity, avgBuyPrice, totalInvested: quantity * avgBuyPrice },
  });

  await logAction(adminId, "HOLDING_UPDATE", userId, `Updated holding for asset ${assetId}`);
  revalidatePath("/admin/users");
  return { success: true };
}

export async function processDepositRequest(id: string, action: "APPROVE" | "REJECT", notes?: string) {
  const adminId = await requireAdmin();

  const deposit = await db.depositRequest.findUnique({ where: { id } });
  if (!deposit) return { error: "Deposit not found" };

  await db.depositRequest.update({
    where: { id },
    data: {
      status: action === "APPROVE" ? "APPROVED" : "REJECTED",
      adminNotes: notes,
      processedAt: new Date(),
    },
  });

  if (action === "APPROVE") {
    await db.wallet.update({
      where: { userId_currency: { userId: deposit.userId, currency: deposit.currency } },
      data: { balance: { increment: Number(deposit.amount) } },
    });

    await db.transaction.create({
      data: {
        userId: deposit.userId,
        type: "DEPOSIT",
        currency: deposit.currency,
        amount: deposit.amount,
        status: "COMPLETED",
        description: `Deposit via ${deposit.method}`,
      },
    });
  }

  await db.notification.create({
    data: {
      userId: deposit.userId,
      title: `Deposit ${action === "APPROVE" ? "Approved" : "Rejected"}`,
      message: action === "APPROVE"
        ? `Your deposit of ${deposit.amount} ${deposit.currency} has been approved and credited to your wallet.`
        : `Your deposit request has been rejected. ${notes || "Contact support for details."}`,
      type: action === "APPROVE" ? "SUCCESS" : "ERROR",
    },
  });

  await logAction(adminId, `${action}_DEPOSIT`, deposit.userId, `Deposit ${id} ${action.toLowerCase()}d`);
  revalidatePath("/admin/deposits");
  return { success: true };
}

export async function processWithdrawalRequest(id: string, action: "APPROVE" | "REJECT", notes?: string) {
  const adminId = await requireAdmin();

  const withdrawal = await db.withdrawalRequest.findUnique({ where: { id } });
  if (!withdrawal) return { error: "Withdrawal not found" };

  await db.withdrawalRequest.update({
    where: { id },
    data: {
      status: action === "APPROVE" ? "APPROVED" : "REJECTED",
      adminNotes: notes,
      processedAt: new Date(),
    },
  });

  if (action === "APPROVE") {
    await db.wallet.update({
      where: { userId_currency: { userId: withdrawal.userId, currency: withdrawal.currency } },
      data: { balance: { decrement: Number(withdrawal.amount) } },
    });

    await db.transaction.create({
      data: {
        userId: withdrawal.userId,
        type: "WITHDRAWAL",
        currency: withdrawal.currency,
        amount: withdrawal.amount,
        status: "COMPLETED",
        description: `Withdrawal via ${withdrawal.method}`,
      },
    });
  }

  await db.notification.create({
    data: {
      userId: withdrawal.userId,
      title: `Withdrawal ${action === "APPROVE" ? "Approved" : "Rejected"}`,
      message: action === "APPROVE"
        ? `Your withdrawal of ${withdrawal.amount} ${withdrawal.currency} has been approved.`
        : `Your withdrawal request has been rejected. ${notes || "Contact support for details."}`,
      type: action === "APPROVE" ? "SUCCESS" : "ERROR",
    },
  });

  await logAction(adminId, `${action}_WITHDRAWAL`, withdrawal.userId, `Withdrawal ${id} ${action.toLowerCase()}d`);
  revalidatePath("/admin/withdrawals");
  return { success: true };
}

export async function processVerification(id: string, action: "APPROVE" | "REJECT", notes?: string) {
  const adminId = await requireAdmin();

  const verification = await db.verification.findUnique({ where: { id } });
  if (!verification) return { error: "Verification not found" };

  await db.verification.update({
    where: { id },
    data: {
      status: action === "APPROVE" ? "APPROVED" : "REJECTED",
      notes,
      reviewedBy: adminId,
      reviewedAt: new Date(),
    },
  });

  await db.notification.create({
    data: {
      userId: verification.userId,
      title: `Verification ${action === "APPROVE" ? "Approved" : "Rejected"}`,
      message: action === "APPROVE"
        ? "Your identity verification has been approved. You now have full access to all trading features."
        : `Your verification was rejected. ${notes || "Please resubmit with correct documents."}`,
      type: action === "APPROVE" ? "SUCCESS" : "ERROR",
    },
  });

  await logAction(adminId, `${action}_VERIFICATION`, verification.userId);
  revalidatePath("/admin/verification");
  return { success: true };
}

export async function adminSendNotification(userId: string, title: string, message: string, type: string) {
  const adminId = await requireAdmin();

  await db.notification.create({
    data: { userId, title, message, type: type as any },
  });

  await logAction(adminId, "SEND_NOTIFICATION", userId, title);
  return { success: true };
}

export async function adminUpdateMarketAsset(id: string, data: {
  currentPrice?: number;
  priceChange24h?: number;
  isActive?: boolean;
}) {
  const adminId = await requireAdmin();

  await db.marketAsset.update({
    where: { id },
    data,
  });

  await logAction(adminId, "UPDATE_MARKET_ASSET", undefined, `Updated ${id}`);
  revalidatePath("/admin/markets");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function adminRespondToTicket(ticketId: string, message: string, closeTicket?: boolean) {
  const adminId = await requireAdmin();

  const ticket = await db.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) return { error: "Ticket not found" };

  await db.supportMessage.create({
    data: { ticketId, senderId: adminId, senderRole: "ADMIN", content: message },
  });

  await db.supportTicket.update({
    where: { id: ticketId },
    data: { status: closeTicket ? "RESOLVED" : "IN_PROGRESS" },
  });

  await db.notification.create({
    data: {
      userId: ticket.userId,
      title: "Support Response Received",
      message: `Your ticket #${ticketId.slice(-6).toUpperCase()} has received a response.`,
      type: "SUPPORT",
    },
  });

  revalidatePath("/admin/support");
  return { success: true };
}

export async function adminGenerateTransaction(userId: string, data: {
  type: string;
  currency: string;
  amount: number;
  description?: string;
}) {
  const adminId = await requireAdmin();

  await db.transaction.create({
    data: {
      userId,
      type: data.type as any,
      currency: data.currency,
      amount: data.amount,
      status: "COMPLETED",
      description: data.description || `Admin generated transaction`,
    },
  });

  await logAction(adminId, "GENERATE_TRANSACTION", userId, `${data.type} ${data.amount} ${data.currency}`);
  revalidatePath("/admin/transactions");
  return { success: true };
}
