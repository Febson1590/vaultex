import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function genAddr(currency: string): string {
  const prefixes: Record<string, string> = { BTC: "1", ETH: "0x", USDT: "0x", USD: "VAULT-" };
  const prefix = prefixes[currency] || "";
  const chars = "abcdef0123456789";
  let address = prefix;
  for (let i = 0; i < 34; i++) address += chars[Math.floor(Math.random() * chars.length)];
  return address;
}

async function main() {
  console.log("🌱 Seeding Vaultex database...");

  // ── Market Assets ──────────────────────────────────────────
  const assetData = [
    { symbol: "BTC", name: "Bitcoin", currentPrice: 67482.50, priceChange24h: 2.34, marketCap: 1328000000000, volume24h: 28400000000, circulatingSupply: 19700000, rank: 1, description: "The first and most recognized cryptocurrency, often called digital gold." },
    { symbol: "ETH", name: "Ethereum", currentPrice: 3521.80, priceChange24h: 1.87, marketCap: 423000000000, volume24h: 14200000000, circulatingSupply: 120200000, rank: 2, description: "A decentralized platform enabling smart contracts and dApps." },
    { symbol: "USDT", name: "Tether", currentPrice: 1.00, priceChange24h: 0.01, marketCap: 95000000000, volume24h: 62000000000, circulatingSupply: 95000000000, rank: 3, description: "A stablecoin pegged to the US Dollar." },
    { symbol: "BNB", name: "BNB", currentPrice: 412.30, priceChange24h: -0.85, marketCap: 61000000000, volume24h: 1800000000, circulatingSupply: 148000000, rank: 4, description: "Native cryptocurrency of the Binance ecosystem." },
    { symbol: "SOL", name: "Solana", currentPrice: 178.45, priceChange24h: 3.21, marketCap: 82000000000, volume24h: 4200000000, circulatingSupply: 460000000, rank: 5, description: "A high-performance blockchain for fast, low-cost transactions." },
    { symbol: "XRP", name: "XRP", currentPrice: 0.6234, priceChange24h: -1.12, marketCap: 34000000000, volume24h: 1200000000, circulatingSupply: 54600000000, rank: 6, description: "Digital asset for global payments and financial institutions." },
    { symbol: "ADA", name: "Cardano", currentPrice: 0.4821, priceChange24h: 1.45, marketCap: 17000000000, volume24h: 580000000, circulatingSupply: 35300000000, rank: 7, description: "Proof-of-stake blockchain focused on security and sustainability." },
    { symbol: "AVAX", name: "Avalanche", currentPrice: 38.92, priceChange24h: 2.67, marketCap: 16000000000, volume24h: 690000000, circulatingSupply: 411000000, rank: 8, description: "Fast, low-cost, and eco-friendly blockchain platform." },
  ];

  const assets = await Promise.all(
    assetData.map((a) =>
      prisma.marketAsset.upsert({ where: { symbol: a.symbol }, update: { currentPrice: a.currentPrice, priceChange24h: a.priceChange24h }, create: a })
    )
  );
  console.log(`✅ ${assets.length} market assets`);

  // ── Admin ──────────────────────────────────────────────────
  const adminPwd = await bcrypt.hash("Admin@123456", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@vaultexmarket.com" },
    update: {},
    create: {
      email: "admin@vaultexmarket.com",
      name: "Vaultex Admin",
      password: adminPwd,
      role: "ADMIN",
      status: "ACTIVE",
      profile: { create: { firstName: "Vaultex", lastName: "Admin", country: "United States" } },
      wallets: { create: [
        { currency: "USD", balance: 1000000, address: genAddr("USD") },
        { currency: "BTC", balance: 10, address: genAddr("BTC") },
        { currency: "ETH", balance: 100, address: genAddr("ETH") },
        { currency: "USDT", balance: 500000, address: genAddr("USDT") },
      ]},
    },
  });
  console.log(`✅ Admin: ${admin.email}`);

  // ── Demo User 1 — Active Verified ─────────────────────────
  const u1pwd = await bcrypt.hash("Demo@123456", 12);
  const user1 = await prisma.user.upsert({
    where: { email: "james.carter@example.com" },
    update: {},
    create: {
      email: "james.carter@example.com",
      name: "James Carter",
      password: u1pwd,
      role: "USER",
      status: "ACTIVE",
      profile: { create: { firstName: "James", lastName: "Carter", phone: "+1 (555) 234-5678", country: "United States", address: "742 Evergreen Terrace", city: "Springfield", zipCode: "62701", dateOfBirth: new Date("1988-04-15") } },
      wallets: { create: [
        { currency: "USD", balance: 24580.42, address: genAddr("USD") },
        { currency: "BTC", balance: 0.4582, address: genAddr("BTC") },
        { currency: "ETH", balance: 3.821, address: genAddr("ETH") },
        { currency: "USDT", balance: 8200.00, address: genAddr("USDT") },
      ]},
    },
  });

  await prisma.verification.upsert({
    where: { id: "ver-james-001" },
    update: {},
    create: { id: "ver-james-001", userId: user1.id, type: "IDENTITY", status: "APPROVED", documentType: "Passport", reviewedAt: new Date("2024-11-10"), submittedAt: new Date("2024-11-09") },
  });

  const btc = assets.find((a) => a.symbol === "BTC")!;
  const eth = assets.find((a) => a.symbol === "ETH")!;
  const sol = assets.find((a) => a.symbol === "SOL")!;

  await Promise.all([
    prisma.assetHolding.upsert({ where: { userId_assetId: { userId: user1.id, assetId: btc.id } }, update: {}, create: { userId: user1.id, assetId: btc.id, quantity: 0.4582, avgBuyPrice: 58000, totalInvested: 26575.6 } }),
    prisma.assetHolding.upsert({ where: { userId_assetId: { userId: user1.id, assetId: eth.id } }, update: {}, create: { userId: user1.id, assetId: eth.id, quantity: 3.821, avgBuyPrice: 2800, totalInvested: 10698.8 } }),
    prisma.assetHolding.upsert({ where: { userId_assetId: { userId: user1.id, assetId: sol.id } }, update: {}, create: { userId: user1.id, assetId: sol.id, quantity: 45.5, avgBuyPrice: 120, totalInvested: 5460 } }),
  ]);

  const txDates = [
    new Date("2024-10-01"), new Date("2024-10-05"), new Date("2024-10-12"),
    new Date("2024-11-02"), new Date("2024-11-15"), new Date("2024-11-20"),
    new Date("2024-12-01"), new Date("2024-12-10"), new Date("2025-01-08"), new Date("2025-01-15"),
  ];
  const txData = [
    { type: "DEPOSIT", currency: "USD", amount: 50000, description: "Bank transfer deposit", status: "COMPLETED" },
    { type: "BUY", currency: "BTC", amount: 0.25, description: "Buy 0.25 BTC @ $58,200", status: "COMPLETED" },
    { type: "BUY", currency: "ETH", amount: 2.0, description: "Buy 2.0 ETH @ $2,750", status: "COMPLETED" },
    { type: "BUY", currency: "BTC", amount: 0.2082, description: "Buy 0.2082 BTC @ $57,800", status: "COMPLETED" },
    { type: "DEPOSIT", currency: "USD", amount: 10000, description: "Wire transfer deposit", status: "COMPLETED" },
    { type: "BUY", currency: "ETH", amount: 1.821, description: "Buy 1.821 ETH @ $2,900", status: "COMPLETED" },
    { type: "BUY", currency: "SOL", amount: 45.5, description: "Buy 45.5 SOL @ $120", status: "COMPLETED" },
    { type: "WITHDRAWAL", currency: "USD", amount: 5000, description: "Bank withdrawal", status: "COMPLETED" },
    { type: "SELL", currency: "ETH", amount: 0.5, description: "Sell 0.5 ETH @ $3,400", status: "COMPLETED" },
    { type: "BONUS", currency: "USD", amount: 250, description: "Referral bonus", status: "COMPLETED" },
  ];
  for (let i = 0; i < txData.length; i++) {
    await prisma.transaction.create({ data: { userId: user1.id, ...(txData[i] as any), createdAt: txDates[i] } });
  }

  await prisma.watchlistItem.upsert({ where: { userId_assetId: { userId: user1.id, assetId: btc.id } }, update: {}, create: { userId: user1.id, assetId: btc.id } });
  await prisma.watchlistItem.upsert({ where: { userId_assetId: { userId: user1.id, assetId: eth.id } }, update: {}, create: { userId: user1.id, assetId: eth.id } });

  await prisma.depositRequest.create({ data: { userId: user1.id, currency: "USD", amount: 15000, method: "Wire Transfer", status: "PENDING" } });
  await prisma.withdrawalRequest.create({ data: { userId: user1.id, currency: "USD", amount: 3000, method: "Bank Transfer", destination: "Chase Bank ****4521", status: "PENDING" } });

  console.log(`✅ Demo User 1: ${user1.email}`);

  // ── Demo User 2 — New, Pending KYC ────────────────────────
  const u2pwd = await bcrypt.hash("Demo@123456", 12);
  const user2 = await prisma.user.upsert({
    where: { email: "sarah.mitchell@example.com" },
    update: {},
    create: {
      email: "sarah.mitchell@example.com",
      name: "Sarah Mitchell",
      password: u2pwd,
      role: "USER",
      status: "ACTIVE",
      profile: { create: { firstName: "Sarah", lastName: "Mitchell", phone: "+44 7700 900123", country: "United Kingdom", city: "London" } },
      wallets: { create: [
        { currency: "USD", balance: 5000.00, address: genAddr("USD") },
        { currency: "BTC", balance: 0, address: genAddr("BTC") },
        { currency: "ETH", balance: 0, address: genAddr("ETH") },
        { currency: "USDT", balance: 0, address: genAddr("USDT") },
      ]},
    },
  });

  await prisma.verification.upsert({
    where: { id: "ver-sarah-001" },
    update: {},
    create: { id: "ver-sarah-001", userId: user2.id, type: "IDENTITY", status: "PENDING", documentType: "Driver's License", submittedAt: new Date() },
  });

  await prisma.depositRequest.create({ data: { userId: user2.id, currency: "USD", amount: 5000, method: "Bank Transfer", status: "APPROVED", processedAt: new Date() } });
  await prisma.transaction.create({ data: { userId: user2.id, type: "DEPOSIT", currency: "USD", amount: 5000, status: "COMPLETED", description: "Initial deposit" } });

  const ticket = await prisma.supportTicket.create({
    data: { userId: user2.id, subject: "How do I complete identity verification?", category: "Verification", status: "IN_PROGRESS", priority: "MEDIUM" },
  });
  await prisma.supportMessage.create({ data: { ticketId: ticket.id, senderId: user2.id, senderRole: "USER", content: "I submitted my driver's license but I'm not sure what the next steps are. How long does the process take?" } });
  await prisma.supportMessage.create({ data: { ticketId: ticket.id, senderId: admin.id, senderRole: "ADMIN", content: "Hello Sarah! Our compliance team reviews submissions within 1–3 business days. You'll receive a notification once complete. You can still deposit funds and browse the platform in the meantime." } });

  console.log(`✅ Demo User 2: ${user2.email}`);

  // ── Demo User 3 — Restricted ───────────────────────────────
  const u3pwd = await bcrypt.hash("Demo@123456", 12);
  const user3 = await prisma.user.upsert({
    where: { email: "michael.chen@example.com" },
    update: {},
    create: {
      email: "michael.chen@example.com",
      name: "Michael Chen",
      password: u3pwd,
      role: "USER",
      status: "RESTRICTED",
      profile: { create: { firstName: "Michael", lastName: "Chen", country: "Canada", city: "Toronto" } },
      wallets: { create: [
        { currency: "USD", balance: 12000, address: genAddr("USD") },
        { currency: "BTC", balance: 0.15, address: genAddr("BTC") },
        { currency: "ETH", balance: 2.0, address: genAddr("ETH") },
        { currency: "USDT", balance: 3000, address: genAddr("USDT") },
      ]},
    },
  });
  console.log(`✅ Demo User 3: ${user3.email}`);

  // ── Notifications ──────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      { userId: user1.id, title: "Welcome to Vaultex Market", message: "Your account has been created.", type: "INFO", isRead: true },
      { userId: user1.id, title: "Identity Verified", message: "Your identity verification has been approved. Full trading access unlocked.", type: "SUCCESS", isRead: true },
      { userId: user1.id, title: "Deposit Approved", message: "Your deposit of $50,000 USD has been credited.", type: "DEPOSIT", isRead: true },
      { userId: user1.id, title: "BUY Order Filled", message: "BUY 0.25 BTC @ $58,200 executed successfully.", type: "TRADE", isRead: false },
      { userId: user1.id, title: "Deposit Pending Review", message: "Your wire transfer of $15,000 is under review.", type: "DEPOSIT", isRead: false },
      { userId: user2.id, title: "Welcome to Vaultex Market", message: "Complete verification to unlock all features.", type: "INFO", isRead: false },
      { userId: user2.id, title: "Deposit Approved", message: "Your deposit of $5,000 USD has been approved.", type: "DEPOSIT", isRead: true },
    ],
  });

  // ── Investment Plans ───────────────────────────────────────
  // Canonical defaults shown on the Investments page, editable from admin.
  // Durations are now expressed in HOURS (admin requested change from days).
  // Upsert by name so re-running the seed is idempotent.
  const planDefaults = [
    {
      name:             "Growth Plan",
      description:      "Best for new investors getting started.",
      minAmount:        500,
      maxAmount:        4999,
      minProfit:        0.5,
      maxProfit:        1.0,
      minDurationHours: 30,
      maxDurationHours: 50,
      profitInterval:   60,
      maxInterval:      60,
      lossRatio:        0.10,   // ~1 in 10 ticks is a loss
      minLoss:          0.10,   // losses are small — 0.10%–0.30%
      maxLoss:          0.30,
      isPopular:        true,
      isActive:         true,
    },
    {
      name:             "Balanced Plan",
      description:      "A mid-tier plan for steady growth at higher capital.",
      minAmount:        5000,
      maxAmount:        19999,
      minProfit:        0.8,
      maxProfit:        1.3,
      minDurationHours: 25,
      maxDurationHours: 45,
      profitInterval:   60,
      maxInterval:      60,
      lossRatio:        0.15,   // ~1.5 in 10 ticks is a loss
      minLoss:          0.15,
      maxLoss:          0.40,
      isPopular:        false,
      isActive:         true,
    },
    {
      name:             "Elite Plan",
      description:      "Highest-tier allocation with the strongest return band.",
      minAmount:        20000,
      maxAmount:        100000,
      minProfit:        1.0,
      maxProfit:        1.5,
      minDurationHours: 20,
      maxDurationHours: 45,
      profitInterval:   60,
      maxInterval:      60,
      lossRatio:        0.20,   // higher-tier = more volatility (~2 in 10)
      minLoss:          0.20,
      maxLoss:          0.60,
      isPopular:        false,
      isActive:         true,
    },
  ] as const;

  // Only one plan may carry the "Most Popular" badge. Clear any existing
  // flags first so the seed-defined popular plan is the single source of truth.
  await prisma.investmentPlan.updateMany({ where: { isPopular: true }, data: { isPopular: false } });

  for (const p of planDefaults) {
    const existing = await prisma.investmentPlan.findFirst({ where: { name: p.name } });
    if (existing) {
      await prisma.investmentPlan.update({ where: { id: existing.id }, data: p });
    } else {
      await prisma.investmentPlan.create({ data: p });
    }
  }
  console.log(`✅ ${planDefaults.length} investment plans`);

  // ── Site Config ────────────────────────────────────────────
  const configs = [
    { key: "site.maintenance", value: "false" },
    { key: "trading.enabled", value: "true" },
    { key: "deposits.enabled", value: "true" },
    { key: "withdrawals.enabled", value: "true" },
    { key: "kyc.required", value: "true" },
    { key: "platform.fee", value: "0.001" },
  ];
  for (const c of configs) {
    await prisma.siteConfig.upsert({ where: { key: c.key }, update: { value: c.value }, create: c });
  }

  console.log("\n🎉 Seed complete!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔐 Admin:  admin@vaultexmarket.com  /  Admin@123456");
  console.log("👤 User 1: james.carter@example.com  /  Demo@123456  (Active, Verified)");
  console.log("👤 User 2: sarah.mitchell@example.com / Demo@123456  (Pending KYC)");
  console.log("👤 User 3: michael.chen@example.com  /  Demo@123456  (Restricted)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
