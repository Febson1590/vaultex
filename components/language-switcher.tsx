"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Globe, Check, Search, X } from "lucide-react";

/**
 * Language switcher, split into two parts:
 *
 *   • <GoogleTranslateHost />
 *       Invisible. Loads Google's translate_a/element.js once per page
 *       life and mounts the offscreen host it needs. Rendered globally
 *       from the root layout so Google's engine is always available.
 *
 *   • <LanguageMenuDialog open ... />
 *       Controlled modal with the language picker. The caller opens it
 *       from wherever language-switching belongs (the dashboard avatar
 *       dropdown, public navbar, settings page, etc.). When the user
 *       picks a language we set the `googtrans` cookie Google reads
 *       (format: `/<source>/<target>`) and reload — the cookie-then-reload
 *       path is the official, reliable one; driving Google's
 *       .goog-te-combo programmatically fights React's re-renders.
 *
 * The cookie also gets written at the apex domain so `www.` and bare
 * domain share the same language preference.
 */

type Language = {
  code: string;
  label: string;
  english: string;
  flag: string;
  starred?: boolean;
};

// `starred: true` floats the most-spoken languages to the top when no
// search filter is active.
const LANGUAGES: Language[] = [
  { code: "en",     flag: "🇺🇸", label: "English",           english: "English",           starred: true },
  { code: "es",     flag: "🇪🇸", label: "Español",           english: "Spanish",           starred: true },
  { code: "fr",     flag: "🇫🇷", label: "Français",          english: "French",            starred: true },
  { code: "de",     flag: "🇩🇪", label: "Deutsch",           english: "German",            starred: true },
  { code: "pt",     flag: "🇵🇹", label: "Português",         english: "Portuguese",        starred: true },
  { code: "it",     flag: "🇮🇹", label: "Italiano",          english: "Italian",           starred: true },
  { code: "nl",     flag: "🇳🇱", label: "Nederlands",        english: "Dutch",             starred: true },
  { code: "ru",     flag: "🇷🇺", label: "Русский",           english: "Russian",           starred: true },
  { code: "zh-CN",  flag: "🇨🇳", label: "中文 (简体)",        english: "Chinese (Simplified)", starred: true },
  { code: "zh-TW",  flag: "🇹🇼", label: "中文 (繁體)",        english: "Chinese (Traditional)" },
  { code: "ja",     flag: "🇯🇵", label: "日本語",             english: "Japanese",          starred: true },
  { code: "ko",     flag: "🇰🇷", label: "한국어",             english: "Korean",            starred: true },
  { code: "ar",     flag: "🇸🇦", label: "العربية",           english: "Arabic",            starred: true },
  { code: "hi",     flag: "🇮🇳", label: "हिन्दी",             english: "Hindi",             starred: true },
  { code: "bn",     flag: "🇧🇩", label: "বাংলা",              english: "Bengali",           starred: true },
  { code: "tr",     flag: "🇹🇷", label: "Türkçe",            english: "Turkish" },
  { code: "pl",     flag: "🇵🇱", label: "Polski",            english: "Polish" },
  { code: "vi",     flag: "🇻🇳", label: "Tiếng Việt",        english: "Vietnamese" },
  { code: "th",     flag: "🇹🇭", label: "ไทย",                english: "Thai" },
  { code: "id",     flag: "🇮🇩", label: "Bahasa Indonesia",  english: "Indonesian" },
  { code: "ms",     flag: "🇲🇾", label: "Bahasa Melayu",     english: "Malay" },
  { code: "fil",    flag: "🇵🇭", label: "Filipino",          english: "Filipino" },
  { code: "sw",     flag: "🇹🇿", label: "Kiswahili",         english: "Swahili" },
  { code: "am",     flag: "🇪🇹", label: "አማርኛ",               english: "Amharic" },
  { code: "af",     flag: "🇿🇦", label: "Afrikaans",         english: "Afrikaans" },
  { code: "sq",     flag: "🇦🇱", label: "Shqip",             english: "Albanian" },
  { code: "hy",     flag: "🇦🇲", label: "Հայերեն",           english: "Armenian" },
  { code: "az",     flag: "🇦🇿", label: "Azərbaycan",        english: "Azerbaijani" },
  { code: "eu",     flag: "🇪🇸", label: "Euskara",           english: "Basque" },
  { code: "be",     flag: "🇧🇾", label: "Беларуская",        english: "Belarusian" },
  { code: "bg",     flag: "🇧🇬", label: "Български",         english: "Bulgarian" },
  { code: "ca",     flag: "🇪🇸", label: "Català",            english: "Catalan" },
  { code: "hr",     flag: "🇭🇷", label: "Hrvatski",          english: "Croatian" },
  { code: "cs",     flag: "🇨🇿", label: "Čeština",           english: "Czech" },
  { code: "da",     flag: "🇩🇰", label: "Dansk",             english: "Danish" },
  { code: "et",     flag: "🇪🇪", label: "Eesti",             english: "Estonian" },
  { code: "fi",     flag: "🇫🇮", label: "Suomi",             english: "Finnish" },
  { code: "el",     flag: "🇬🇷", label: "Ελληνικά",          english: "Greek" },
  { code: "gu",     flag: "🇮🇳", label: "ગુજરાતી",            english: "Gujarati" },
  { code: "he",     flag: "🇮🇱", label: "עברית",              english: "Hebrew" },
  { code: "hu",     flag: "🇭🇺", label: "Magyar",            english: "Hungarian" },
  { code: "is",     flag: "🇮🇸", label: "Íslenska",          english: "Icelandic" },
  { code: "ga",     flag: "🇮🇪", label: "Gaeilge",           english: "Irish" },
  { code: "kn",     flag: "🇮🇳", label: "ಕನ್ನಡ",              english: "Kannada" },
  { code: "lv",     flag: "🇱🇻", label: "Latviešu",          english: "Latvian" },
  { code: "lt",     flag: "🇱🇹", label: "Lietuvių",          english: "Lithuanian" },
  { code: "mk",     flag: "🇲🇰", label: "Македонски",        english: "Macedonian" },
  { code: "ml",     flag: "🇮🇳", label: "മലയാളം",            english: "Malayalam" },
  { code: "mt",     flag: "🇲🇹", label: "Malti",             english: "Maltese" },
  { code: "mr",     flag: "🇮🇳", label: "मराठी",              english: "Marathi" },
  { code: "ne",     flag: "🇳🇵", label: "नेपाली",              english: "Nepali" },
  { code: "no",     flag: "🇳🇴", label: "Norsk",             english: "Norwegian" },
  { code: "fa",     flag: "🇮🇷", label: "فارسی",              english: "Persian" },
  { code: "pa",     flag: "🇮🇳", label: "ਪੰਜਾਬੀ",              english: "Punjabi" },
  { code: "ro",     flag: "🇷🇴", label: "Română",            english: "Romanian" },
  { code: "sr",     flag: "🇷🇸", label: "Српски",            english: "Serbian" },
  { code: "sk",     flag: "🇸🇰", label: "Slovenčina",        english: "Slovak" },
  { code: "sl",     flag: "🇸🇮", label: "Slovenščina",       english: "Slovenian" },
  { code: "sv",     flag: "🇸🇪", label: "Svenska",           english: "Swedish" },
  { code: "ta",     flag: "🇮🇳", label: "தமிழ்",              english: "Tamil" },
  { code: "te",     flag: "🇮🇳", label: "తెలుగు",             english: "Telugu" },
  { code: "uk",     flag: "🇺🇦", label: "Українська",        english: "Ukrainian" },
  { code: "ur",     flag: "🇵🇰", label: "اردو",                english: "Urdu" },
];

