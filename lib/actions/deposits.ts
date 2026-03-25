"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireApprovedKyc } from "@/lib/kyc";

export async function requestDeposit(data: {
  currency: string;
  amount: number;
  method: string;
  proofUrl?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const kycError = await requireApprovedKyc(session.user.id);
  if (kycError) return kycError;

  const request = await db.depositRequest.create({
    data: {
      userId: session.user.id,
      currency: data.currency,
      amount: data.amount,
      method: data.method,
      proofUrl: data.proofUrl,
    },
  });

  await db.notification.create({
    data: {
      userId: session.user.id,
      title: "Deposit Request Submitted",
      message: `Your deposit request for ${data.amount} ${data.currency} has been submitted and is pending review.`,
      type: "DEPOSIT",
    },
  });

  revalidatePath("/dashboard/deposit");
  return { success: true, requestId: request.id };
}

export async function requestWithdrawal(data: {
  currency: string;
  amount: number;
  method: string;
  destination?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const userId = session.user.id;

  const kycError = await requireApprovedKyc(userId);
  if (kycError) return kycError;

  const wallet = await db.wallet.findUnique({
    where: { userId_currency: { userId, currency: data.currency } },
  });

  if (!wallet || Number(wallet.balance) < data.amount) {
    return { error: "Insufficient balance" };
  }

  const request = await db.withdrawalRequest.create({
    data: {
      userId,
      currency: data.currency,
      amount: data.amount,
      method: data.method,
      destination: data.destination,
    },
  });

  await db.notification.create({
    data: {
      userId,
      title: "Withdrawal Request Submitted",
      message: `Your withdrawal request for ${data.amount} ${data.currency} has been submitted and is pending review.`,
      type: "WITHDRAWAL",
    },
  });

  revalidatePath("/dashboard/withdraw");
  return { success: true, requestId: request.id };
}
