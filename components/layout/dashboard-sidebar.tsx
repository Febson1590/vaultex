"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, TrendingUp, Users, ArrowDownToLine,
  ArrowUpFromLine, History, HeadphonesIcon, Settings,
  ChevronLeft, ChevronRight, LogOut, Bell, Globe,
} from "lucide-react";
import { logoutUser } from "@/lib/actions/auth";
import { useEffect, useState } from "react";
import { LanguageMenuDialog } from "@/components/language-switcher";

// Kept in sync with the starred set in language-switcher.tsx so the
// sidebar can show a friendly label for the active language without
// importing the whole list.
const COMMON_LANG_LABELS: Record<string, string> = {
  en:       "English",
  es:       "Español",
  fr:       "Français",
  de:       "Deutsch",
  pt:       "Português",
  it:       "Italiano",
  nl:       "Nederlands",
  ru:       "Русский",
  "zh-CN":  "中文",
  "zh-TW":  "中文",
  ja:       "日本語",
  ko:       "한국어",
  ar:       "العربية",
  hi:       "हिन्दी",
  bn:       "বাংলা",
};

function readCurrentLanguageCode(): string {
  if (typeof document === "undefined") return "en";
  const m = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("googtrans="));
  if (!m) return "en";
  const raw = decodeURIComponent(m.split("=")[1] || "");
  const parts = raw.split("/").filter(Boolean);
  return parts[1] || "en";
}

const navItems = [
  { href: "/dashboard",                 label: "Overview",      icon: LayoutDashboard, exact: true },
  { href: "/dashboard/investments",     label: "Investments",   icon: TrendingUp },
  { href: "/dashboard/copy-trading",    label: "Copy Trading",  icon: Users },
  { href: "/dashboard/transactions",    label: "Transactions",  icon: History },
  { href: "/dashboard/deposit",         label: "Deposit",       icon: ArrowDownToLine },
  { href: "/dashboard/withdraw",        label: "Withdraw",      icon: ArrowUpFromLine },
  { href: "/dashboard/support",         label: "Support",       icon: HeadphonesIcon },
  { href: "/dashboard/settings",        label: "Settings",      icon: Settings },
];

interface DashboardSidebarProps {
  unreadCount?: number;
  /** Pass true when rendered inside the mobile Sheet drawer */
  isMobile?: boolean;
  /** Called when a nav item is clicked — used to close the mobile drawer */
  onNavClick?: () => void;
}

export function DashboardSidebar({ unreadCount = 0, isMobile = false, onNavClick }: DashboardSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [langOpen,  setLangOpen]  = useState(false);
  const [langCode,  setLangCode]  = useState<string>("en");

  useEffect(() => {
    setLangCode(readCurrentLanguageCode());
  }, []);

  const langLabel = COMMON_LANG_LABELS[langCode] ?? langCode.toUpperCase();

  // Mobile drawer never collapses
  const isCollapsed = isMobile ? false : collapsed;

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  function openLanguage() {
    // Close the mobile drawer (if any) before the dialog opens so it
    // lands cleanly on top of the dashboard instead of the Sheet.
    onNavClick?.();
    // Delay one tick so Radix/base-ui unmounts the drawer before the
    // dialog portal attaches to document.body.
    window.setTimeout(() => setLangOpen(true), 10);
  }

  return (
    <aside
      className={cn(
        "flex flex-col bg-[#040f1f] border-r border-sky-500/10 transition-all duration-300 flex-shrink-0",
        !isMobile && (isCollapsed ? "hidden lg:flex w-16" : "hidden lg:flex w-60"),
        isMobile && "w-full h-full"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center h-16 px-4 border-b border-sky-500/10 flex-shrink-0",
        isCollapsed && "justify-center px-2"
      )}>
        {isCollapsed
          ? <Logo variant="icon" size="sm" href="/dashboard" />
          : <Logo size="sm" href="/dashboard" />
        }
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              onClick={onNavClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group",
                active
                  ? "bg-sky-500/15 text-sky-400 shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-white/5",
                isCollapsed && "justify-center px-2"
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 flex-shrink-0",
                  active ? "text-sky-400" : "text-slate-500 group-hover:text-white"
                )}
              />
              {!isCollapsed && <span>{item.label}</span>}
              {!isCollapsed && active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sky-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="p-2 border-t border-sky-500/10 space-y-0.5">
        <Link
          href="/dashboard/notifications"
          onClick={onNavClick}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors relative",
            isCollapsed && "justify-center px-2"
          )}
        >
          <Bell className="h-4 w-4 flex-shrink-0" />
          {!isCollapsed && <span>Notifications</span>}
          {unreadCount > 0 && (
            <span className={cn(
              "bg-sky-500 text-white text-xs font-bold rounded-full flex items-center justify-center",
              isCollapsed
                ? "absolute -top-1 -right-1 w-4 h-4 text-[10px]"
                : "ml-auto w-5 h-5"
            )}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        {/* Language — opens the global LanguageMenuDialog. Shows the
            currently-active language next to the label on wide menus. */}
        <button
          type="button"
          onClick={openLanguage}
          title={isCollapsed ? `Language — ${langLabel}` : undefined}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors",
            isCollapsed && "justify-center px-2"
          )}
        >
          <Globe className="h-4 w-4 flex-shrink-0" />
          {!isCollapsed && (
            <>
              <span>Language</span>
              <span className="ml-auto text-[11px] font-normal text-slate-500 truncate max-w-[6rem]">
                {langLabel}
              </span>
            </>
          )}
        </button>

        <form action={logoutUser}>
          <button
            type="submit"
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors",
              isCollapsed && "justify-center px-2"
            )}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </form>

        {/* Collapse toggle — desktop only */}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!isCollapsed)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-500 hover:text-white hover:bg-white/5 transition-colors",
              isCollapsed && "justify-center px-2"
            )}
          >
            {isCollapsed
              ? <ChevronRight className="h-4 w-4" />
              : <><ChevronLeft className="h-4 w-4" /><span>Collapse</span></>
            }
          </button>
        )}
      </div>

      {/* Language dialog — portals to document.body so it works
          regardless of where the sidebar is rendered (desktop aside
          or mobile Sheet drawer). */}
      <LanguageMenuDialog
        open={langOpen}
        onOpenChange={(next) => {
          setLangOpen(next);
          if (!next) {
            // Refresh the displayed label after the user closes the
            // dialog; if they picked a new language the page reloads
            // anyway, but if they bailed out we still pick up any
            // new cookie value quietly.
            setLangCode(readCurrentLanguageCode());
          }
        }}
      />
    </aside>
  );
}
