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
  fullName: z.string().optional(),
  phone:    z.string().optional(),
  country:  z.string().optional(),
});

// ─── Register ─────────────────────────────────────────────────────────────────
export async function registerUser(data: {
  name:      string;
  email:     string;
  password:  string;
  fullName?: string;
  phone?:    string;
  country?:  string;
}) {
  try {
    const parsed = registerSchema.safeParse(data);
    if (!parsed.success) {
      return { error: "Invalid input data" };
    }

    const existing = await db.user.findUnique({ where: { email: data.email } });
    if (existing) return { error: "Email already registered" };

    const hashed = await bcrypt.hash(data.password, 12);
    const legal  = data.fullName?.trim() || data.name;

    const user = await db.user.create({
      data: {
        name: data.name,
        email: data.email,
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

    // Welcome notification
    await db.notification.create({
      data: {
        userId: user.id,
        title:   "Welcome to Vaultex Market",
        message: "Your account has been created. Verify your email to unlock full trading features.",
        type:    "INFO",
      },
    });

    // Send email verification OTP
    await sendOtp(user.email, OtpType.REGISTER, user.name ?? undefined);

    return { success: true, pendingVerification: true };
  } catch (error) {
    console.error("Register error:", error);
    return { error: "Registration failed. Please try again." };
  }
}

// ─── Initiate Login (step 1 — validate creds + send OTP) ─────────────────────
export async function initiateLogin(
  data: { email: string; password: string },
): Promise<{ error: string } | { pending: true }> {
  try {
    const user = await db.user.findUnique({
      where:  { email: data.email },
      select: { id: true, email: true, name: true, password: true, status: true, role: true },
    });

    if (!user || !user.password) {
      return { error: "Invalid email or password" };
    }

    const isValid = await bcrypt.compare(data.password, user.password);
    if (!isValid) {
      return { error: "Invalid email or password" };
    }

    if (user.status === "FROZEN" || user.status === "SUSPENDED") {
      return { error: "Account suspended. Contact support." };
    }

    // Send login OTP
    const otpResult = await sendOtp(user.email, OtpType.LOGIN, user.name ?? undefined);
    if ('error' in otpResult) return { error: otpResult.error };

    return { pending: true as const };
  } catch (err) {
    console.error("[initiateLogin]", err);
    return { error: "Sign-in failed. Please try again." };
  }
}

// ─── Complete Login (step 2 — verify OTP + sign in) ──────────────────────────
export async function completeLogin(data: {
  email:    string;
  password: string;
  otp:      string;
}) {
  try {
    // Verify the OTP first
    const otpResult = await verifyOtp(data.email, data.otp, OtpType.LOGIN);
    if ('error' in otpResult) return { error: otpResult.error };

    // Determine redirect target based on role
    const userRecord = await db.user.findUnique({
      where:  { email: data.email },
      select: { role: true },
    });
    const redirectTo = userRecord?.role === "ADMIN" ? "/admin" : "/dashboard";

    // Sign in via NextAuth (re-validates credentials internally)
    await signIn("credentials", {
      email:    data.email,
      password: data.password,
      redirectTo,
    });
  } catch (error: any) {
    if (error?.message?.includes("AccountSuspended")) {
      return { error: "Account suspended. Contact support." };
    }
    if (error?.message === "NEXT_REDIRECT") throw error;
    return { error: "Sign-in failed. Please try again." };
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────
export async function logoutUser() {
  await signOut({ redirectTo: "/" });
}
