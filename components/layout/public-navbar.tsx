"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import { Menu, X, ChevronRight } from "lucide-react";

const navLinks = [
  { href: "/markets",  label: "Markets"  },
  { href: "/pricing",  label: "Fees"     },
  { href: "/security", label: "Security" },
  { href: "/help",     label: "Support"  },
  { href: "/about",    label: "About"    },
];

export function PublicNavbar() {
  const [scrolled,   setScrolled]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    fn();
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-[#020b18]/95 backdrop-blur-xl border-b border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
          : "bg-[#020b18]/0 border-b border-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* ── Left: logo + nav links ───────────────────────────── */}
          <div className="flex items-center gap-9">
            <Logo size="md" href="/" />
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "relative px-3 h-9 inline-flex items-center text-[13px] font-medium rounded-md transition-colors duration-200",
                      active ? "text-white" : "text-slate-400 hover:text-white"
                    )}
                  >
                    {link.label}
                    {active && (
                      <span
                        className="absolute left-3 right-3 bottom-[-1px] h-[2px] rounded-full"
                        style={{ background: "linear-gradient(90deg, #38bdf8, #0ea5e9)" }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* ── Right: auth CTAs ─────────────────────────────────── */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/login"
              className="h-9 px-4 inline-flex items-center text-[13px] font-medium text-slate-300 hover:text-white rounded-md transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="vx-btn-primary h-9 px-4 inline-flex items-center gap-1.5 text-[13px] rounded-md"
            >
              Open Account
              <ChevronRight size={14} />
            </Link>
          </div>

          {/* ── Mobile hamburger ─────────────────────────────────── */}
          <button
            className="md:hidden h-9 w-9 inline-flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/[0.05] rounded-md transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* ── Mobile drawer ───────────────────────────────────────── */}
      {mobileOpen && (
        <div className="md:hidden bg-[#040f1f]/98 backdrop-blur-xl border-b border-white/[0.06]">
          <div className="px-4 py-4 space-y-1">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center justify-between px-4 h-11 rounded-md text-[14px] font-medium transition-colors",
                    active
                      ? "text-white bg-sky-500/10 border border-sky-500/20"
                      : "text-slate-300 hover:text-white hover:bg-white/[0.04] border border-transparent"
                  )}
                >
                  {link.label}
                  <ChevronRight size={14} className="text-slate-500" />
                </Link>
              );
            })}
            <div className="pt-3 mt-3 border-t border-white/[0.06] flex flex-col gap-2">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="vx-btn-ghost w-full h-11 inline-flex items-center justify-center rounded-md text-[14px]"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileOpen(false)}
                className="vx-btn-primary w-full h-11 inline-flex items-center justify-center gap-1.5 rounded-md text-[14px]"
              >
                Open Account <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
