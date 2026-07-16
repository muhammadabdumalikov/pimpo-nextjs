"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import flatpickr from "flatpickr";
import { useTranslations } from "@/hooks/useTranslations";
import { getFlatpickrLocale } from "@/lib/flatpickrLocale";

/** Inclusive day range as YYYY-MM-DD strings; both empty = all time. */
export interface DateRange {
  from: string;
  to: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
export const toYmd = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromYmd = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const dmy = (s: string) => {
  if (!s) return "";
  const d = fromYmd(s);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
};

/** Midnight of the given day (drops the time, so ranges are date-exact). */
const dayOnly = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Monday of the current week (weeks start on Monday). */
function startOfWeek(): Date {
  const d = dayOnly(new Date());
  const day = (d.getDay() + 6) % 7; // Mon = 0 … Sun = 6
  d.setDate(d.getDate() - day);
  return d;
}

export default function DateRangeFilter({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (r: DateRange) => void;
}) {
  const { t, locale } = useTranslations();
  const [open, setOpen] = useState(false);
  const [temp, setTemp] = useState<DateRange>(value);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fpRef = useRef<flatpickr.Instance | null>(null);

  // Keep the working copy in sync when the panel opens.
  useEffect(() => {
    if (open) setTemp(value);
  }, [open, value]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
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

  // Inline range calendar, created while the panel is open.
  useEffect(() => {
    if (!open || !inputRef.current) return;

    // Hide a trailing week that is made up entirely of next-month days, so the
    // grid keeps at most one row of next-month spill (no empty extra row).
    const trimTrailingWeek = (fp: flatpickr.Instance) => {
      const container = fp.calendarContainer?.querySelector(".dayContainer");
      if (!container) return;
      const days = Array.from(
        container.querySelectorAll<HTMLElement>(".flatpickr-day"),
      );
      days.forEach((d) => d.classList.remove("dr-hide-row"));
      const lastRow = days.slice(-7);
      if (
        lastRow.length === 7 &&
        lastRow.every((d) => d.classList.contains("nextMonthDay"))
      ) {
        lastRow.forEach((d) => d.classList.add("dr-hide-row"));
      }
    };

    const fp = flatpickr(inputRef.current, {
      inline: true,
      mode: "range",
      dateFormat: "Y-m-d",
      defaultDate: value.from && value.to ? [value.from, value.to] : undefined,
      locale: getFlatpickrLocale(locale),
      onReady: (_d, _s, self) => trimTrailingWeek(self),
      onMonthChange: (_d, _s, self) => trimTrailingWeek(self),
      onYearChange: (_d, _s, self) => trimTrailingWeek(self),
      onChange: (dates, _s, self) => {
        if (dates.length === 2) {
          setTemp({ from: toYmd(dates[0]), to: toYmd(dates[1]) });
        } else if (dates.length === 1) {
          setTemp({ from: toYmd(dates[0]), to: toYmd(dates[0]) });
        }
        trimTrailingWeek(self);
      },
    }) as flatpickr.Instance;
    fpRef.current = fp;
    return () => {
      fp.destroy();
      fpRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, locale]);

  const setPreset = (from: Date, to: Date) => {
    setTemp({ from: toYmd(from), to: toYmd(to) });
    fpRef.current?.setDate([from, to], false);
  };

  const presets = useMemo(() => {
    const today = dayOnly(new Date());
    const yest = dayOnly(new Date());
    yest.setDate(yest.getDate() - 1);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const yearStart = new Date(today.getFullYear(), 0, 1);
    const weekStart = startOfWeek();
    return [
      { key: "yesterday", label: t("sales.yesterday") || "Yesterday", from: yest, to: yest },
      { key: "today", label: t("sales.today") || "Today", from: today, to: today },
      { key: "week", label: t("sales.thisWeek") || "This week", from: weekStart, to: today },
      { key: "month", label: t("sales.thisMonth") || "This month", from: monthStart, to: today },
      { key: "year", label: t("sales.thisYear") || "This year", from: yearStart, to: today },
    ];
  }, [t]);

  // The relative name of the active range (Bugun / Kecha / Shu hafta …), shown
  // as a tag above the dates. Empty for a custom range.
  const relativeTag = useMemo(() => {
    if (!value.from && !value.to) return t("sales.all") || "All";
    const p = presets.find(
      (pr) => toYmd(pr.from) === value.from && toYmd(pr.to) === value.to,
    );
    return p ? p.label : "";
  }, [value, presets, t]);

  const mainText = useMemo(() => {
    if (!value.from && !value.to) return "";
    if (value.from === value.to) return dmy(value.from);
    return `${dmy(value.from)} — ${dmy(value.to)}`;
  }, [value]);

  const apply = () => {
    onChange(temp);
    setOpen(false);
  };

  const presetActive = (from: Date, to: Date) =>
    temp.from === toYmd(from) && temp.to === toYmd(to);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-12 items-center gap-3 rounded-xl border border-gray-300 bg-gray-50 px-4 text-left shadow-theme-xs transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-white/[0.06]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-brand-500">
          <rect x="3.5" y="4.5" width="17" height="16" rx="2" />
          <path d="M3.5 9h17M8 3v3M16 3v3" strokeLinecap="round" />
        </svg>
        <span className="leading-tight">
          {relativeTag && (
            <span className="block text-xs font-semibold text-brand-600 dark:text-brand-400">
              {relativeTag}
            </span>
          )}
          {mainText && (
            <span className="block text-sm font-bold text-gray-800 dark:text-white/90">
              {mainText}
            </span>
          )}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[min(90vw,640px)] rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            {/* Inline calendar (see `.dr-cal` overrides) */}
            <div className="dr-cal flex-1">
              <input ref={inputRef} type="text" className="sr-only" readOnly />
            </div>
            {/* Presets */}
            <div className="flex w-full flex-col gap-2 sm:w-52">
              {presets.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPreset(p.from, p.to)}
                  className={`flex flex-col justify-center rounded-xl border px-4 py-2 text-left transition ${
                    presetActive(p.from, p.to)
                      ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                      : "border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                  }`}
                >
                  <span className="block text-sm font-bold text-brand-600 dark:text-brand-400">
                    {p.label}
                  </span>
                  <span className="block text-xs font-semibold text-gray-600 dark:text-gray-300">
                    {toYmd(p.from) === toYmd(p.to)
                      ? dmy(toYmd(p.from))
                      : `${dmy(toYmd(p.from))} — ${dmy(toYmd(p.to))}`}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Footer: apply */}
          <div className="mt-4 flex items-center justify-end border-t border-gray-100 pt-4 dark:border-gray-800">
            <button
              type="button"
              onClick={apply}
              className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-brand-600"
            >
              {t("sales.apply") || "Apply"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