declare global {
  interface Window {
    google?: {
      translate: {
        TranslateElement: {
          new (opts: unknown, elementId: string): unknown;
          InlineLayout: { SIMPLE: unknown };
        };
      };
    };
    googleTranslateElementInit?: () => void;
  }
}

function readGoogTransCookie(): string {
  if (typeof document === "undefined") return "en";
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("googtrans="));
  if (!match) return "en";
  const raw = decodeURIComponent(match.split("=")[1] || "");
  const parts = raw.split("/").filter(Boolean);
  return parts[1] || "en";
}

function setGoogTransCookie(target: string) {
  if (target === "en") {
    const host = window.location.hostname;
    const apex = host.startsWith("www.") ? host.slice(4) : host;
    document.cookie = "googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = `googtrans=; domain=.${apex}; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    return;
  }
  const value = `/en/${target}`;
  document.cookie = `googtrans=${value}; path=/`;
  const host = window.location.hostname;
  const apex = host.startsWith("www.") ? host.slice(4) : host;
  if (apex.includes(".")) {
    document.cookie = `googtrans=${value}; domain=.${apex}; path=/`;
  }
}

/* ──────────────────────────────────────────────────────────────────────
   GoogleTranslateHost
   Invisible, global. Mount once from the root layout.
────────────────────────────────────────────────────────────────────── */

