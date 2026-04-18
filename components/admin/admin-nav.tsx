"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, ArrowDownToLine, ArrowUpFromLine,
  ShieldCheck, TrendingUp, History, HeadphonesIcon, Bell, Copy, Wallet,
  SlidersHorizontal,
} from "lucide-react";

const navItems = [
  { href: "/admin",                 label: "Dashboard",          icon: LayoutDashboard, exact: true },
  { href: "/admin/users",           label: "Users",              icon: Users },
  { href: "/admin/investments",     label: "Investments",        icon: TrendingUp },
  { href: "/admin/copy-traders",    label: "Copy Traders",       icon: Copy },
  { href: "/admin/deposits",        label: "Deposits",           icon: ArrowDownToLine },
  { href: "/admin/deposit-wallets", label: "Deposit Wallets",    icon: Wallet },
  { href: "/admin/withdrawals",     label: "Withdrawals",        icon: ArrowUpFromLine },
  { href: "/admin/limits",          label: "Limits",             icon: SlidersHorizontal },
  { href: "/admin/verification",    label: "KYC / Verification", icon: ShieldCheck },
  { href: "/admin/transactions",    label: "Transactions",       icon: History },
  { href: "/admin/support",         label: "Support",            icon: HeadphonesIcon },
  { href: "/admin/notifications",   label: "Notifications",      icon: Bell },
];

interface AdminNavProps {
  isMobile?: boolean;
  onNavClick?: () => void;
}

export default function AdminNav({ isMobile = false, onNavClick }: AdminNavProps) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        "flex flex-col bg-[#040f1f] border-r border-sky-500/10 flex-shrink-0",
        isMobile ? "w-full h-full" : "w-56 hidden lg:flex"
      )}
    >
      <div className="flex items-center h-14 px-4 border-b border-sky-500/10 flex-shrink-0">
        <Logo size="sm" href="/admin" />
      </div>
      <div className="px-2 py-2 flex-shrink-0">
        <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-3 py-2">
          Admin Control
        </div>
      </div>
      <nav className="flex-1 px-2 pb-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                active
                  ? "bg-sky-500/15 text-sky-400"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className={cn("h-4 w-4 flex-shrink-0", active ? "text-sky-400" : "text-slate-500")} />
              {item.label}
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sky-400" />}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}