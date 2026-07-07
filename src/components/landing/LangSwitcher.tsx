"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "@/hooks/useTranslations";
import type { Locale } from "@/i18n/config";
import { ChevronIcon, GlobeIcon } from "./icons";

const SHORT: Record<string, string> = { uz: "UZ", ru: "RU", uzc: "ЎЗ", en: "EN" };
const NATIVE: Record<string, string> = {
  uz: "O'zbekcha",
  ru: "Русский",
  uzc: "Ўзбекча",
  en: "English",
};

// Landing-specific language popup. Adapts to the header's transparent (onDark)
// vs solid state, shows native language names, and marks the active locale.
export default function LangSwitcher({
  allowed,
  onDark,
}: {
  allowed: Locale[];
  onDark: boolean;
}) {
  const { locale, setLocale } = useTranslations();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Language"
        className={`flex h-11 items-center gap-1.5 rounded-full border pl-3 pr-2.5 text-sm font-medium transition-colors ${
          onDark
            ? "border-white/20 text-white/90 hover:bg-white/10"
            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
        }`}
      >
        <GlobeIcon className="h-4 w-4 opacity-80" />
        <span>{SHORT[locale] ?? locale.toUpperCase()}</span>
        <ChevronIcon
          className={`h-4 w-4 opacity-70 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 z-50 mt-2 w-48 origin-top-right rounded-2xl border border-gray-200 bg-white p-1.5 shadow-xl dark:border-gray-800 dark:bg-gray-900"
        >
          {allowed.map((loc) => {
            const active = loc === locale;
            return (
              <button
                key={loc}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  setLocale(loc);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition-colors ${
                  active
                    ? "bg-brand-50 font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-semibold ${
                    active
                      ? "bg-brand-500 text-white"
                      : "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400"
                  }`}
                >
                  {SHORT[loc] ?? loc.toUpperCase()}
                </span>
                {NATIVE[loc] ?? loc}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