export function GoogleTranslateHost() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (document.getElementById("google-translate-script")) return;

    window.googleTranslateElementInit = () => {
      if (!window.google?.translate) return;
      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en",
          includedLanguages: LANGUAGES.map((l) => l.code).join(","),
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false,
        },
        "google_translate_element",
      );
    };

    const script = document.createElement("script");
    script.id = "google-translate-script";
    script.async = true;
    script.src =
      "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    document.body.appendChild(script);
  }, []);

  return (
    <div
      id="google_translate_element"
      aria-hidden="true"
      className="notranslate !absolute !-left-[9999px] !top-0 !h-0 !w-0 !overflow-hidden"
      translate="no"
    />
  );
}

/* ──────────────────────────────────────────────────────────────────────
   LanguageMenuDialog
   Controlled modal with search + language list. Render this anywhere;
   the consumer controls open/close. Selecting a language sets the
   cookie and reloads so Google picks it up on next page-load.
────────────────────────────────────────────────────────────────────── */

export function LanguageMenuDialog({
  open,
  onOpenChange,
}: {
  open:         boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const [current, setCurrent] = useState<string>("en");
  const [query, setQuery]     = useState("");
  const searchRef = useRef<HTMLInputElement | null>(null);

  const visibleLanguages = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [
        ...LANGUAGES.filter((l) => l.starred),
        ...LANGUAGES.filter((l) => !l.starred).sort((a, b) =>
          a.english.localeCompare(b.english),
        ),
      ];
    }
    return LANGUAGES.filter(
      (l) =>
        l.english.toLowerCase().includes(q) ||
        l.label.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q),
    ).sort((a, b) => a.english.localeCompare(b.english));
  }, [query]);

  useEffect(() => {
    setCurrent(readGoogTransCookie());
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    // Focus the search when the dialog opens. Base body scroll-lock is
    // handled by our outer backdrop being `fixed inset-0 overflow-y-auto`.
    const id = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const handleSelect = (code: string) => {
    if (code === current) {
      onOpenChange(false);
      return;
    }
    setCurrent(code);
    setGoogTransCookie(code);
    window.location.reload();
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choose language"
      className="notranslate fixed inset-0 z-[70] flex justify-center items-start sm:items-center overflow-y-auto p-4 bg-black/75 backdrop-blur-sm"
      translate="no"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-sm my-6 sm:my-auto rounded-xl border border-sky-500/25 shadow-2xl overflow-hidden flex flex-col"
        style={{ background: "rgba(8,14,28,0.98)", maxHeight: "min(85vh, 560px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2 text-sky-300">
            <Globe className="h-4 w-4" />
            <h3 className="text-sm font-semibold text-white">Language</h3>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close language picker"
            className="p-1 rounded-md text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-white/[0.06] px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search language…"
              aria-label="Search languages"
              className="w-full rounded-md border border-white/[0.08] bg-[#06101e] py-1.5 pl-8 pr-8 text-sm text-white placeholder:text-slate-500 focus:border-sky-500/40 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-500 transition-colors hover:bg-sky-500/10 hover:text-sky-400"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto py-1">
          {visibleLanguages.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-slate-500">
              No languages match &ldquo;{query}&rdquo;
            </p>
          ) : (
            visibleLanguages.map((lang) => {
              const active = lang.code === current;
              return (
                <button
                  key={lang.code}
                  role="option"
                  aria-selected={active}
                  onClick={() => handleSelect(lang.code)}
                  className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${
                    active
                      ? "bg-sky-500/10 text-sky-300"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="flex-shrink-0 text-base leading-none" aria-hidden="true">
                    {lang.flag}
                  </span>
                  <div className="flex-1 min-w-0 leading-tight">
                    <div className="truncate font-medium">{lang.label}</div>
                    <div className="truncate text-[11px] text-slate-500">{lang.english}</div>
                  </div>
                  {active && <Check className="h-3.5 w-3.5 text-sky-400" />}
                </button>
              );
            })
          )}
        </div>

        {/* Footer note */}
        <div className="border-t border-white/[0.06] px-4 py-2.5">
          <p className="text-[10.5px] text-slate-500 leading-relaxed">
            Powered by Google Translate. The page reloads to apply your selection.
          </p>
        </div>
      </div>
    </div>
  );
}
