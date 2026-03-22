"use server";

import { db } from "@/lib/db";
import { signIn, signOut } from "@/auth";
import bcrypt from "bcryptjs";
import { generateWalletAddress } from "@/lib/utils";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
}) {
  try {
    const parsed = registerSchema.safeParse(data);
    if (!parsed.success) {
      return { error: "Invalid input data" };
    }

    const existing = await db.user.findUnique({ where: { email: data.email } });
    if (existing) return { error: "Email already registered" };

    const hashed = await bcrypt.hash(data.password, 12);

    const user = await db.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashed,
        profile: {
          create: {
            firstName: data.name.split(" ")[0],
            lastName: data.name.split(" ").slice(1).join(" ") || "",
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
    await signIn("credentials", { ...data, redirectTo: "/dashboard" });
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
