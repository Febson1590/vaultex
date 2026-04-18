"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { generateWalletAddress } from "@/lib/utils";
import { notifyUser, APP_URL, type EmailSummaryCard } from "@/lib/notifications";

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

  const usdAmount    = Number(deposit.amount);
  const cryptoAmount = deposit.cryptoAmount !== null ? Number(deposit.cryptoAmount) : null;
  const cryptoSymbol = deposit.cryptoSymbol ?? deposit.currency;

  if (action === "APPROVE") {
    // The canonical amount is always USD — credit the user's USD wallet.
    // Upsert in case the user somehow doesn't yet have a USD wallet.
    await db.wallet.upsert({
      where:  { userId_currency: { userId: deposit.userId, currency: "USD" } },
      update: { balance: { increment: usdAmount } },
      create: { userId: deposit.userId, currency: "USD", balance: usdAmount },
    });

    await db.transaction.create({
      data: {
        userId:      deposit.userId,
        type:        "DEPOSIT",
        currency:    "USD",
        amount:      usdAmount,
        status:      "COMPLETED",
        description: cryptoAmount !== null
          ? `Deposit via ${deposit.method} · ${cryptoAmount} ${cryptoSymbol}`
          : `Deposit via ${deposit.method}`,
      },
    });
  }

  // Look up user for email
  const user = await db.user.findUnique({
    where: { id: deposit.userId },
    select: { email: true, name: true },
  });

  const usdStr    = `$${usdAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
  const cryptoStr = cryptoAmount !== null
    ? `${cryptoAmount.toLocaleString("en-US", { maximumFractionDigits: 8 })} ${cryptoSymbol}`
    : null;

  const notifTitle   = `Deposit ${action === "APPROVE" ? "Approved" : "Rejected"}`;
  const notifMessage = action === "APPROVE"
    ? `Your deposit of ${usdStr}${cryptoStr ? ` (paid with ${cryptoStr})` : ""} has been approved and credited to your wallet.`
    : `Your deposit request has been rejected. ${notes || "Contact support for details."}`;

  /* Build the email summary card — only when we have an email address
     to send to. USD is the primary, crypto is the secondary. */
  const summaryCard: EmailSummaryCard | undefined = user?.email
    ? {
        title:       "Transaction Summary",
        status:      action === "APPROVE" ? "Completed" : "Rejected",
        statusColor: action === "APPROVE" ? "success" : "warning",
        primary:     { label: "Amount", value: usdStr },
        secondary:   cryptoStr ? { label: "Crypto", value: cryptoStr } : undefined,
        rows: [
          { label: "Type",    value: "Deposit" },
          ...(cryptoSymbol ? [{ label: "Asset", value: `${cryptoSymbol}${deposit.cryptoNetwork ? ` · ${deposit.cryptoNetwork}` : ""}` }] : []),
          { label: "Reference", value: id.slice(0, 10).toUpperCase(), mono: true },
        ],
      }
    : undefined;

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
                "Your deposit has been approved and credited to your wallet. You can now use these funds to trade or invest.",
              ]
            : [
                `Your deposit request${cryptoStr ? ` (${cryptoStr})` : ""} was not approved.`,
                `Reason: ${notes}`,
                "If you believe this is an error, please contact our support team.",
              ],
          summaryCard,
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

  const usdAmount    = Number(withdrawal.amount);
  const cryptoAmount = withdrawal.cryptoAmount !== null ? Number(withdrawal.cryptoAmount) : null;
  const cryptoSymbol = withdrawal.cryptoSymbol ?? withdrawal.currency;
  const network      = withdrawal.cryptoNetwork ?? withdrawal.method;

  if (action === "APPROVE") {
    // Debit the USD wallet — that's our canonical ledger.
    await db.wallet.update({
      where: { userId_currency: { userId: withdrawal.userId, currency: "USD" } },
      data:  { balance: { decrement: usdAmount } },
    });

    await db.transaction.create({
      data: {
        userId:      withdrawal.userId,
        type:        "WITHDRAWAL",
        currency:    "USD",
        amount:      usdAmount,
        status:      "COMPLETED",
        description: cryptoAmount !== null
          ? `Withdrawal via ${network} · ${cryptoAmount} ${cryptoSymbol}`
          : `Withdrawal via ${network}`,
      },
    });
  }

  // Look up user for email
  const user = await db.user.findUnique({
    where: { id: withdrawal.userId },
    select: { email: true, name: true },
  });

  const usdStr    = `$${usdAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
  const cryptoStr = cryptoAmount !== null
    ? `${cryptoAmount.toLocaleString("en-US", { maximumFractionDigits: 8 })} ${cryptoSymbol}`
    : null;

  const notifTitle = `Withdrawal ${action === "APPROVE" ? "Approved" : "Rejected"}`;
  const notifMessage = action === "APPROVE"
    ? `Your withdrawal of ${usdStr}${cryptoStr ? ` (withdrawn as ${cryptoStr})` : ""} has been approved.`
    : `Your withdrawal request has been rejected. ${notes || "Contact support for details."}`;

  /** Shortened destination address for the summary card row. */
  const destShort = withdrawal.destination
    ? withdrawal.destination.length > 16
      ? `${withdrawal.destination.slice(0, 8)}…${withdrawal.destination.slice(-6)}`
      : withdrawal.destination
    : "—";

  const summaryCard: EmailSummaryCard | undefined = user?.email
    ? {
        title:       "Transaction Summary",
        status:      action === "APPROVE" ? "Processing" : "Rejected",
        statusColor: action === "APPROVE" ? "success" : "warning",
        primary:     { label: "Amount", value: usdStr },
        secondary:   cryptoStr ? { label: "Crypto", value: cryptoStr } : undefined,
        rows: [
          { label: "Type",        value: "Withdrawal" },
          ...(cryptoSymbol ? [{ label: "Asset", value: `${cryptoSymbol}${network ? ` · ${network}` : ""}` }] : []),
          ...(withdrawal.destination ? [{ label: "Destination", value: destShort, mono: true }] : []),
          { label: "Reference",   value: id.slice(0, 10).toUpperCase(), mono: true },
        ],
      }
    : undefined;

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
                "Your withdrawal has been approved and is being processed. The funds will be sent to your wallet shortly.",
              ]
            : [
                `Your withdrawal request${cryptoStr ? ` (${cryptoStr})` : ""} was not approved.`,
                `Reason: ${notes}`,
                "If you believe this is an error, please contact our support team.",
              ],
          summaryCard,
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

export async function getDepositWallets() {
  await requireAdmin();
  return db.depositWallet.findMany({ orderBy: { createdAt: "desc" } });
}

export async function upsertDepositWallet(data: {
  id?: string;
  asset: string;
  network?: string;
  address: string;
  label: string;
  isActive?: boolean;
}) {
  await requireAdmin();
  if (data.id) {
    return db.depositWallet.update({ where: { id: data.id }, data });
  }
  return db.depositWallet.create({ data: { ...data, isActive: data.isActive ?? true } });
}

export async function toggleDepositWallet(id: string, isActive: boolean) {
  await requireAdmin();
  await db.depositWallet.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/deposits");
  return { success: true };
}
