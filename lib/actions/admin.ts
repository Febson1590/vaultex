"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { generateWalletAddress } from "@/lib/utils";
import { notifyUser, APP_URL } from "@/lib/notifications";

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

export async function adminUpdateWallet(userId: string, currency: string, amount: number, operation: "SET" | "ADD" | "SUBTRACT", reason = "") {
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
      description: reason
        ? `Admin ${operation.toLowerCase()}: ${reason}`
        : `Admin balance adjustment: ${operation} ${amount} ${currency}`,
    },
  });

  await logAction(adminId, "WALLET_ADJUSTMENT", userId, `${operation} ${amount} ${currency}${reason ? ` — ${reason}` : ""}`);

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

  if (action === "REJECT" && (!notes || notes.trim().length === 0)) {
    return { error: "Rejection reason is required" };
  }

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

  // Look up user for email
  const user = await db.user.findUnique({
    where: { id: deposit.userId },
    select: { email: true, name: true },
  });

  const notifTitle = `Deposit ${action === "APPROVE" ? "Approved" : "Rejected"}`;
  const notifMessage = action === "APPROVE"
    ? `Your deposit of ${deposit.amount} ${deposit.currency} has been approved and credited to your wallet.`
    : `Your deposit request has been rejected. ${notes || "Contact support for details."}`;

  await notifyUser({
    userId: deposit.userId,
    title: notifTitle,
    message: notifMessage,
    type: action === "APPROVE" ? "DEPOSIT" : "ERROR",
    email: user?.email
      ? {
          to: user.email,
          name: user.name || "Trader",
          subject: action === "APPROVE"
            ? "Your Vaultex deposit has been approved"
            : "Update on your Vaultex deposit request",
          heading: action === "APPROVE" ? "Deposit Approved" : "Deposit Update",
          body: action === "APPROVE"
            ? [
                `Your deposit of ${deposit.amount} ${deposit.currency} has been approved and credited to your wallet.`,
                "You can now use these funds to trade or invest.",
              ]
            : [
                `Your deposit request for ${deposit.amount} ${deposit.currency} was not approved.`,
                `Reason: ${notes}`,
                "If you believe this is an error, please contact our support team.",
              ],
          ...(action === "APPROVE"
            ? { cta: { label: "Go to Dashboard", url: `${APP_URL}/dashboard` } }
            : {}),
        }
      : undefined,
  });

  await logAction(adminId, `${action}_DEPOSIT`, deposit.userId, `Deposit ${id} ${action.toLowerCase()}d`);
  revalidatePath("/admin/deposits");
  return { success: true };
}

export async function processWithdrawalRequest(id: string, action: "APPROVE" | "REJECT", notes?: string) {
  const adminId = await requireAdmin();

  if (action === "REJECT" && (!notes || notes.trim().length === 0)) {
    return { error: "Rejection reason is required" };
  }

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

  // Look up user for email
  const user = await db.user.findUnique({
    where: { id: withdrawal.userId },
    select: { email: true, name: true },
  });

  const notifTitle = `Withdrawal ${action === "APPROVE" ? "Approved" : "Rejected"}`;
  const notifMessage = action === "APPROVE"
    ? `Your withdrawal of ${withdrawal.amount} ${withdrawal.currency} has been approved.`
    : `Your withdrawal request has been rejected. ${notes || "Contact support for details."}`;

  await notifyUser({
    userId: withdrawal.userId,
    title: notifTitle,
    message: notifMessage,
    type: action === "APPROVE" ? "WITHDRAWAL" : "ERROR",
    email: user?.email
      ? {
          to: user.email,
          name: user.name || "Trader",
          subject: action === "APPROVE"
            ? "Your Vaultex withdrawal has been approved"
            : "Update on your Vaultex withdrawal request",
          heading: action === "APPROVE" ? "Withdrawal Approved" : "Withdrawal Update",
          body: action === "APPROVE"
            ? [
                `Your withdrawal of ${withdrawal.amount} ${withdrawal.currency} has been approved and is being processed.`,
                `The funds will be sent to your ${withdrawal.method} destination.`,
              ]
            : [
                `Your withdrawal request for ${withdrawal.amount} ${withdrawal.currency} was not approved.`,
                `Reason: ${notes}`,
                "If you believe this is an error, please contact our support team.",
              ],
          ...(action === "APPROVE"
            ? { cta: { label: "View Transactions", url: `${APP_URL}/dashboard` } }
            : {}),
        }
      : undefined,
  });

  await logAction(adminId, `${action}_WITHDRAWAL`, withdrawal.userId, `Withdrawal ${id} ${action.toLowerCase()}d`);
  revalidatePath("/admin/withdrawals");
  return { success: true };
}

export async function processVerification(id: string, action: "APPROVE" | "REJECT", notes?: string) {
  const adminId = await requireAdmin();

  if (action === "REJECT" && (!notes || notes.trim().length === 0)) {
    return { error: "Rejection reason is required" };
  }

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

  // Look up user for email
  const user = await db.user.findUnique({
    where: { id: verification.userId },
    select: { email: true, name: true },
  });

  const notifTitle = `Verification ${action === "APPROVE" ? "Approved" : "Rejected"}`;
  const notifMessage = action === "APPROVE"
    ? "Your identity verification has been approved. You now have full access to all trading features."
    : `Your verification was rejected. ${notes || "Please resubmit with correct documents."}`;

  await notifyUser({
    userId: verification.userId,
    title: notifTitle,
    message: notifMessage,
    type: action === "APPROVE" ? "VERIFICATION" : "ERROR",
    email: user?.email
      ? {
          to: user.email,
          name: user.name || "Trader",
          subject: action === "APPROVE"
            ? "Your Vaultex identity has been verified"
            : "Update on your Vaultex verification",
          heading: action === "APPROVE" ? "Identity Verified" : "Verification Update",
          body: action === "APPROVE"
            ? [
                "Your identity has been verified successfully.",
                "You now have full access to all trading and investment features on Vaultex.",
              ]
            : [
                "Your verification was not approved.",
                `Reason: ${notes}`,
                "Please resubmit your documents with the correct information to proceed.",
              ],
          ...(action === "APPROVE"
            ? { cta: { label: "Go to Dashboard", url: `${APP_URL}/dashboard` } }
            : {}),
        }
      : undefined,
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

// ─── Deposit Wallet Management ───────────────────────────────────────────────
// TODO: Re-enable after running `prisma db push` to create the deposit_wallets
// table and add txHash/walletId columns to deposit_requests in production.
