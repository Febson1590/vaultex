import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const [verification, profile, user] = await Promise.all([
    db.verification.findFirst({
      where: { userId },
      orderBy: { submittedAt: "desc" },
    }),
    db.profile.findUnique({ where: { userId } }),
    db.user.findUnique({ where: { id: userId }, select: { name: true } }),
  ]);

  // Build prefill data from profile, falling back to splitting the
  // user.name field (set during registration) so the KYC form never
  // starts with empty name fields if we already have the data.
  let firstName = profile?.firstName ?? "";
  let lastName  = profile?.lastName  ?? "";
  if (!firstName && !lastName && user?.name) {
    const parts = user.name.trim().split(/\s+/);
    firstName = parts[0] ?? "";
    lastName  = parts.slice(1).join(" ");
  }

  const dateOfBirth = profile?.dateOfBirth
    ? profile.dateOfBirth.toISOString().slice(0, 10) // "YYYY-MM-DD"
    : "";

  return NextResponse.json({
    status:      verification?.status ?? null,
    notes:       verification?.notes  ?? null,
    firstName,
    lastName,
    dateOfBirth,
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await request.json().catch(() => ({}));
  const { documentType, frontUrl, firstName, lastName, dateOfBirth } = body;

  if (!documentType) {
    return NextResponse.json({ error: "Document type is required" }, { status: 400 });
  }

  // Block resubmission if already pending/approved
  const existing = await db.verification.findFirst({
    where: { userId, status: { in: ["PENDING", "UNDER_REVIEW", "APPROVED"] } },
  });
  if (existing) {
    return NextResponse.json({ error: "Verification already submitted or approved" }, { status: 409 });
  }

  // Save / update profile personal details if provided
  if (firstName || lastName || dateOfBirth) {
    await db.profile.upsert({
      where: { userId },
      create: {
        userId,
        firstName:   firstName   || null,
        lastName:    lastName    || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      },
      update: {
        ...(firstName   && { firstName }),
        ...(lastName    && { lastName }),
        ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
      },
    });
  }

  // Create the verification record
  const verification = await db.verification.create({
    data: {
      userId,
      type:         "IDENTITY",
      status:       "PENDING",
      documentType,
      frontUrl:     frontUrl || null,
    },
  });

  // Notify user their submission was received
  await db.notification.create({
    data: {
      userId,
      title:   "KYC Submitted",
      message: "Your identity verification has been submitted and is under review. We'll notify you within 1–3 business days.",
      type:    "VERIFICATION",
    },
  });

  return NextResponse.json({ success: true, status: verification.status });
}
