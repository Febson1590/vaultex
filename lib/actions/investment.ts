"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireApprovedKyc } from "@/lib/kyc";
import { requireActiveStatus } from "@/lib/user-status";
import { sendNotificationEmail, APP_URL } from "@/lib/notifications";
import { resolvePlanSecs } from "@/lib/duration";

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

  const statusError = await requireActiveStatus(userId, "invest");
  if (statusError) return statusError;

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

  // Canonical seconds via the shared resolver — same rule the admin
  // list, admin modal, user card and engine all use.
  const now = new Date();
  const resolved = resolvePlanSecs(plan);
  const minSecsCfg = resolved.minSecs > 0 ? resolved.minSecs : 3600;   // 1 h safety floor
  const maxSecsCfg = resolved.maxSecs >= minSecsCfg ? resolved.maxSecs : minSecsCfg;
  const firstTickSecs = maxSecsCfg > minSecsCfg
    ? minSecsCfg + Math.random() * (maxSecsCfg - minSecsCfg)
    : minSecsCfg;
  const nextProfitAt = new Date(now.getTime() + Math.round(firstTickSecs * 1000));

  const invData = {
    planId: plan.id,
    planName: plan.name,
    amount: data.amount,
    totalEarned: 0,
    minProfit: plan.minProfit,
    maxProfit: plan.maxProfit,
    // Snapshot seconds (canonical). Use the resolved values so a legacy
    // hour-only plan still writes correct seconds onto the user row.
    profitInterval: minSecsCfg,
    maxInterval:    maxSecsCfg,
    minDurationHours: plan.minDurationHours,
    maxDurationHours: plan.maxDurationHours,
    minLossRatio: plan.minLossRatio,
    maxLossRatio: plan.maxLossRatio,
    minLoss:      plan.minLoss,
    maxLoss:      plan.maxLoss,
    consecutiveLosses: 0,
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

  const statusError = await requireActiveStatus(userId, "invest");
  if (statusError) return statusError;

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

  // Hour-based cadence first; seconds-based intervals are only a fallback
  // for legacy traders that don't have the hour band set yet.
  const now = new Date();
  const minH = trader.minDurationHours ?? null;
  const maxH = trader.maxDurationHours ?? null;
  let firstDelayMs: number;
  if (minH !== null && maxH !== null && maxH >= minH) {
    const hrs = maxH > minH ? minH + Math.random() * (maxH - minH) : minH;
    firstDelayMs = Math.round(hrs * 3600 * 1000);
  } else {
    firstDelayMs = Number(trader.profitInterval) * 1000;
  }
  const nextProfitAt = new Date(now.getTime() + firstDelayMs);

  await db.$transaction([
    db.wallet.update({ where: { id: usdWallet.id }, data: { balance: { decrement: data.amount } } }),
    db.userCopyTrade.create({
      data: {
        userId, traderId: data.traderId, traderName: trader.name,
        amount: data.amount, totalEarned: 0,
        minProfit: trader.minProfit, maxProfit: trader.maxProfit,
        profitInterval: trader.profitInterval, maxInterval: trader.maxInterval,
        minDurationHours: trader.minDurationHours,
        maxDurationHours: trader.maxDurationHours,
        minLossRatio: trader.minLossRatio,
        maxLossRatio: trader.maxLossRatio,
        minLoss:      trader.minLoss,
        maxLoss:      trader.maxLoss,
        consecutiveLosses: 0,
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

  const statusError = await requireActiveStatus(userId, "addFunds");
  if (statusError) return statusError;

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

// ─── User: list upgrade-eligible plans for the current investment ───────

/** Plans are ranked by minAmount. Returns only plans strictly above the
 *  user's current active investment plan (by minAmount), so the Upgrade
 *  flow never shows the current or a lower tier. Both seeded and
 *  admin-created custom plans participate. */
export async function getUpgradePlans() {
  const session = await auth();
  if (!session?.user?.id) return [];
  const userId = session.user.id;

  const investment = await db.userInvestment.findUnique({ where: { userId } });
  if (!investment) return [];

  // Find the current plan's minAmount. If the plan was deleted (planId
  // dangling), treat the snapshot investment amount as the baseline so
  // the user still gets a list of plans above their active size.
  let currentMin = Number(investment.amount);
  if (investment.planId) {
    const current = await db.investmentPlan.findUnique({ where: { id: investment.planId } });
    if (current) currentMin = Number(current.minAmount);
  }

  return db.investmentPlan.findMany({
    where: {
      isActive: true,
      minAmount: { gt: currentMin },
    },
    orderBy: { minAmount: "asc" },
  });
}

// ─── User: upgrade to a higher plan ──────────────────────────────────────

/** Moves the active investment onto a higher-tier plan. Funding source is
 *  strictly the user's USD (deposit) wallet — never existing profit. The
 *  rule: currentInvestedAmount + topUp >= targetPlan.minAmount. On success
 *  the investment's plan snapshot (profit band, loss band, duration band,
 *  plan name, planId) is replaced with the target plan's config, and the
 *  next tick is rescheduled from the new plan's duration band. Totals and
 *  history are preserved. */
export async function userUpgradeInvestmentPlan(data: {
  planId: string;
  topUp?: number;   // how much deposit balance to add to the investment
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const userId = session.user.id;

  const kycError = await requireApprovedKyc(userId);
  if (kycError) return kycError;

  const statusError = await requireActiveStatus(userId, "upgrade");
  if (statusError) return statusError;

  const topUp = Math.max(0, data.topUp ?? 0);

  const [investment, targetPlan, usdWallet] = await Promise.all([
    db.userInvestment.findUnique({ where: { userId } }),
    db.investmentPlan.findUnique({ where: { id: data.planId } }),
    db.wallet.findFirst({ where: { userId, currency: "USD" } }),
  ]);

  if (!investment) return { error: "No active investment to upgrade" };
  if (investment.status !== "ACTIVE") return { error: "Investment is not active" };
  if (!targetPlan || !targetPlan.isActive) return { error: "Target plan not found or inactive" };

  // Eligibility — strictly higher tier by minAmount.
  let currentMin = Number(investment.amount);
  if (investment.planId) {
    const current = await db.investmentPlan.findUnique({ where: { id: investment.planId } });
    if (current) currentMin = Number(current.minAmount);
  }
  if (Number(targetPlan.minAmount) <= currentMin) {
    return { error: "Target plan is not higher than your current plan" };
  }

  // Projected size after top-up must clear the target plan minimum.
  const projected = Number(investment.amount) + topUp;
  if (projected < Number(targetPlan.minAmount)) {
    const shortfall = Number(targetPlan.minAmount) - projected;
    return {
      error: `Top up at least ${`$${shortfall.toLocaleString()}`} more to meet the ${targetPlan.name} minimum of $${Number(targetPlan.minAmount).toLocaleString()}.`,
      shortfall,
    };
  }
  if (targetPlan.maxAmount !== null && projected > Number(targetPlan.maxAmount)) {
    return {
      error: `Upgrade would exceed the ${targetPlan.name} maximum of $${Number(targetPlan.maxAmount).toLocaleString()}.`,
    };
  }

  // Deposit balance (USD wallet) is the only allowed funding source.
  if (topUp > 0) {
    if (!usdWallet) return { error: "No USD (deposit) wallet found" };
    if (Number(usdWallet.balance) < topUp) {
      return { error: `Deposit balance is $${Number(usdWallet.balance).toLocaleString()} — short by $${(topUp - Number(usdWallet.balance)).toLocaleString()}.` };
    }
  }

  // Reschedule next tick from the target plan's duration band. First tick
  // timing resets so the new plan's cadence takes effect immediately.
  const now = new Date();
  const minH = targetPlan.minDurationHours ?? 1;
  const maxH = targetPlan.maxDurationHours ?? Math.max(3, minH);
  const nextHours = maxH > minH ? minH + Math.random() * (maxH - minH) : minH;
  const nextProfitAt = new Date(now.getTime() + Math.round(nextHours * 3600 * 1000));

  const ops: any[] = [
    db.userInvestment.update({
      where: { userId },
      data: {
        planId:            targetPlan.id,
        planName:          targetPlan.name,
        amount:            { increment: topUp },
        minProfit:         targetPlan.minProfit,
        maxProfit:         targetPlan.maxProfit,
        profitInterval:    targetPlan.profitInterval,
        maxInterval:       targetPlan.maxInterval,
        minDurationHours:  targetPlan.minDurationHours,
        maxDurationHours:  targetPlan.maxDurationHours,
        minLossRatio:      targetPlan.minLossRatio,
        maxLossRatio:      targetPlan.maxLossRatio,
        minLoss:           targetPlan.minLoss,
        maxLoss:           targetPlan.maxLoss,
        consecutiveLosses: 0,
        lastProfitAt:      now,
        nextProfitAt,
      },
    }),
    db.activityLog.create({
      data: {
        userId,
        type:     "INVESTMENT_UPGRADED",
        title:    `Upgraded to ${targetPlan.name}${topUp > 0 ? ` (+$${topUp.toLocaleString()})` : ""}`,
        amount:   topUp > 0 ? topUp : null,
        currency: "USD",
      },
    }),
    db.notification.create({
      data: {
        userId,
        title:   "Investment Upgraded",
        message: `Your investment is now on the ${targetPlan.name} plan.`,
        type:    "SUCCESS",
      },
    }),
  ];

  if (topUp > 0 && usdWallet) {
    ops.unshift(
      db.wallet.update({ where: { id: usdWallet.id }, data: { balance: { decrement: topUp } } }),
    );
    ops.push(
      db.transaction.create({
        data: {
          userId,
          type:        "ADJUSTMENT",
          currency:    "USD",
          amount:      topUp,
          description: `Upgrade top-up to ${targetPlan.name}`,
        },
      }),
    );
  }

  await db.$transaction(ops);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/investments");
  return { success: true };
}

// ─── User: stop copying a trader ──────────────────────────────────────

/** Deprecated: user-facing stop. Kept as a stub that returns an error
 *  so older dashboards can't silently stop a trade — ending a copy
 *  trade is an admin-only operation (via `adminEndCopyTrade`). */
export async function stopCopyTrade(_copyTradeId: string) {
  return {
    error: "Copy trades can only be ended by an administrator. Contact support if you'd like to close a trade early.",
  };
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
  minDurationHours?: number | null;
  maxDurationHours?: number | null;
  profitInterval: number;
  maxInterval: number;
  minLossRatio?: number;
  maxLossRatio?: number;
  minLoss?: number;
  maxLoss?: number;
  isPopular?: boolean;
  isActive?: boolean;
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
  minProfit: number; maxProfit: number;
  minDurationHours: number | null; maxDurationHours: number | null;
  profitInterval: number; maxInterval: number;
  minLossRatio: number; maxLossRatio: number; minLoss: number; maxLoss: number;
  isActive: boolean; isPopular: boolean;
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

/** Delete a plan — always allowed, including plans with active user
 *  investments. Any UserInvestment rows pointing at this plan keep their
 *  snapshotted `planName` + amount + profit settings, but have their
 *  `planId` foreign key nulled out so the delete doesn't violate the
 *  relation constraint. History is preserved; the plan definition is gone. */
export async function adminDeletePlan(planId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const admin = await db.user.findUnique({ where: { id: session.user.id } });
  if (admin?.role !== "ADMIN") return { error: "Forbidden" };

  const detached = await db.userInvestment.updateMany({
    where: { planId },
    data:  { planId: null },
  });

  await db.investmentPlan.delete({ where: { id: planId } });

  revalidatePath("/admin/investments");
  revalidatePath("/dashboard/investments");
  return { success: true, detached: detached.count };
}

// ─── Admin: user investment management ───────────────────────────────────────

export async function adminEditInvestment(userId: string, data: {
  planName:       string;
  amount:         number;
  minProfit:      number;
  maxProfit:      number;
  profitInterval: number;
  maxInterval:    number;
  minLossRatio?:  number;
  maxLossRatio?:  number;
  minLoss?:       number;
  maxLoss?:       number;
  planId?:        string | null;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const admin = await db.user.findUnique({ where: { id: session.user.id } });
  if (admin?.role !== "ADMIN") return { error: "Forbidden" };
  const now = new Date();
  // Next tick randomized inside the configured band so the first post-
  // edit tick behaves like every other tick (no min-edge bias).
  const minSecs = Math.max(0, data.profitInterval);
  const maxSecs = Math.max(minSecs, data.maxInterval);
  const firstSecs = maxSecs > minSecs ? minSecs + Math.random() * (maxSecs - minSecs) : minSecs;
  const nextProfitAt = new Date(now.getTime() + Math.round(firstSecs * 1000));

  await db.userInvestment.update({
    where: { userId },
    data: {
      planName:         data.planName,
      amount:           data.amount,
      minProfit:        data.minProfit,
      maxProfit:        data.maxProfit,
      profitInterval:   data.profitInterval,
      maxInterval:      data.maxInterval,
      // Legacy hour columns are fully deprecated — clear them on every
      // admin edit so the canonical seconds fields are the sole source
      // of truth for this row going forward.
      minDurationHours: null,
      maxDurationHours: null,
      minLossRatio:     data.minLossRatio ?? 0,
      maxLossRatio:     data.maxLossRatio ?? 0,
      minLoss:          data.minLoss      ?? 0,
      maxLoss:          data.maxLoss      ?? 0,
      // Track plan link if the admin (re)selected a plan in the modal,
      // or `null` to mark as a pure custom override.
      ...(data.planId !== undefined ? { planId: data.planId || null } : {}),
      consecutiveLosses: 0,
      lastProfitAt:      now,
      nextProfitAt,
    },
  });
  revalidatePath("/admin/investments");
  // Make sure the user's dashboard + investments page drop their
  // cached render too — otherwise they see the old values until the
  // next 15s poll lands.
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/investments");
  revalidatePath(`/admin/users/${userId}`);
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
      data: { userId, type: "INVESTMENT_FUNDS_ADDED", title: `$${amount.toLocaleString()} added to ${inv.planName}`, amount, currency: "USD" },
    }),
  ]);
  revalidatePath("/admin/investments");
  return { success: true };
}

export async function adminAssignInvestment(data: {
  userId:         string;
  planName:       string;
  amount:         number;
  minProfit:      number;
  maxProfit:      number;
  profitInterval: number;
  maxInterval:    number;
  planId?:        string;
  minLossRatio?:  number;
  maxLossRatio?:  number;
  minLoss?:       number;
  maxLoss?:       number;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const admin = await db.user.findUnique({ where: { id: session.user.id } });
  if (admin?.role !== "ADMIN") return { error: "Forbidden" };
  const now = new Date();
  // Randomize first tick inside the band so admin-assigned investments
  // tick on the same distribution as user-started ones.
  const minSecs = Math.max(0, data.profitInterval);
  const maxSecs = Math.max(minSecs, data.maxInterval);
  const firstSecs = maxSecs > minSecs ? minSecs + Math.random() * (maxSecs - minSecs) : minSecs;
  const nextProfitAt = new Date(now.getTime() + Math.round(firstSecs * 1000));

  const invPayload = {
    planId: data.planId || null, planName: data.planName, amount: data.amount,
    minProfit: data.minProfit, maxProfit: data.maxProfit,
    profitInterval: data.profitInterval, maxInterval: data.maxInterval,
    minDurationHours: null,
    maxDurationHours: null,
    minLossRatio: data.minLossRatio ?? 0,
    maxLossRatio: data.maxLossRatio ?? 0,
    minLoss:      data.minLoss      ?? 0,
    maxLoss:      data.maxLoss      ?? 0,
    consecutiveLosses: 0,
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
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/investments");
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

/**
 * Admin-only: end a user's active trade professionally.
 *
 * Releases `principal + max(earned, 0)` to the user's USD (Available)
 * wallet. Losses accumulated during the trade are visible in the
 * activity log for realism, but never eat into the principal — the
 * user always walks away with at least what they invested (Option B
 * from our design conversation).
 *
 * Status becomes COMPLETED; `completedAt` + `finalReturn` are stamped.
 * This is the "Trade ended" event the user sees in their history.
 */
export async function adminEndInvestment(userId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const admin = await db.user.findUnique({ where: { id: session.user.id } });
  if (admin?.role !== "ADMIN") return { error: "Forbidden" };

  const inv = await db.userInvestment.findUnique({ where: { userId } });
  if (!inv) return { error: "No investment found for this user" };
  if (inv.status === "COMPLETED" || inv.status === "CANCELLED") {
    return { error: "This trade is already closed" };
  }

  const principal    = Number(inv.amount);
  const earnedRaw    = Number(inv.totalEarned);
  // Option B: losses during the trade don't eat principal. Earned
  // profit floor is 0 so the payout is never less than what the user
  // deposited into this trade.
  const profitPayout = Math.max(0, earnedRaw);
  const payout       = Math.round((principal + profitPayout) * 100) / 100;

  const usdWallet = await db.wallet.findFirst({ where: { userId, currency: "USD" } });

  await db.$transaction([
    db.userInvestment.update({
      where: { userId },
      data:  {
        status:       "COMPLETED",
        completedAt:  new Date(),
        finalReturn:  payout,
        nextProfitAt: null,
      },
    }),
    // Release the payout to the user's Available Balance. Create the
    // wallet if it somehow doesn't exist so the funds always land.
    ...(usdWallet
      ? [db.wallet.update({ where: { id: usdWallet.id }, data: { balance: { increment: payout } } })]
      : [db.wallet.create({ data: { userId, currency: "USD", balance: payout, address: "" } })]),
    db.transaction.create({
      data: {
        userId,
        type:        "ADJUSTMENT",
        currency:    "USD",
        amount:      payout,
        description: `Trade ended — ${inv.planName} released to available balance`,
      },
    }),
    db.activityLog.create({
      data: {
        userId,
        type:     "INVESTMENT_ENDED",
        title:    `Trade ended — $${payout.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} released to your balance`,
        amount:   payout,
        currency: "USD",
      },
    }),
    db.notification.create({
      data: {
        userId,
        title:   "Trade Ended",
        message: `Your ${inv.planName} trade has been closed. $${payout.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} has been released to your available balance.`,
        type:    "SUCCESS",
      },
    }),
  ]);

  // Fire-and-forget email
  try {
    const user = await db.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
    if (user?.email) {
      sendNotificationEmail({
        to: user.email,
        name: user.name || "Trader",
        subject: `Trade Ended — ${inv.planName}`,
        heading: "Your Trade Has Ended",
        body: [
          `Your ${inv.planName} trade has been closed by our team.`,
          `Principal invested: $${principal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          profitPayout > 0
            ? `Profit released: $${profitPayout.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : "Profit released: —",
          `Total released to your available balance: $${payout.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          "You can now withdraw these funds, fund a new trade, or upgrade to a higher plan.",
        ],
        cta: { label: "View Dashboard", url: `${APP_URL}/dashboard` },
      }).catch((err) => console.error("[adminEndInvestment] email failed:", err));
    }
  } catch (_) { /* non-blocking */ }

  revalidatePath("/admin/investments");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/investments");
  revalidatePath(`/admin/users/${userId}`);

  return { success: true, payout, principal, profitReleased: profitPayout };
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
  minDurationHours?: number | null;
  maxDurationHours?: number | null;
  minProfit: number; maxProfit: number;
  minLossRatio?: number; maxLossRatio?: number;
  minLoss?: number; maxLoss?: number;
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
  minDurationHours: number | null;
  maxDurationHours: number | null;
  minProfit: number; maxProfit: number;
  minLossRatio: number; maxLossRatio: number;
  minLoss: number; maxLoss: number;
  isActive: boolean;
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

/**
 * Admin-only: end a user's copy trade and release principal + profit.
 *
 * Mirrors `adminEndInvestment`. Releases `principal + max(totalEarned, 0)`
 * to the user's Available Balance (USD wallet) atomically, creates a
 * Transaction row (so it shows up in the transaction history), an
 * activity log entry, and a notification. Losses during the run appear
 * in history for realism but never eat the principal — Option B.
 */
export async function adminEndCopyTrade(copyTradeId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const admin = await db.user.findUnique({ where: { id: session.user.id } });
  if (admin?.role !== "ADMIN") return { error: "Forbidden" };

  const trade = await db.userCopyTrade.findUnique({ where: { id: copyTradeId } });
  if (!trade) return { error: "Copy trade not found" };
  if (trade.status === "STOPPED") {
    return { error: "This copy trade is already closed" };
  }

  const principal    = Number(trade.amount);
  const earnedRaw    = Number(trade.totalEarned);
  const profitPayout = Math.max(0, earnedRaw);
  const payout       = Math.round((principal + profitPayout) * 100) / 100;

  const usdWallet = await db.wallet.findFirst({
    where: { userId: trade.userId, currency: "USD" },
  });

  await db.$transaction([
    db.userCopyTrade.update({
      where: { id: copyTradeId },
      data:  {
        status:       "STOPPED",
        completedAt:  new Date(),
        finalReturn:  payout,
        nextProfitAt: null,
      },
    }),
    ...(usdWallet
      ? [db.wallet.update({
          where: { id: usdWallet.id },
          data:  { balance: { increment: payout } },
        })]
      : [db.wallet.create({
          data: { userId: trade.userId, currency: "USD", balance: payout, address: "" },
        })]),
    db.transaction.create({
      data: {
        userId:      trade.userId,
        type:        "ADJUSTMENT",
        currency:    "USD",
        amount:      payout,
        description: `Copy trade ended — ${trade.traderName} released to available balance`,
      },
    }),
    db.activityLog.create({
      data: {
        userId:   trade.userId,
        type:     "COPY_TRADE_ENDED",
        title:    `Copy trade ended — $${payout.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} released to your balance`,
        amount:   payout,
        currency: "USD",
      },
    }),
    db.notification.create({
      data: {
        userId:  trade.userId,
        title:   "Copy Trade Ended",
        message: `Your ${trade.traderName} copy trade has been closed. $${payout.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} has been released to your available balance.`,
        type:    "SUCCESS",
      },
    }),
  ]);

  // Fire-and-forget email
  try {
    const user = await db.user.findUnique({
      where: { id: trade.userId }, select: { email: true, name: true },
    });
    if (user?.email) {
      sendNotificationEmail({
        to: user.email,
        name: user.name || "Trader",
        subject: `Copy Trade Ended — ${trade.traderName}`,
        heading: "Your Copy Trade Has Ended",
        body: [
          `Your copy trade of ${trade.traderName} has been closed by our team.`,
          `Principal invested: $${principal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          profitPayout > 0
            ? `Profit released: $${profitPayout.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : "Profit released: —",
          `Total released to your available balance: $${payout.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          "You can now withdraw these funds, start a new trade, or copy another trader.",
        ],
        cta: { label: "View Dashboard", url: `${APP_URL}/dashboard` },
      }).catch((err) => console.error("[adminEndCopyTrade] email failed:", err));
    }
  } catch (_) { /* non-blocking */ }

  revalidatePath("/admin/copy-traders");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/copy-trading");
  revalidatePath("/dashboard/transactions");
  revalidatePath(`/admin/users/${trade.userId}`);

  return { success: true, payout, principal, profitReleased: profitPayout };
}

/** Thin alias kept for call-sites that still import the old name.
 *  New callers should use `adminEndCopyTrade`. */
export async function adminStopCopyTrade(copyTradeId: string) {
  return adminEndCopyTrade(copyTradeId);
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
