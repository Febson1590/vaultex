"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useCookieConsent } from "@/components/cookie-consent";

/**
 * Tawk.to live-chat widget loader.
 *
 * Renders nothing if NEXT_PUBLIC_TAWK_PROPERTY_ID is unset, so it's safe
 * to mount globally before the Tawk account exists. Once the env var is
 * filled in (Vercel → Environment Variables), redeploy and the widget
 * appears site-wide.
 *
 * Suppressed on /admin routes — admins don't need to chat with themselves
 * and the widget would clutter the ops UI.
 *
 * Also gated on the cookie-consent banner: Tawk drops third-party
 * cookies for visitor tracking, so we don't load it until the user has
 * explicitly accepted, or until they accept later (the consent hook
 * re-runs this effect when their choice changes).
 */
export function TawkChat() {
  const propertyId = process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID;
  const widgetId   = process.env.NEXT_PUBLIC_TAWK_WIDGET_ID || "default";
  const pathname   = usePathname();
  const isAdmin    = pathname?.startsWith("/admin") ?? false;
  const consent    = useCookieConsent();

  useEffect(() => {
    if (!propertyId) return;
    if (isAdmin) return;
    if (consent !== "accepted") return;
    if (document.getElementById("tawk-script")) return;

    const w = window as unknown as {
      Tawk_API?: Record<string, unknown>;
      Tawk_LoadStart?: Date;
    };
    w.Tawk_API = w.Tawk_API || {};
    w.Tawk_LoadStart = new Date();

    const s = document.createElement("script");
    s.id = "tawk-script";
    s.async = true;
    s.src = `https://embed.tawk.to/${propertyId}/${widgetId}`;
    s.charset = "UTF-8";
    s.setAttribute("crossorigin", "*");
    document.body.appendChild(s);
  }, [propertyId, widgetId, isAdmin, consent]);

  /* Soft-toggle the widget on client-side route changes / consent
     revocation. The script is loaded once per page life, so navigating
     from /dashboard to /admin after load needs an explicit hide() call
     (and show() on the way back). Same goes if the user reverses their
     consent. hideWidget/showWidget are no-ops if the script hasn't
     finished loading yet — by that point the gating useEffect above
     has already kept the script from mounting. */
  useEffect(() => {
    const w = window as unknown as {
      Tawk_API?: { hideWidget?: () => void; showWidget?: () => void };
    };
    const api = w.Tawk_API;
    if (!api) return;
    const shouldShow = !isAdmin && consent === "accepted";
    if (shouldShow) api.showWidget?.();
    else            api.hideWidget?.();
  }, [isAdmin, consent]);

  return null;
}
