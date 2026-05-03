"use client";

import { useEffect } from "react";

/**
 * Tawk.to live-chat widget loader.
 *
 * Renders nothing if NEXT_PUBLIC_TAWK_PROPERTY_ID is unset, so it's safe
 * to mount globally before the Tawk account exists. Once the env var is
 * filled in (Vercel → Environment Variables), redeploy and the widget
 * appears site-wide.
 */
export function TawkChat() {
  const propertyId = process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID;
  const widgetId   = process.env.NEXT_PUBLIC_TAWK_WIDGET_ID || "default";

  useEffect(() => {
    if (!propertyId) return;
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
  }, [propertyId, widgetId]);

  return null;
}
