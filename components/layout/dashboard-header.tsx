"use client";

import { Bell, Menu, ChevronDown } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Logo } from "@/components/logo";
import { logoutUser } from "@/lib/actions/auth";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DashboardSidebar } from "./dashboard-sidebar";
import { getStatusBg } from "@/lib/utils";

interface DashboardHeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string;
    status?: string;
  };
  unreadCount?: number;
}

export function DashboardHeader({ user, unreadCount = 0 }: DashboardHeaderProps) {
  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <header className="h-16 bg-[#040f1f]/95 backdrop-blur-sm border-b border-sky-500/10 flex items-center px-4 sm:px-6 flex-shrink-0 sticky top-0 z-30">
      {/* Mobile menu */}
      <Sheet>
        <SheetTrigger render={<button className="lg:hidden p-2 text-slate-400 hover:text-white mr-2" />}>
          <Menu size={20} />
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0 bg-[#040f1f] border-sky-500/10 overflow-hidden">
          {/* isMobile=true removes the hidden lg:flex class so it renders properly inside the Sheet */}
          <DashboardSidebar unreadCount={unreadCount} isMobile={true} />
        </SheetContent>
      </Sheet>

      <div className="lg:hidden">
        <Logo size="sm" href="/dashboard" />
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <Link
          href="/dashboard/notifications"
          className="relative p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-sky-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger render={<button className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors" />}>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-sky-500/20 text-sky-400 text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block text-left">
              <div className="text-sm font-medium text-white leading-none mb-0.5">{user.name || "User"}</div>
              <div className="text-xs text-slate-500 leading-none">{user.role === "ADMIN" ? "Administrator" : "Trader"}</div>
            </div>
            <ChevronDown size={14} className="text-slate-500 hidden sm:block" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-[#0d1e3a] border-sky-500/20 text-white">
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
              {user.status && (
                <span className={`inline-flex mt-1.5 items-center text-[10px] font-medium px-2 py-0.5 rounded-full border ${getStatusBg(user.status)}`}>
                  {user.status}
                </span>
              )}
            </div>
            <DropdownMenuSeparator className="bg-white/5" />
            {user.role === "ADMIN" && (
              <>
                <DropdownMenuItem render={<Link href="/admin" />} className="hover:bg-white/5 cursor-pointer text-sky-400">
                  Admin Panel
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/5" />
              </>
            )}
            <DropdownMenuItem render={<Link href="/dashboard/settings" />} className="hover:bg-white/5 cursor-pointer text-slate-300">
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/dashboard/support" />} className="hover:bg-white/5 cursor-pointer text-slate-300">
              Support
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem className="p-0 text-red-400 hover:bg-red-500/10 focus:text-red-400 focus:bg-red-500/10">
              <form action={logoutUser} className="w-full">
                <button
                  type="submit"
                  className="w-full flex items-center px-1.5 py-1 text-sm !text-red-400 cursor-pointer"
                >
                  Sign Out
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}