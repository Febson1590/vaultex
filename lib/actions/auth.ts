"use server";

import { db } from "@/lib/db";
import { signIn, signOut } from "@/auth";
import bcrypt from "bcryptjs";
import { generateWalletAddress } from "@/lib/utils";
import { z } from "zod";

const registerSchema = z.object({
  name:     z.string().min(2),
  email:    z.string().email(),
  password: z.string().min(8),
  fullName: z.string().optional(),
  phone:    z.string().optional(),
  country:  z.string().optional(),
});

export async function registerUser(data: {
  name:      string;           // trading username / display name
  email:     string;
  password:  string;
  fullName?: string;           // full legal name → profile
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
            { currency: "USD", balance: 0, address: generateWalletAddress("USD") },
            { currency: "BTC", balance: 0, address: generateWalletAddress("BTC") },
            { currency: "ETH", balance: 0, address: generateWalletAddress("ETH") },
            { currency: "USDT", balance: 0, address: generateWalletAddress("USDT") },
          ],
        },
      },
    });

    // Welcome notification
    await db.notification.create({
      data: {
        userId: user.id,
        title: "Welcome to Vaultex Market",
        message: "Your account has been created. Complete verification to unlock full trading features.",
        type: "INFO",
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Register error:", error);
    return { error: "Registration failed. Please try again." };
  }
}

export async function loginUser(data: { email: string; password: string }) {
  try {
    // Look up the user's role so admins land on /admin after login.
    // This is done before signIn — if credentials are wrong, signIn will
    // throw and we return an error, so the redirectTo is never used.
    const userRecord = await db.user.findUnique({
      where:  { email: data.email },
      select: { role: true },
    });
    const redirectTo = userRecord?.role === "ADMIN" ? "/admin" : "/dashboard";

    await signIn("credentials", { ...data, redirectTo });
  } catch (error: any) {
    if (error?.message?.includes("AccountSuspended")) {
      return { error: "Account suspended. Contact support." };
    }
    if (error?.message === "NEXT_REDIRECT") throw error;
    return { error: "Invalid email or password" };
  }
}

export async function logoutUser() {
  await signOut({ redirectTo: "/" });
}
