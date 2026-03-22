"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, ArrowDownToLine, ArrowUpFromLine,
  ShieldCheck, TrendingUp, History, HeadphonesIcon, Bell,
  Settings, BarChart3, Activity,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/deposits", label: "Deposits", icon: ArrowDownToLine },
  { href: "/admin/withdrawals", label: "Withdrawals", icon: ArrowUpFromLine },
  { href: "/admin/verification", label: "KYC / Verification", icon: ShieldCheck },
  { href: "/admin/trades", label: "Trades", icon: TrendingUp },
  { href: "/admin/transactions", label: "Transactions", icon: History },
  { href: "/admin/support", label: "Support", icon: HeadphonesIcon },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/markets", label: "Market Data", icon: BarChart3 },
];

export default function AdminNav() {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-56 hidden lg:flex flex-col bg-[#040f1f] border-r border-sky-500/10 flex-shrink-0">
      <div className="flex items-center h-14 px-4 border-b border-sky-500/10">
        <Logo size="sm" href="/admin" />
      </div>
      <div className="px-2 py-2">
        <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-3 py-2">Admin Control</div>
      </div>
      <nav className="flex-1 px-2 pb-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                active
                  ? "bg-sky-500/15 text-sky-400"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className={cn("h-4 w-4", active ? "text-sky-400" : "text-slate-500")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
