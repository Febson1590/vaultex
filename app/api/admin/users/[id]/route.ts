import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const user = await db.user.findUnique({
      where: { id },
      include: {
        profile: true,
        wallets: true,
        verifications: { orderBy: { submittedAt: "desc" }, take: 1 },
        transactions: { orderBy: { createdAt: "desc" }, take: 10 },
        depositRequests: { orderBy: { createdAt: "desc" }, take: 5 },
        withdrawalRequests: { orderBy: { createdAt: "desc" }, take: 5 },
        investment: true,
        copyTrades: {
          orderBy: { startedAt: "desc" },
          include: { trader: { select: { avatarUrl: true } } },
        },
        targetActions: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { admin: { select: { name: true, email: true } } },
        },
      },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json(user);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[GET /api/admin/users/${id}] Query failed:`, message);
    return NextResponse.json(
      { error: `Failed to load user data. This may be a database schema sync issue. Details: ${message}` },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Prevent self-deletion
  if (session.user.id === id) {
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
  }

  const target = await db.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (target.role === "ADMIN") {
    return NextResponse.json({ error: "Admin accounts cannot be deleted" }, { status: 403 });
  }

  try {
    // AdminActionLog has no onDelete cascade — null out targetId first to avoid FK error
    await db.adminActionLog.updateMany({ where: { targetId: id }, data: { targetId: null } });

    // Delete user — all other relations have onDelete: Cascade and will be removed automatically
    await db.user.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[DELETE /api/admin/users/:id]", err);
    return NextResponse.json({ error: err?.message ?? "Deletion failed" }, { status: 500 });
  }
}
