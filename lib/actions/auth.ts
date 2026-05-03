"use server";

import { db } from "@/lib/db";
import { signIn, signOut } from "@/auth";
import bcrypt from "bcryptjs";
import { generateWalletAddress } from "@/lib/utils";
import { z } from "zod";
import { sendOtp, verifyOtp } from "@/lib/actions/otp";
import { OtpType } from "@prisma/client";

const registerSchema = z.object({
  name:     z.string().min(2),
  email:    z.string().email(),
  password: z.string().min(8),
  fullName: z
    .string()
    .trim()
    .refine(v => v.split(/\s+/).filter(Boolean).length >= 2, {
      message: "Full name must include first and last name",
    }),
  phone:    z.string().optional(),
  country:  z.string().optional(),
});

// ─── Register ─────────────────────────────────────────────────────────────────
export async function registerUser(data: {
  name:      string;
  email:     string;
  password:  string;
  fullName:  string;
  phone?:    string;
  country?:  string;
}) {
  const tag   = "[registerUser]";
  const email = (data.email ?? "").trim().toLowerCase();

  console.log(`${tag} ── START ──────────────────────────────────────`);
  console.log(`${tag} raw email   : "${data.email}"`);
  console.log(`${tag} clean email : "${email}"`);
  console.log(`${tag} name        : "${data.name}"`);

  try {
    const parsed = registerSchema.safeParse({ ...data, email });
    if (!parsed.success) {
      console.error(`${tag} ❌ Schema validation failed:`, parsed.error.flatten());
      return { error: "Invalid input data" };
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      console.warn(`${tag} ⚠️  Email already registered: ${email}`);
      return { error: "Email already registered" };
    }

    const hashed = await bcrypt.hash(data.password, 12);
    const legal  = data.fullName?.trim() || data.name;

    const user = await db.user.create({
      data: {
        name:  data.name,
        email,
        password: hashed,
        profile: {
          create: {
            firstName: legal.split(" ")[0],
            lastName:  legal.split(" ").slice(1).join(" ") || "",
            phone:     data.phone   || null,
            country:   data.country || null,
          },
        },
        wallets: {
          create: [
            { currency: "USD",  balance: 0, address: generateWalletAddress("USD")  },
            { currency: "BTC",  balance: 0, address: generateWalletAddress("BTC")  },
            { currency: "ETH",  balance: 0, address: generateWalletAddress("ETH")  },
            { currency: "USDT", balance: 0, address: generateWalletAddress("USDT") },
          ],
        },
      },
    });

    console.log(`${tag} ✅ User created: id=${user.id} email=${user.email}`);

    await db.notification.create({
      data: {
        userId:  user.id,
        title:   "Welcome to Vaultex Market",
        message: "Your account has been created. Verify your identity to unlock full trading features.",
        type:    "INFO",
      },
    });

    console.log(`${tag} Sending registration OTP to: ${user.email}`);
    const otpResult = await sendOtp(user.email, OtpType.REGISTER, user.name ?? undefined);

    if ("error" in otpResult) {
      console.error(`${tag} ❌ OTP send failed after registration: ${otpResult.error}`);
      // Account is created — still let the user proceed so they can resend later
    } else {
      console.log(`${tag} ✅ Registration OTP sent to ${user.email}`);
    }

    console.log(`${tag} ── END (success) ──────────────────────────────`);
    return { success: true, pendingVerification: true };

  } catch (error) {
    console.error(`${tag} ❌ Unexpected error:`, error);
    return { error: "Registration failed. Please try again." };
  }
}

