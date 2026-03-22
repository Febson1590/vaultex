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
