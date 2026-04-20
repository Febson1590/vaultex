"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Globe, ChevronDown, Check, Search, X } from "lucide-react";

/**
 * Site-wide language switcher backed by Google Website Translator.
 *
 * We don't use Google's default widget UI — it's ugly and clashes with the
 * Vaultex sky/dark-blue brand. Instead:
 *   1. We load Google's translate_a/element.js once, offscreen.
 *   2. Render our own styled dropdown in the bottom-left corner.
 *   3. When the user picks a language we set the `googtrans` cookie Google's
 *      engine reads (format: `/<source>/<target>`) and reload. Google's
 *      element picks up the cookie on next page-load and re-translates.
 *
 * Why cookie + reload instead of programmatic .goog-te-combo selection?
 * React re-renders disturb Google's DOM patching and you get flicker +
 * partially-untranslated content. Cookie+reload is the official, reliable path.
 */

type Language = {
  code: string;
  label: string;
  english: string;
  flag: string;
  starred?: boolean;
};

// `starred: true` marks the most-spoken languages we float to the top when
// no search filter is active.
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
  { code: "bs",     flag: "🇧🇦", label: "Bosanski",          english: "Bosnian" },
  { code: "bg",     flag: "🇧🇬", label: "Български",         english: "Bulgarian" },
  { code: "ca",     flag: "🇪🇸", label: "Català",            english: "Catalan" },
  { code: "ceb",    flag: "🇵🇭", label: "Cebuano",           english: "Cebuano" },
  { code: "ny",     flag: "🇲🇼", label: "Chichewa",          english: "Chichewa" },
  { code: "co",     flag: "🇫🇷", label: "Corsu",             english: "Corsican" },
  { code: "hr",     flag: "🇭🇷", label: "Hrvatski",          english: "Croatian" },
  { code: "cs",     flag: "🇨🇿", label: "Čeština",           english: "Czech" },
  { code: "da",     flag: "🇩🇰", label: "Dansk",             english: "Danish" },
  { code: "eo",     flag: "🌐", label: "Esperanto",         english: "Esperanto" },
  { code: "et",     flag: "🇪🇪", label: "Eesti",             english: "Estonian" },
  { code: "fi",     flag: "🇫🇮", label: "Suomi",             english: "Finnish" },
  { code: "fy",     flag: "🇳🇱", label: "Frysk",             english: "Frisian" },
  { code: "gl",     flag: "🇪🇸", label: "Galego",            english: "Galician" },
  { code: "ka",     flag: "🇬🇪", label: "ქართული",           english: "Georgian" },
  { code: "el",     flag: "🇬🇷", label: "Ελληνικά",          english: "Greek" },
  { code: "gu",     flag: "🇮🇳", label: "ગુજરાતી",            english: "Gujarati" },
  { code: "ht",     flag: "🇭🇹", label: "Kreyòl ayisyen",    english: "Haitian Creole" },
  { code: "ha",     flag: "🇳🇬", label: "Hausa",             english: "Hausa" },
  { code: "iw",     flag: "🇮🇱", label: "עברית",             english: "Hebrew" },
  { code: "hmn",    flag: "🇨🇳", label: "Hmoob",             english: "Hmong" },
  { code: "hu",     flag: "🇭🇺", label: "Magyar",            english: "Hungarian" },
  { code: "is",     flag: "🇮🇸", label: "Íslenska",          english: "Icelandic" },
  { code: "ig",     flag: "🇳🇬", label: "Igbo",              english: "Igbo" },
  { code: "ga",     flag: "🇮🇪", label: "Gaeilge",           english: "Irish" },
  { code: "jw",     flag: "🇮🇩", label: "Basa Jawa",         english: "Javanese" },
  { code: "kn",     flag: "🇮🇳", label: "ಕನ್ನಡ",              english: "Kannada" },
  { code: "kk",     flag: "🇰🇿", label: "Қазақ",             english: "Kazakh" },
  { code: "km",     flag: "🇰🇭", label: "ខ្មែរ",               english: "Khmer" },
  { code: "rw",     flag: "🇷🇼", label: "Kinyarwanda",       english: "Kinyarwanda" },
  { code: "ku",     flag: "🇹🇷", label: "Kurdî",             english: "Kurdish (Kurmanji)" },
  { code: "ky",     flag: "🇰🇬", label: "Кыргызча",          english: "Kyrgyz" },
  { code: "lo",     flag: "🇱🇦", label: "ລາວ",                english: "Lao" },
  { code: "la",     flag: "🇻🇦", label: "Latina",            english: "Latin" },
  { code: "lv",     flag: "🇱🇻", label: "Latviešu",          english: "Latvian" },
  { code: "lt",     flag: "🇱🇹", label: "Lietuvių",          english: "Lithuanian" },
  { code: "lb",     flag: "🇱🇺", label: "Lëtzebuergesch",    english: "Luxembourgish" },
  { code: "mk",     flag: "🇲🇰", label: "Македонски",        english: "Macedonian" },
  { code: "mg",     flag: "🇲🇬", label: "Malagasy",          english: "Malagasy" },
  { code: "ml",     flag: "🇮🇳", label: "മലയാളം",             english: "Malayalam" },
  { code: "mt",     flag: "🇲🇹", label: "Malti",             english: "Maltese" },
  { code: "mi",     flag: "🇳🇿", label: "Māori",             english: "Maori" },
  { code: "mr",     flag: "🇮🇳", label: "मराठी",              english: "Marathi" },
  { code: "mn",     flag: "🇲🇳", label: "Монгол",            english: "Mongolian" },
  { code: "my",     flag: "🇲🇲", label: "မြန်မာ",               english: "Myanmar (Burmese)" },
  { code: "ne",     flag: "🇳🇵", label: "नेपाली",             english: "Nepali" },
  { code: "no",     flag: "🇳🇴", label: "Norsk",             english: "Norwegian" },
  { code: "ps",     flag: "🇦🇫", label: "پښتو",              english: "Pashto" },
  { code: "fa",     flag: "🇮🇷", label: "فارسی",             english: "Persian" },
  { code: "pa",     flag: "🇮🇳", label: "ਪੰਜਾਬੀ",             english: "Punjabi" },
  { code: "ro",     flag: "🇷🇴", label: "Română",            english: "Romanian" },
  { code: "sm",     flag: "🇼🇸", label: "Gagana Samoa",      english: "Samoan" },
  { code: "gd",     flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", label: "Gàidhlig",          english: "Scots Gaelic" },
  { code: "sr",     flag: "🇷🇸", label: "Српски",            english: "Serbian" },
  { code: "st",     flag: "🇱🇸", label: "Sesotho",           english: "Sesotho" },
  { code: "sn",     flag: "🇿🇼", label: "ChiShona",          english: "Shona" },
  { code: "sd",     flag: "🇵🇰", label: "سنڌي",              english: "Sindhi" },
  { code: "si",     flag: "🇱🇰", label: "සිංහල",              english: "Sinhala" },
  { code: "sk",     flag: "🇸🇰", label: "Slovenčina",        english: "Slovak" },
  { code: "sl",     flag: "🇸🇮", label: "Slovenščina",       english: "Slovenian" },
  { code: "so",     flag: "🇸🇴", label: "Soomaali",          english: "Somali" },
  { code: "su",     flag: "🇮🇩", label: "Basa Sunda",        english: "Sundanese" },
  { code: "sv",     flag: "🇸🇪", label: "Svenska",           english: "Swedish" },
  { code: "tg",     flag: "🇹🇯", label: "Тоҷикӣ",            english: "Tajik" },
  { code: "ta",     flag: "🇮🇳", label: "தமிழ்",              english: "Tamil" },
  { code: "te",     flag: "🇮🇳", label: "తెలుగు",             english: "Telugu" },
  { code: "uk",     flag: "🇺🇦", label: "Українська",        english: "Ukrainian" },
  { code: "ur",     flag: "🇵🇰", label: "اردو",              english: "Urdu" },
  { code: "uz",     flag: "🇺🇿", label: "Oʻzbek",            english: "Uzbek" },
  { code: "cy",     flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", label: "Cymraeg",           english: "Welsh" },
  { code: "xh",     flag: "🇿🇦", label: "IsiXhosa",          english: "Xhosa" },
  { code: "yi",     flag: "🇮🇱", label: "ייִדיש",             english: "Yiddish" },
  { code: "yo",     flag: "🇳🇬", label: "Yorùbá",            english: "Yoruba" },
  { code: "zu",     flag: "🇿🇦", label: "IsiZulu",           english: "Zulu" },
];

declare global {
  interface Window {
    google?: {
      translate?: {
        TranslateElement: {
          new (
            config: {
              pageLanguage: string;
              includedLanguages?: string;
              layout?: number;
              autoDisplay?: boolean;
            },
            containerId: string
          ): unknown;
          InlineLayout: { SIMPLE: number };
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

export default function LanguageSwitcher() {
  const [open, setOpen]       = useState(false);
  const [current, setCurrent] = useState<string>("en");
  const [query, setQuery]     = useState("");
  const rootRef   = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const visibleLanguages = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [
        ...LANGUAGES.filter((l) => l.starred),
        ...LANGUAGES.filter((l) => !l.starred).sort((a, b) =>
          a.english.localeCompare(b.english)
        ),
      ];
    }
    return LANGUAGES.filter(
      (l) =>
        l.english.toLowerCase().includes(q) ||
        l.label.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q)
    ).sort((a, b) => a.english.localeCompare(b.english));
  }, [query]);

  // Load Google's translate script once per page lifetime
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
        "google_translate_element"
      );
    };

    const script = document.createElement("script");
    script.id = "google-translate-script";
    script.async = true;
    script.src =
      "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    document.body.appendChild(script);
  }, []);

  // Read current language from the cookie on mount
  useEffect(() => {
    setCurrent(readGoogTransCookie());
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Focus search when dropdown opens; reset on close
  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => searchRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
    setQuery("");
  }, [open]);

  const handleSelect = (code: string) => {
    setOpen(false);
    if (code === current) return;
    setCurrent(code);
    setGoogTransCookie(code);
    window.location.reload();
  };

  const currentLang =
    LANGUAGES.find((l) => l.code === current) || LANGUAGES[0];

  return (
    <>
      {/* Offscreen host for Google's injected element */}
      <div
        id="google_translate_element"
        aria-hidden="true"
        className="!absolute !-left-[9999px] !top-0 !h-0 !w-0 !overflow-hidden"
      />

      <div
        ref={rootRef}
        className="notranslate language-switcher-fixed"
        translate="no"
      >
        {/* Dropdown panel — opens upward from the chip.
            Horizontally centered on the chip; width capped to the viewport
            minus margins so it never overflows on narrow phones. */}
        {open && (
          <div
            role="listbox"
            className="absolute bottom-full left-1/2 mb-2 flex w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 flex-col overflow-hidden rounded-xl border border-sky-500/25 shadow-2xl backdrop-blur-sm"
            style={{ background: "rgba(8,14,28,0.96)", maxHeight: "min(70vh, 520px)" }}
          >
            {/* Header: search */}
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
                          ? "bg-sky-500/10 text-sky-400"
                          : "text-slate-300 hover:bg-sky-500/[0.06] hover:text-white"
                      }`}
                    >
                      <span className="flex-shrink-0 text-base leading-none" aria-hidden="true">
                        {lang.flag}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-medium">{lang.label}</span>
                        {lang.label !== lang.english && (
                          <span className="truncate text-[11px] text-slate-500">
                            {lang.english}
                          </span>
                        )}
                      </span>
                      {active && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Trigger button */}
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label="Change language"
          onClick={() => setOpen((v) => !v)}
          className="group flex items-center gap-2 rounded-full border border-sky-500/30 py-2 pl-3 pr-4 text-sm text-sky-400 shadow-lg backdrop-blur-sm transition-all hover:border-sky-500/60 hover:text-sky-300"
          style={{ background: "rgba(8,14,28,0.90)" }}
        >
          <span className="text-base leading-none" aria-hidden="true">{currentLang.flag}</span>
          <Globe className="h-3.5 w-3.5 opacity-60 transition-transform group-hover:rotate-12" />
          <span>{currentLang.label}</span>
          <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
    </>
  );
}
