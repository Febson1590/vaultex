import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const verification = await db.verification.findFirst({
    where: { userId: session.user.id },
    orderBy: { submittedAt: "desc" },
  });

  if (!verification) return NextResponse.json({ status: null });
  return NextResponse.json({ status: verification.status, notes: verification.notes });
}
