"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Star, Quote } from "lucide-react";

export interface Testimonial {
  name:    string;
  quote:   string;
  /** 1–5 stars. Defaults to 5. */
  rating?: number;
}

interface Props {
  items: Testimonial[];
  /** Cards visible per slide at ≥ md. Mobile always shows 1. Default 3. */
  perSlide?: number;
  /** Autoplay interval in ms. 0 disables. Default 6000. */
  autoplayMs?: number;
}

/**
 * Paginated testimonials carousel. Names-only, no avatars.
 *
 * - Mobile (< md):    1 card per slide
 * - Desktop (≥ md):   `perSlide` cards (default 3)
 * - Keyboard:         ← / → when the carousel is focused
 * - Autoplay:         pauses on hover / focus / when tab is hidden
 * - Reduced motion:   respects prefers-reduced-motion
 */
export function TestimonialsCarousel({ items, perSlide = 3, autoplayMs = 6000 }: Props) {
  const [visible, setVisible] = useState(perSlide);
  const [page, setPage]       = useState(0);
  const [paused, setPaused]   = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  /* Media-query driven cards-per-slide. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => setVisible(mq.matches ? perSlide : 1);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [perSlide]);

  const totalPages = Math.max(1, Math.ceil(items.length / visible));
  const safePage   = Math.min(page, totalPages - 1);

  const next = useCallback(() => setPage((p) => (p + 1) % totalPages), [totalPages]);
  const prev = useCallback(() => setPage((p) => (p - 1 + totalPages) % totalPages), [totalPages]);

  /* Reset page if the window resize made current page out of bounds. */
  useEffect(() => { if (page > totalPages - 1) setPage(0); }, [page, totalPages]);

  /* Autoplay. */
  useEffect(() => {
    if (!autoplayMs || paused || totalPages <= 1) return;
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;
    const id = window.setInterval(next, autoplayMs);
    return () => window.clearInterval(id);
  }, [autoplayMs, paused, next, totalPages]);

  /* Pause when tab not visible. */
  useEffect(() => {
    const onVis = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  /* Keyboard navigation when focused within. */
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") { e.preventDefault(); next(); }
    if (e.key === "ArrowLeft")  { e.preventDefault(); prev(); }
  };

  /* Split items into page groups for the translate track. */
  const pages: Testimonial[][] = Array.from({ length: totalPages }, (_, i) =>
    items.slice(i * visible, i * visible + visible)
  );

  return (
    <div
      ref={rootRef}
      className="relative"
      role="region"
      aria-roledescription="carousel"
      aria-label="Customer testimonials"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Track viewport */}
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-[650ms] ease-[cubic-bezier(.22,.61,.36,1)]"
          style={{ transform: `translateX(-${safePage * 100}%)` }}
          aria-live="polite"
        >
          {pages.map((group, pi) => (
            <div
              key={pi}
              className="shrink-0 w-full grid gap-3 px-0"
              style={{ gridTemplateColumns: `repeat(${visible}, minmax(0, 1fr))` }}
              aria-hidden={pi !== safePage}
            >
              {group.map((t, i) => (
                <TestimonialCard key={`${pi}-${i}`} t={t} />
              ))}
              {/* Fill missing slots on last page so layout stays stable */}
              {group.length < visible &&
                Array.from({ length: visible - group.length }).map((_, k) => (
                  <div key={`pad-${k}`} className="hidden md:block" />
                ))}
            </div>
          ))}
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between gap-4 mt-6">
        {/* Dots */}
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Testimonial pages">
          {Array.from({ length: totalPages }).map((_, i) => {
            const active = i === safePage;
            return (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={`Go to page ${i + 1}`}
                onClick={() => setPage(i)}
                className="group h-2 rounded-full transition-all duration-300"
                style={{
                  width:      active ? 22 : 8,
                  background: active ? "#38bdf8" : "rgba(148,163,184,0.25)",
                  boxShadow:  active ? "0 0 14px rgba(56,189,248,0.55)" : "none",
                }}
              />
            );
          })}
        </div>

        {/* Page counter + prev/next */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] tabular-nums font-semibold text-slate-500 uppercase tracking-widest">
            {String(safePage + 1).padStart(2, "0")}{" / "}{String(totalPages).padStart(2, "0")}
          </span>
          <button
            type="button"
            aria-label="Previous testimonials"
            onClick={prev}
            disabled={totalPages <= 1}
            className="w-9 h-9 rounded-full flex items-center justify-center border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] hover:border-sky-400/40 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4 text-slate-300" />
          </button>
          <button
            type="button"
            aria-label="Next testimonials"
            onClick={next}
            disabled={totalPages <= 1}
            className="w-9 h-9 rounded-full flex items-center justify-center border border-sky-400/40 bg-sky-500/10 hover:bg-sky-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4 text-sky-300" />
          </button>
        </div>
      </div>
    </div>
  );
}

function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <div className="vx-panel vx-panel-hover p-6 flex flex-col h-full relative overflow-hidden">
      {/* Subtle quote mark in the corner */}
      <Quote
        aria-hidden="true"
        className="absolute -top-1 -right-1 h-16 w-16 text-sky-500/[0.06] rotate-180 pointer-events-none"
      />

      {/* Rating */}
      {(() => {
        const r = Math.max(1, Math.min(5, Math.round(t.rating ?? 5)));
        return (
          <div
            className="flex items-center gap-1 mb-4"
            aria-label={`${r} out of 5 stars`}
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={13}
                className={i < r ? "text-sky-400 fill-current" : "text-slate-700 fill-current"}
              />
            ))}
            <span className="ml-1.5 text-[10px] font-bold tabular-nums text-slate-500">
              {r.toFixed(1)}
            </span>
          </div>
        );
      })()}

      {/* Quote */}
      <p className="text-[13.5px] text-slate-300 leading-relaxed flex-1 mb-5">
        &ldquo;{t.quote}&rdquo;
      </p>

      {/* Name only */}
      <div className="pt-4 border-t border-white/[0.06]">
        <div className="text-[13px] font-semibold text-white">{t.name}</div>
      </div>
    </div>
  );
}
