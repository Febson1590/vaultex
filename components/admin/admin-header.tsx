"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { logoutUser } from "@/lib/actions/auth";
import { Logo } from "@/components/logo";
import AdminNav from "./admin-nav";

export function AdminHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile drawer on any route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="h-14 bg-[#040f1f]/95 backdrop-blur-sm border-b border-sky-500/10 flex items-center px-4 sm:px-6 flex-shrink-0 sticky top-0 z-30">
      {/* Mobile hamburger — visible on < lg */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={<button className="lg:hidden p-2 text-slate-400 hover:text-white mr-2" />}>
          <Menu size={20} />
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0 bg-[#040f1f] border-sky-500/10 overflow-hidden">
          <AdminNav isMobile onNavClick={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Logo — mobile only (desktop sidebar has its own logo) */}
      <div className="lg:hidden mr-2">
        <Logo size="sm" href="/admin" />
      </div>

      {/* Title — desktop */}
      <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500">
        <span className="font-semibold text-sky-400 uppercase tracking-widest">Admin Panel</span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        <form action={logoutUser}>
          <button type="submit" className="text-xs text-red-400 hover:text-red-300 transition-colors">
            Sign Out
          </button>
        </form>
      </div>
    </header>
  );
}