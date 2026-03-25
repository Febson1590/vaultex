"use server";

import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { OtpType } from "@prisma/client";

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ─── Send OTP ─────────────────────────────────────────────────────────────────
export async function sendOtp(
  email: string,
  type: OtpType,
  name?: string,
): Promise<{ error: string } | { success: true }> {
  try {
    // Invalidate any existing unused codes of this type for this email
    await db.otpCode.updateMany({
      where: { identifier: email, type, used: false },
      data:  { used: true },
    });

    const code    = generateCode();
    const expires = new Date(Date.now() + OTP_EXPIRY_MS);

    await db.otpCode.create({
      data: { identifier: email, code, type, expires },
    });

    await sendVerificationEmail({
      to:   email,
      name: name || email.split("@")[0],
      code,
      type,
    });

    return { success: true };
  } catch (err) {
    console.error("[sendOtp]", err);
    return { error: "Failed to send verification email. Please try again." };
  }
}

// ─── Verify OTP ───────────────────────────────────────────────────────────────
export async function verifyOtp(
  email: string,
  code:  string,
  type:  OtpType,
): Promise<{ error: string } | { success: true }> {
  try {
    const record = await db.otpCode.findFirst({
      where: {
        identifier: email,
        code,
        type,
        used:    false,
        expires: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      return { error: "Invalid or expired verification code." };
    }

    // Mark as used
    await db.otpCode.update({
      where: { id: record.id },
      data:  { used: true },
    });

    // If this was a registration OTP, mark the user's emailVerified timestamp
    if (type === OtpType.REGISTER) {
      await db.user.updateMany({
        where: { email, emailVerified: null },
        data:  { emailVerified: new Date() },
      });
    }

    return { success: true };
  } catch (err) {
    console.error("[verifyOtp]", err);
    return { error: "Verification failed. Please try again." };
  }
}
