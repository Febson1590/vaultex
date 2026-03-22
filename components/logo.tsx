"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "full" | "icon" | "text";
  size?: "sm" | "md" | "lg" | "xl";
  href?: string;
  className?: string;
}

const sizes = {
  sm: { icon: 28, textClass: "text-lg" },
  md: { icon: 36, textClass: "text-xl" },
  lg: { icon: 44, textClass: "text-2xl" },
  xl: { icon: 56, textClass: "text-3xl" },
};

export function Logo({ variant = "full", size = "md", href = "/", className }: LogoProps) {
  const s = sizes[size];

  const content = (
    <div className={cn("flex items-center gap-2.5 select-none", className)}>
      {variant !== "text" && (
        <div className="relative flex-shrink-0">
          {/* Hexagon icon mark */}
          <svg
            width={s.icon}
            height={s.icon}
            viewBox="0 0 44 44"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="hex-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c0c8d8" />
                <stop offset="50%" stopColor="#a8b4c8" />
                <stop offset="100%" stopColor="#8898b0" />
              </linearGradient>
              <linearGradient id="bar-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0ea5e9" />
              </linearGradient>
              <linearGradient id="arrow-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#0ea5e9" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {/* Hexagon outline */}
            <path
              d="M22 2L39 12V32L22 42L5 32V12L22 2Z"
              fill="url(#hex-grad)"
              fillOpacity="0.15"
              stroke="url(#hex-grad)"
              strokeWidth="1.5"
            />
            {/* Bar chart bars */}
            <rect x="12" y="24" width="4" height="8" rx="1" fill="url(#bar-grad)" filter="url(#glow)" />
            <rect x="18" y="19" width="4" height="13" rx="1" fill="url(#bar-grad)" filter="url(#glow)" />
            <rect x="24" y="14" width="4" height="18" rx="1" fill="url(#bar-grad)" filter="url(#glow)" />
            {/* Arrow */}
            <path
              d="M14 22 Q22 14 30 12"
              stroke="url(#arrow-grad)"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              filter="url(#glow)"
            />
            <path
              d="M27 10 L30 12 L28 15"
              stroke="url(#arrow-grad)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              filter="url(#glow)"
            />
          </svg>
        </div>
      )}
      {variant !== "icon" && (
        <div className="flex flex-col leading-none">
          <span
            className={cn(
              "font-bold tracking-wider text-white",
              s.textClass
            )}
            style={{ letterSpacing: "0.12em" }}
          >
            VAULTEX
          </span>
          {size !== "sm" && (
            <span
              className="text-[10px] font-medium tracking-[0.25em] text-sky-400 uppercase"
              style={{ marginTop: "1px" }}
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
