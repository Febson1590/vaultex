"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function placeTrade(data: {
  assetId: string;
  side: "BUY" | "SELL";
  quantity: number;
  type?: "MARKET" | "LIMIT";
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const userId = session.user.id;

  const [user, asset, usdWallet] = await Promise.all([
    db.user.findUnique({ where: { id: userId } }),
    db.marketAsset.findUnique({ where: { id: data.assetId } }),
    db.wallet.findUnique({ where: { userId_currency: { userId, currency: "USD" } } }),
  ]);

  if (!user || user.status !== "ACTIVE") return { error: "Account not active" };
  if (!asset || !asset.isActive) return { error: "Asset not available" };
  if (!usdWallet) return { error: "USD wallet not found" };

  const price = Number(asset.currentPrice);
  const quantity = data.quantity;
  const total = price * quantity;
  const fee = total * 0.001; // 0.1% fee

  if (data.side === "BUY") {
    if (Number(usdWallet.balance) < total + fee) {
      return { error: "Insufficient USD balance" };
    }

    // Deduct USD
    await db.wallet.update({
      where: { userId_currency: { userId, currency: "USD" } },
      data: { balance: { decrement: total + fee } },
    });

    // Add/update holding
    const holding = await db.assetHolding.findUnique({
      where: { userId_assetId: { userId, assetId: data.assetId } },
    });

    if (holding) {
      const newTotal = Number(holding.totalInvested) + total;
      const newQty = Number(holding.quantity) + quantity;
      await db.assetHolding.update({
        where: { userId_assetId: { userId, assetId: data.assetId } },
        data: {
          quantity: newQty,
          avgBuyPrice: newTotal / newQty,
          totalInvested: newTotal,
        },
      });
    } else {
      await db.assetHolding.create({
        data: {
          userId,
          assetId: data.assetId,
          quantity,
          avgBuyPrice: price,
          totalInvested: total,
        },
      });
    }
  } else {
    // SELL
    const holding = await db.assetHolding.findUnique({
      where: { userId_assetId: { userId, assetId: data.assetId } },
    });

    if (!holding || Number(holding.quantity) < quantity) {
      return { error: "Insufficient asset balance" };
    }

    const newQty = Number(holding.quantity) - quantity;
    if (newQty < 0.000001) {
      await db.assetHolding.delete({
        where: { userId_assetId: { userId, assetId: data.assetId } },
      });
    } else {
      await db.assetHolding.update({
        where: { userId_assetId: { userId, assetId: data.assetId } },
        data: {
          quantity: newQty,
          totalInvested: { decrement: Number(holding.avgBuyPrice) * quantity },
        },
      });
    }

    // Add USD
    await db.wallet.update({
      where: { userId_currency: { userId, currency: "USD" } },
      data: { balance: { increment: total - fee } },
    });
  }

  // Create trade order record
  const order = await db.tradeOrder.create({
    data: {
      userId,
      assetId: data.assetId,
      type: data.type || "MARKET",
      side: data.side,
      quantity,
      price,
      total,
      fee,
      status: "FILLED",
    },
  });

  // Create transaction record
  await db.transaction.create({
    data: {
      userId,
      type: data.side === "BUY" ? "BUY" : "SELL",
      currency: asset.symbol,
      amount: quantity,
      fee,
      status: "COMPLETED",
      description: `${data.side} ${quantity} ${asset.symbol} @ $${price.toFixed(2)}`,
    },
  });

  // Notification
  await db.notification.create({
    data: {
      userId,
      title: `${data.side} Order Filled`,
      message: `Your order to ${data.side.toLowerCase()} ${quantity} ${asset.symbol} at $${price.toFixed(2)} has been executed.`,
      type: "TRADE",
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/trade");
  revalidatePath("/dashboard/portfolio");
  revalidatePath("/dashboard/transactions");

  return { success: true, orderId: order.id };
}

export async function getMarketAssets() {
  return db.marketAsset.findMany({
    where: { isActive: true },
    orderBy: { rank: "asc" },
  });
}

export async function getWatchlist(userId: string) {
  return db.watchlistItem.findMany({
    where: { userId },
    include: { asset: true },
  });
}

export async function toggleWatchlist(assetId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const userId = session.user.id;
  const existing = await db.watchlistItem.findUnique({
    where: { userId_assetId: { userId, assetId } },
  });

  if (existing) {
    await db.watchlistItem.delete({
      where: { userId_assetId: { userId, assetId } },
    });
    return { added: false };
  } else {
    await db.watchlistItem.create({ data: { userId, assetId } });
    return { added: true };
  }
}
