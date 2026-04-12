import "server-only";
import { db } from "@/lib/db";

export interface FinancialLimits {
  minDeposit: number;
  maxDeposit: number | null;
  minWithdrawal: number;
  maxWithdrawal: number | null;
  withdrawalFeePercent: number;
  withdrawalFeeFixed: number;
  processingTimeText: string;
}

const DEFAULTS: FinancialLimits = {
  minDeposit: 10,
  maxDeposit: null,
  minWithdrawal: 10,
  maxWithdrawal: null,
  withdrawalFeePercent: 0,
  withdrawalFeeFixed: 0,
  processingTimeText: "1\u20133 business days",
};

export async function getFinancialLimits(): Promise<FinancialLimits> {
  const configs = await db.siteConfig.findMany({
    where: { key: { startsWith: "limit." } },
  });
  const map = Object.fromEntries(configs.map((c) => [c.key, c.value]));

  return {
    minDeposit:
      parseFloat(map["limit.minDeposit"] ?? "") || DEFAULTS.minDeposit,
    maxDeposit: map["limit.maxDeposit"]
      ? parseFloat(map["limit.maxDeposit"])
      : DEFAULTS.maxDeposit,
    minWithdrawal:
      parseFloat(map["limit.minWithdrawal"] ?? "") || DEFAULTS.minWithdrawal,
    maxWithdrawal: map["limit.maxWithdrawal"]
      ? parseFloat(map["limit.maxWithdrawal"])
      : DEFAULTS.maxWithdrawal,
    withdrawalFeePercent:
      parseFloat(map["limit.withdrawalFeePercent"] ?? "") ||
      DEFAULTS.withdrawalFeePercent,
    withdrawalFeeFixed:
      parseFloat(map["limit.withdrawalFeeFixed"] ?? "") ||
      DEFAULTS.withdrawalFeeFixed,
    processingTimeText:
      map["limit.processingTimeText"] || DEFAULTS.processingTimeText,
  };
}

export async function updateFinancialLimits(limits: Partial<FinancialLimits>) {
  const entries = Object.entries(limits).filter(([, v]) => v !== undefined);
  await Promise.all(
    entries.map(([key, value]) =>
      db.siteConfig.upsert({
        where: { key: `limit.${key}` },
        create: { key: `limit.${key}`, value: String(value ?? "") },
        update: { value: String(value ?? "") },
      })
    )
  );
}
