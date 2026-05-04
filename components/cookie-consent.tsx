"use client";

import { useEffect, useState } from "react";

/**
 * GDPR-style cookie banner.
 *
 * Persists the user's choice in localStorage under
 * `vaultex:cookie-consent` as one of:
 *   - "accepted"   → all non-essential cookies allowed (Tawk, analytics)
 *   - "declined"   → only strictly-necessary cookies (auth, CSRF)
 *   - null/missing → no decision yet, banner is shown
 *
 * Components that load third-party scripts (e.g. TawkChat) read this
 * value and listen for the `vaultex:consent-changed` window event so
 * they can mount/unmount themselves on the user's choice.
 */

const STORAGE_KEY = "vaultex:cookie-consent";
const CONSENT_EVENT = "vaultex:consent-changed";

export type ConsentValue = "accepted" | "declined";

export function readConsent(): ConsentValue | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "accepted" || v === "declined" ? v : null;
  } catch {
    // localStorage can throw in private mode on Safari
    return null;
  }
}

function writeConsent(value: ConsentValue): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* ignore — banner just won't dismiss permanently in private mode */
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
}

export function CookieConsent() {
  // Render nothing until the client mounts. SSR-rendered banner +
  // hydration mismatch would flash a banner the user already dismissed.
  const [mounted, setMounted] = useState(false);
  const [consent, setConsent] = useState<ConsentValue | null>(null);

  useEffect(() => {
    setConsent(readConsent());
    setMounted(true);
  }, []);

  if (!mounted || consent !== null) return null;

  function decide(value: ConsentValue) {
    writeConsent(value);
    setConsent(value);
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4
                 pointer-events-none"
    >
      <div
        className="max-w-3xl mx-auto pointer-events-auto
                   rounded-2xl border border-sky-500/20
                   bg-[rgba(7,15,30,0.96)] backdrop-blur-md
                   shadow-2xl shadow-black/40
                   px-4 py-4 sm:px-5 sm:py-4
                   flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
      >
        <div className="flex-1 min-w-0">
          <p className="text-[13px] sm:text-sm font-semibold text-white">
            We use cookies
          </p>
          <p className="text-[12px] sm:text-[12.5px] text-slate-400 leading-relaxed mt-0.5">
            Vaultex uses essential cookies for sign-in and security, plus
            optional cookies for live chat and analytics. You can change
            this choice anytime by clearing site data in your browser.
          </p>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => decide("declined")}
            className="h-10 px-4 text-[12.5px] font-semibold rounded-lg
                       border border-white/10 text-slate-300
                       hover:border-white/20 hover:text-white
                       transition-colors"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => decide("accepted")}
            className="h-10 px-4 text-[12.5px] font-semibold rounded-lg
                       bg-sky-500 hover:bg-sky-400 text-white
                       transition-colors"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * React hook returning the current consent state and re-rendering when
 * it changes via the cross-component event. Used by TawkChat to gate
 * script injection.
 */
export function useCookieConsent(): ConsentValue | null {
  const [value, setValue] = useState<ConsentValue | null>(null);

  useEffect(() => {
    setValue(readConsent());
    function onChange(e: Event) {
      const detail = (e as CustomEvent<ConsentValue>).detail;
      setValue(detail ?? readConsent());
    }
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  return value;
}
