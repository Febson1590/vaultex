import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await db.user.findMany({
    where: { role: "USER" },
    select: { id: true, name: true, email: true, status: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}
