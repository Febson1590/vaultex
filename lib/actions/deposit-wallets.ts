"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

/* ─── Auth helper ──────────────────────────────────────────────────────── */

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" as const };
  const user = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") return { error: "Forbidden" as const };
  return { ok: true as const };
}

function revalidateDepositPaths() {
  revalidatePath("/admin/deposit-wallets");
  revalidatePath("/dashboard/deposit");
}

/* ─── Read: list all deposit wallets (admin view) ──────────────────────── */

export async function adminGetAllDepositWallets() {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const wallets = await db.depositWallet.findMany({
    orderBy: [{ asset: "asc" }, { createdAt: "asc" }],
  });

  return {
    success: true as const,
    wallets: wallets.map((w) => ({
      id:           w.id,
      asset:        w.asset,
      network:      w.network,
      address:      w.address,
      label:        w.label,
      minDeposit:   w.minDeposit !== null ? Number(w.minDeposit) : null,
      instructions: w.instructions,
      isActive:     w.isActive,
      createdAt:    w.createdAt.toISOString(),
      updatedAt:    w.updatedAt.toISOString(),
    })),
  };
}

/* ─── Input validation ─────────────────────────────────────────────────── */

interface WalletInput {
  asset:        string;
  network?:     string | null;
  address:      string;
  label:        string;
  minDeposit?:  number | null;
  instructions?: string | null;
  isActive?:    boolean;
}

function normalize(data: WalletInput) {
  return {
    asset:   data.asset.trim().toUpperCase(),
    network: data.network?.trim() || null,
    address: data.address.trim(),
    label:   data.label.trim() || `${data.asset.toUpperCase()} ${data.network ?? ""}`.trim(),
    minDeposit:   data.minDeposit ?? null,
    instructions: data.instructions?.trim() || null,
    isActive:     data.isActive ?? true,
  };
}

function validate(data: WalletInput): string | null {
  if (!data.asset || !data.asset.trim()) return "Coin / symbol is required";
  if (!data.address || !data.address.trim()) return "Wallet address is required";
  if (data.address.trim().length < 6) return "Wallet address looks invalid";
  if (data.minDeposit !== null && data.minDeposit !== undefined) {
    if (isNaN(data.minDeposit) || data.minDeposit < 0) {
      return "Minimum deposit must be a valid number";
    }
  }
  return null;
}

/* ─── Create ───────────────────────────────────────────────────────────── */

export async function adminCreateDepositWallet(data: WalletInput) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const err = validate(data);
  if (err) return { error: err };

  const clean = normalize(data);

  // Prevent duplicate asset+network pairs.
  const dupe = await db.depositWallet.findFirst({
    where: { asset: clean.asset, network: clean.network },
  });
  if (dupe) {
    return {
      error: clean.network
        ? `A wallet for ${clean.asset} on ${clean.network} already exists`
        : `A wallet for ${clean.asset} already exists`,
    };
  }

  try {
    const wallet = await db.depositWallet.create({ data: clean });
    revalidateDepositPaths();
    return { success: true as const, walletId: wallet.id };
  } catch (e) {
    console.error("[adminCreateDepositWallet]", e);
    return { error: e instanceof Error ? e.message : "Failed to create wallet" };
  }
}

/* ─── Update ───────────────────────────────────────────────────────────── */

export async function adminUpdateDepositWallet(id: string, data: WalletInput) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const err = validate(data);
  if (err) return { error: err };

  const clean = normalize(data);

  // Uniqueness check ignoring the current record.
  const dupe = await db.depositWallet.findFirst({
    where: {
      asset:   clean.asset,
      network: clean.network,
      id:      { not: id },
    },
  });
  if (dupe) {
    return {
      error: clean.network
        ? `Another wallet for ${clean.asset} on ${clean.network} already exists`
        : `Another wallet for ${clean.asset} already exists`,
    };
  }

  try {
    await db.depositWallet.update({ where: { id }, data: clean });
    revalidateDepositPaths();
    return { success: true as const };
  } catch (e) {
    console.error("[adminUpdateDepositWallet]", e);
    return { error: e instanceof Error ? e.message : "Failed to update wallet" };
  }
}

/* ─── Toggle active state ──────────────────────────────────────────────── */

export async function adminToggleDepositWallet(id: string) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const existing = await db.depositWallet.findUnique({ where: { id } });
  if (!existing) return { error: "Wallet not found" };

  try {
    await db.depositWallet.update({
      where: { id },
      data:  { isActive: !existing.isActive },
    });
    revalidateDepositPaths();
    return { success: true as const, isActive: !existing.isActive };
  } catch (e) {
    console.error("[adminToggleDepositWallet]", e);
    return { error: e instanceof Error ? e.message : "Failed to toggle wallet" };
  }
}

/* ─── Delete ───────────────────────────────────────────────────────────── */

export async function adminDeleteDepositWallet(id: string) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  try {
    // Don't hard-fail if any DepositRequests still reference this wallet —
    // they have walletId as a plain string, no FK, so deletion is safe.
    await db.depositWallet.delete({ where: { id } });
    revalidateDepositPaths();
    return { success: true as const };
  } catch (e) {
    console.error("[adminDeleteDepositWallet]", e);
    return { error: e instanceof Error ? e.message : "Failed to delete wallet" };
  }
}