// ─── Initiate Login (step 1 — validate creds + send OTP) ─────────────────────
export async function initiateLogin(
  data: { email: string; password: string },
): Promise<{ error: string } | { pending: true }> {
  const tag = "[initiateLogin]";

  // ── Sanitise input ────────────────────────────────────────────────────────
  const email = (data.email ?? "").trim().toLowerCase();

  console.log(`${tag} ── START ──────────────────────────────────────`);
  console.log(`${tag} raw email   : "${data.email}"`);
  console.log(`${tag} clean email : "${email}"`);

  try {
    // ── Look up user ────────────────────────────────────────────────────────
    const user = await db.user.findUnique({
      where:  { email },
      select: { id: true, email: true, name: true, password: true, status: true, role: true },
    });

    if (!user || !user.password) {
      console.warn(`${tag} ❌ User not found or has no password for email="${email}"`);
      return { error: "Invalid email or password" };
    }

    console.log(`${tag} User found  : id=${user.id} role=${user.role} status=${user.status}`);
    console.log(`${tag} DB email    : "${user.email}"`);

    // ── Validate password ───────────────────────────────────────────────────
    const isValid = await bcrypt.compare(data.password, user.password);
    if (!isValid) {
      console.warn(`${tag} ❌ Password mismatch for email="${email}"`);
      return { error: "Invalid email or password" };
    }

    console.log(`${tag} Password valid ✅`);

    // ── Admins bypass OTP — sign in directly ────────────────────────────────
    if (user.role === "ADMIN") {
      console.log(`${tag} Role=ADMIN — bypassing OTP, signing in directly.`);
      await signIn("credentials", {
        email:      user.email,
        password:   data.password,
        redirectTo: "/admin",
      });
      // signIn throws NEXT_REDIRECT — line below never executes
      return { pending: true as const };
    }

    // ── Send OTP BEFORE status check (req #3) ────────────────────────────────
    // Email is dispatched unconditionally at this point.
    // Status is logged and checked AFTER so nothing silently blocks delivery.
    console.log(`${tag} Sending LOGIN OTP to: "${user.email}"`);
    const otpResult = await sendOtp(user.email, OtpType.LOGIN, user.name ?? undefined);

    if ("error" in otpResult) {
      console.error(`${tag} ❌ OTP send failed: ${otpResult.error}`);
      return { error: otpResult.error };
    }

    console.log(`${tag} ✅ OTP dispatched to "${user.email}"`);

    // ── Status check (logged explicitly) ────────────────────────────────────
    console.log(`${tag} Checking account status: ${user.status}`);
    if (user.status === "FROZEN" || user.status === "SUSPENDED") {
      console.warn(`${tag} ⚠️  Account is ${user.status} — blocking login despite OTP being sent.`);
      return { error: "Account suspended. Contact support." };
    }

    console.log(`${tag} ── END (pending OTP) ──────────────────────────`);
    return { pending: true as const };

  } catch (err: any) {
    // Re-throw Next.js redirect so the framework handles navigation
    if (err?.message === "NEXT_REDIRECT") throw err;
    console.error(`${tag} ❌ Unexpected error:`, err);
    return { error: "Sign-in failed. Please try again." };
  }
}

// ─── Complete Login (step 2 — verify OTP + sign in) ──────────────────────────
export async function completeLogin(data: {
  email:    string;
  password: string;
  otp:      string;
}) {
  const tag   = "[completeLogin]";
  const email = (data.email ?? "").trim().toLowerCase();

  console.log(`${tag} ── START ──────────────────────────────────────`);
  console.log(`${tag} email : "${email}"`);
  console.log(`${tag} otp   : "${data.otp}"`);

  try {
    // ── Verify the OTP ──────────────────────────────────────────────────────
    console.log(`${tag} Verifying OTP …`);
    const otpResult = await verifyOtp(email, data.otp, OtpType.LOGIN);

    if ("error" in otpResult) {
      console.warn(`${tag} ❌ OTP verification failed: ${otpResult.error}`);
      return { error: otpResult.error };
    }

    console.log(`${tag} ✅ OTP verified`);

    // ── Determine redirect target ───────────────────────────────────────────
    const userRecord = await db.user.findUnique({
      where:  { email },
      select: { role: true },
    });
    const redirectTo = userRecord?.role === "ADMIN" ? "/admin" : "/dashboard";
    console.log(`${tag} role=${userRecord?.role} → redirectTo=${redirectTo}`);

    // ── Sign in via NextAuth ────────────────────────────────────────────────
    console.log(`${tag} Calling signIn() …`);
    await signIn("credentials", { email, password: data.password, redirectTo });

  } catch (error: any) {
    if (error?.message?.includes("AccountSuspended")) {
      console.warn(`${tag} ⚠️  AccountSuspended thrown by NextAuth`);
      return { error: "Account suspended. Contact support." };
    }
    if (error?.message === "NEXT_REDIRECT") throw error;
    console.error(`${tag} ❌ Unexpected error:`, error);
    return { error: "Sign-in failed. Please try again." };
  }
}

// ─── Post-verification auto sign-in ──────────────────────────────────────────

/**
 * Called from the verify page immediately after a successful REGISTER OTP
 * check. Signs the user in via NextAuth using the credentials the register
 * page stashed in sessionStorage, then redirects to /dashboard.
 *
 * Throws Next.js's internal NEXT_REDIRECT on success (signIn handles the
 * navigation). Returns `{ error }` only if credentials are missing/wrong,
 * in which case the caller falls back to /login with a success-but-sign-in
 * required toast.
 */
export async function signInAfterRegister(data: {
  email:    string;
  password: string;
}) {
  const tag   = "[signInAfterRegister]";
  const email = (data.email ?? "").trim().toLowerCase();

  console.log(`${tag} ── START ─ email: "${email}"`);

  try {
    const user = await db.user.findUnique({
      where:  { email },
      select: { role: true },
    });
    const redirectTo = user?.role === "ADMIN" ? "/admin" : "/dashboard";

    await signIn("credentials", {
      email,
      password: data.password,
      redirectTo,
    });
    // signIn throws NEXT_REDIRECT on success — line below never runs.
    return { pending: true as const };

  } catch (err: any) {
    if (err?.message === "NEXT_REDIRECT") throw err;
    if (err?.message?.includes("AccountSuspended")) {
      return { error: "Account suspended. Contact support." };
    }
    console.error(`${tag} ❌ auto sign-in failed:`, err);
    return { error: "Auto sign-in failed. Please sign in to continue." };
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────
export async function logoutUser() {
  await signOut({ redirectTo: "/" });
}
