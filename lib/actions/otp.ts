"use server";

import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { OtpType } from "@prisma/client";

const OTP_EXPIRY_MS  = 10 * 60 * 1000; // 10 minutes
const EMAIL_REGEX    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ─── Send OTP ─────────────────────────────────────────────────────────────────
export async function sendOtp(
  rawEmail: string,
  type: OtpType,
  name?: string,
): Promise<{ error: string } | { success: true }> {
  const tag = "[sendOtp]";

  // ── 1. Sanitise & validate email ──────────────────────────────────────────
  const email = (rawEmail ?? "").trim().toLowerCase();
  console.log(`${tag} ── START ──────────────────────────────────────`);
  console.log(`${tag} raw email input : "${rawEmail}"`);
  console.log(`${tag} sanitised email : "${email}"`);
  console.log(`${tag} OTP type        : ${type}`);
  console.log(`${tag} name            : ${name ?? "(none provided)"}`);

  if (!email) {
    console.error(`${tag} ❌ Email is empty after sanitising. Aborting.`);
    return { error: "Email address is required." };
  }

  if (!EMAIL_REGEX.test(email)) {
    console.error(`${tag} ❌ Email failed format check: "${email}". Aborting.`);
    return { error: "Email address format is invalid." };
  }

  // ── 2. Rate-limit visibility — log last sent timestamp ────────────────────
  try {
    const lastCode = await db.otpCode.findFirst({
      where:   { identifier: email, type },
      orderBy: { createdAt: "desc" },
    });

    if (lastCode) {
      const ageMs      = Date.now() - lastCode.createdAt.getTime();
      const ageSec     = Math.round(ageMs / 1000);
      const expiresIn  = Math.round((lastCode.expires.getTime() - Date.now()) / 1000);
      console.log(`${tag} Last OTP record  : id=${lastCode.id}`);
      console.log(`${tag}   createdAt      : ${lastCode.createdAt.toISOString()} (${ageSec}s ago)`);
      console.log(`${tag}   used           : ${lastCode.used}`);
      console.log(`${tag}   expires        : ${lastCode.expires.toISOString()} (${expiresIn}s remaining)`);

      if (ageSec < 30) {
        console.warn(`${tag} ⚠️  OTP requested only ${ageSec}s after last one — potential rapid resend.`);
      }
    } else {
      console.log(`${tag} No previous OTP record found for this email+type.`);
    }
  } catch (rateErr) {
    // Non-fatal — just log and continue
    console.warn(`${tag} ⚠️  Could not query last OTP record:`, rateErr);
  }

  // ── 3. Invalidate existing unused codes ───────────────────────────────────
  try {
    const invalidated = await db.otpCode.updateMany({
      where: { identifier: email, type, used: false },
      data:  { used: true },
    });
    console.log(`${tag} Invalidated ${invalidated.count} existing unused code(s).`);
  } catch (invalidateErr) {
    console.error(`${tag} ❌ Failed to invalidate old codes:`, invalidateErr);
    return { error: "Database error while preparing OTP. Please try again." };
  }

  // ── 4. Generate & persist new code ────────────────────────────────────────
  const code    = generateCode();
  const expires = new Date(Date.now() + OTP_EXPIRY_MS);

  console.log(`${tag} Generated code   : ${code}`);
  console.log(`${tag} Expires at       : ${expires.toISOString()}`);

  try {
    const record = await db.otpCode.create({
      data: { identifier: email, code, type, expires },
    });
    console.log(`${tag} OTP record saved : id=${record.id}`);
  } catch (dbErr) {
    console.error(`${tag} ❌ Failed to save OTP record:`, dbErr);
    return { error: "Database error while saving OTP. Please try again." };
  }

  // ── 5. Send email — do NOT swallow provider errors ────────────────────────
  const displayName = name || email.split("@")[0];
  console.log(`${tag} Sending email to : "${email}" (display name: "${displayName}")`);

  try {
    const messageId = await sendVerificationEmail({
      to:   email,
      name: displayName,
      code,
      type,
    });

    console.log(`${tag} ✅ Email sent successfully.`);
    console.log(`${tag}   Provider message id : ${messageId}`);
    console.log(`${tag} ── END (success) ──────────────────────────────`);
    return { success: true };

  } catch (emailErr: any) {
    console.error(`${tag} ❌ EMAIL SEND FAILED ──────────────────────────`);
    console.error(`${tag} email     : ${email}`);
    console.error(`${tag} error msg : ${emailErr?.message ?? "(no message)"}`);
    console.error(`${tag} full err  :`, emailErr);
    console.log(`${tag} ── END (failure) ──────────────────────────────`);
    return {
      error: `Failed to send verification email: ${emailErr?.message ?? "Unknown provider error"}`,
    };
  }
}

