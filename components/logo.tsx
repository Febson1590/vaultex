"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "full" | "icon" | "text";
  size?: "sm" | "md" | "lg" | "xl";
  href?: string;
  className?: string;
}

const sizes = {
  sm: { icon: 32, textClass: "text-lg", subClass: "text-[9px]" },
  md: { icon: 40, textClass: "text-xl", subClass: "text-[10px]" },
  lg: { icon: 52, textClass: "text-2xl", subClass: "text-[11px]" },
  xl: { icon: 64, textClass: "text-3xl", subClass: "text-xs" },
};

export function Logo({ variant = "full", size = "md", href = "/", className }: LogoProps) {
  const s = sizes[size];

  const content = (
    <div className={cn("flex items-center gap-3 select-none", className)}>
      {variant !== "text" && (
        <div className="relative flex-shrink-0" style={{ width: s.icon, height: s.icon }}>
          <svg
            width={s.icon}
            height={s.icon}
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="Vaultex Market"
          >
            <defs>
              {/* Metallic silver bevel */}
              <linearGradient id="vx-hex-outer" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#eef2f8" />
                <stop offset="45%" stopColor="#b7c2d4" />
                <stop offset="100%" stopColor="#6b7896" />
              </linearGradient>
              <linearGradient id="vx-hex-inner" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0c1b3a" />
                <stop offset="100%" stopColor="#050b1e" />
              </linearGradient>
              {/* Glowing blue bars */}
              <linearGradient id="vx-bar" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#7dd3fc" />
                <stop offset="60%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
              {/* Swooping arrow gradient */}
              <linearGradient id="vx-arrow" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="60%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#e0f2fe" />
              </linearGradient>
              <filter id="vx-glow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="1.6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="vx-soft-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.4" result="sb" />
                <feMerge>
                  <feMergeNode in="sb" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Outer hex (silver bevel) */}
            <path
              d="M32 3 L56 16.5 V47.5 L32 61 L8 47.5 V16.5 Z"
              fill="url(#vx-hex-outer)"
            />
            {/* Inner hex (dark well) */}
            <path
              d="M32 9 L51 20.25 V43.75 L32 55 L13 43.75 V20.25 Z"
              fill="url(#vx-hex-inner)"
            />

            {/* Bar chart */}
            <g filter="url(#vx-glow)">
              <rect x="20" y="38" width="5" height="10" rx="1" fill="url(#vx-bar)" />
              <rect x="27.5" y="30" width="5" height="18" rx="1" fill="url(#vx-bar)" />
              <rect x="35" y="22" width="5" height="26" rx="1" fill="url(#vx-bar)" />
            </g>

            {/* Swooping arrow — arcs through the hex and breaks out top-right */}
            <g filter="url(#vx-soft-glow)">
              <path
                d="M15 44 Q30 46 42 34 Q50 26 58 14"
                stroke="url(#vx-arrow)"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
              />
              {/* Arrowhead */}
              <path
                d="M51 12 L58 14 L56.5 21"
                stroke="url(#vx-arrow)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </g>
          </svg>
        </div>
      )}
      {variant !== "icon" && (
        <div className="flex flex-col leading-none">
          <span
            className={cn("font-extrabold tracking-wider text-white", s.textClass)}
            style={{ letterSpacing: "0.14em" }}
          >
            VAULTEX
          </span>
          {size !== "sm" && (
            <span
              className={cn(
                "font-medium uppercase text-sky-400",
                s.subClass
              )}
              style={{ letterSpacing: "0.32em", marginTop: "2px" }}
            >
              MARKET
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="hover:opacity-90 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}
