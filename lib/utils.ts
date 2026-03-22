import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number | string,
  currency: string = "USD",
  decimals: number = 2
): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "$0.00";

  if (currency === "USD" || currency === "USDT") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  }

  return `${num.toFixed(8)} ${currency}`;
}

export function formatNumber(num: number | string, decimals: number = 2): string {
  const n = typeof num === "string" ? parseFloat(num) : num;
  if (isNaN(n)) return "0";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

export function formatCompact(num: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatPercent(num: number | string): string {
  const n = typeof num === "string" ? parseFloat(num) : num;
  if (isNaN(n)) return "0.00%";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options,
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function generateWalletAddress(currency: string): string {
  const prefixes: Record<string, string> = {
    BTC: "1",
    ETH: "0x",
    USDT: "0x",
    USD: "VAULT-",
  };
  const prefix = prefixes[currency] || "";
  const chars = "abcdef0123456789";
  const length = currency === "BTC" ? 33 : 40;
  let address = prefix;
  for (let i = 0; i < length; i++) {
    address += chars[Math.floor(Math.random() * chars.length)];
  }
  return address;
}

export function truncateAddress(address: string, chars: number = 6): string {
  if (!address) return "";
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function getStatusBg(status: string): string {
  const colors: Record<string, string> = {
    ACTIVE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    FROZEN: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    RESTRICTED: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    SUSPENDED: "bg-red-500/10 text-red-400 border-red-500/20",
    PENDING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    APPROVED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    REJECTED: "bg-red-500/10 text-red-400 border-red-500/20",
    COMPLETED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    FAILED: "bg-red-500/10 text-red-400 border-red-500/20",
    CANCELLED: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    OPEN: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    IN_PROGRESS: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    RESOLVED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    CLOSED: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    FILLED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    PROCESSING: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    UNDER_REVIEW: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    BUY: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    SELL: "bg-red-500/10 text-red-400 border-red-500/20",
    DEPOSIT: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    WITHDRAWAL: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  };
  return colors[status] || "bg-gray-500/10 text-gray-400 border-gray-500/20";
}