// ─── Verify OTP ───────────────────────────────────────────────────────────────
export async function verifyOtp(
  rawEmail: string,
  code:     string,
  type:     OtpType,
): Promise<{ error: string } | { success: true }> {
  const tag   = "[verifyOtp]";
  const email = (rawEmail ?? "").trim().toLowerCase();

  console.log(`${tag} Verifying OTP for email="${email}" type=${type} code="${code}"`);

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
      // Help debug whether it's expired, already-used, or never existed
      const anyRecord = await db.otpCode.findFirst({
        where:   { identifier: email, type },
        orderBy: { createdAt: "desc" },
      });

      if (!anyRecord) {
        console.warn(`${tag} ❌ No OTP record found at all for email="${email}" type=${type}`);
      } else {
        console.warn(`${tag} ❌ OTP mismatch or invalid. Latest record:`);
        console.warn(`${tag}   id      : ${anyRecord.id}`);
        console.warn(`${tag}   used    : ${anyRecord.used}`);
        console.warn(`${tag}   expires : ${anyRecord.expires.toISOString()} (now: ${new Date().toISOString()})`);
        console.warn(`${tag}   code    : ${anyRecord.code} (submitted: ${code})`);
      }

      return { error: "Invalid or expired verification code." };
    }

    console.log(`${tag} ✅ OTP matched. Marking as used. id=${record.id}`);

    await db.otpCode.update({
      where: { id: record.id },
      data:  { used: true },
    });

    // Mark email as verified for registration OTPs
    if (type === OtpType.REGISTER) {
      await db.user.updateMany({
        where: { email, emailVerified: null },
        data:  { emailVerified: new Date() },
      });
      console.log(`${tag} emailVerified set for ${email}`);
    }

    return { success: true };
  } catch (err) {
    console.error(`${tag} ❌ Unexpected error:`, err);
    return { error: "Verification failed. Please try again." };
  }
}

// ─── Manual test function (req #5) ────────────────────────────────────────────
// Call this from a server action or API route to confirm the email pipeline works.
// Change TEST_EMAIL to any inbox you can access.
export async function testSendEmail(): Promise<{ success: boolean; message: string }> {
  const tag        = "[testSendEmail]";
  const TEST_EMAIL = "james.carter@example.com"; // ← change to your real inbox

  console.log(`${tag} ── MANUAL EMAIL TEST ──────────────────────────`);
  console.log(`${tag} Sending test OTP to: ${TEST_EMAIL}`);

  try {
    const messageId = await sendVerificationEmail({
      to:   TEST_EMAIL,
      name: "Test User",
      code: "123456",
      type: "LOGIN",
    });

    const msg = `✅ Test email sent. Resend message id: ${messageId}`;
    console.log(`${tag} ${msg}`);
    console.log(`${tag} ── END TEST ────────────────────────────────────`);
    return { success: true, message: msg };

  } catch (err: any) {
    const msg = `❌ Test email FAILED: ${err?.message ?? "Unknown error"}`;
    console.error(`${tag} ${msg}`);
    console.error(`${tag} Full error:`, err);
    console.log(`${tag} ── END TEST ────────────────────────────────────`);
    return { success: false, message: msg };
  }
}
