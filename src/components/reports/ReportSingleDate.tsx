"use client";
import { useEffect, useRef } from "react";
import flatpickr from "flatpickr";
import { getFlatpickrLocale } from "@/lib/flatpickrLocale";
import { CalenderIcon } from "@/icons/index";
import { useTranslations } from "@/hooks/useTranslations";

// Single-day date picker (used by the stock-valuation "as of date" report).
export default function ReportSingleDate({
  value,
  onChange,
}: {
  value: Date | null;
  onChange: (d: Date | null) => void;
}) {
  const { t, locale } = useTranslations();
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const fp = flatpickr(ref.current, {
      mode: "single",
      monthSelectorType: "static",
      dateFormat: "d.m.y",
      defaultDate: value ?? new Date(),
      clickOpens: true,
      locale: getFlatpickrLocale(locale),
      onChange: (dates) => onChange(dates[0] ?? null),
    });
    return () => {
      if (!Array.isArray(fp)) fp.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  return (
    <div className="relative">
      <input
        ref={ref}
        type="text"
        placeholder={t("reportsPage.selectDate")}
        className="h-11 w-full sm:w-auto min-w-[180px] rounded-lg border border-gray-200 bg-white px-4 py-2.5 pl-12 pr-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
      />
      <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none left-4 top-1/2 dark:text-gray-400">
        <CalenderIcon />
      </span>
    </div>
  );
}
