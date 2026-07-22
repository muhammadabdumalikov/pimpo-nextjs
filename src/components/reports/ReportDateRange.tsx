"use client";
import { useEffect, useMemo, useRef } from "react";
import flatpickr from "flatpickr";
import type { Instance as FlatpickrInstance } from "flatpickr/dist/types/instance";
import { getFlatpickrLocale } from "@/lib/flatpickrLocale";
import { CalenderIcon } from "@/icons/index";
import { useTranslations } from "@/hooks/useTranslations";
import { currentMonthRange, storeToday, toISODate } from "@/lib/reportFormat";

// Range date picker shared by all from/to reports. Emits Date objects; the
// parent converts to ISO for the API call. The preset chips below the input
// cover the ranges a store owner reaches for daily, so switching to "today"
// never requires two calendar clicks.
export default function ReportDateRange({
  value,
  onChange,
}: {
  value: [Date | null, Date | null];
  onChange: (range: [Date | null, Date | null]) => void;
}) {
  const { t, locale } = useTranslations();
  const ref = useRef<HTMLInputElement>(null);
  const fpRef = useRef<FlatpickrInstance | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const [first, last] = currentMonthRange();
    const fp = flatpickr(ref.current, {
      mode: "range",
      monthSelectorType: "static",
      dateFormat: "d.m.y",
      defaultDate: [value[0] ?? first, value[1] ?? last],
      clickOpens: true,
      locale: getFlatpickrLocale(locale),
      onChange: (dates, dateStr, instance) => {
        if (dates.length === 2) onChange([dates[0], dates[1]]);
        else if (dates.length === 0) onChange([null, null]);
        (instance.element as HTMLInputElement).value = dateStr.replace("to", " - ");
      },
      onReady: (_, dateStr, instance) => {
        (instance.element as HTMLInputElement).value = dateStr.replace("to", " - ");
      },
    });
    fpRef.current = Array.isArray(fp) ? fp[0] : fp;
    return () => {
      if (!Array.isArray(fp)) fp.destroy();
      fpRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  const presets = useMemo(() => {
    // Store-timezone "today" so a device on another clock gets the same
    // calendar day the backend will filter by.
    const today = storeToday();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 6);
    const [monthFirst, monthLast] = currentMonthRange();
    const prevFirst = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const prevLast = new Date(today.getFullYear(), today.getMonth(), 0);
    return [
      { key: "presetToday", range: [today, today] as [Date, Date] },
      { key: "presetYesterday", range: [yesterday, yesterday] as [Date, Date] },
      { key: "presetWeek", range: [weekAgo, today] as [Date, Date] },
      { key: "presetMonth", range: [monthFirst, monthLast] as [Date, Date] },
      { key: "presetPrevMonth", range: [prevFirst, prevLast] as [Date, Date] },
    ];
  }, []);

  const isActive = (range: [Date, Date]) =>
    !!value[0] &&
    !!value[1] &&
    toISODate(value[0]) === toISODate(range[0]) &&
    toISODate(value[1]) === toISODate(range[1]);

  // setDate with triggerChange=true routes through flatpickr's onChange, which
  // both updates the input display and calls the parent's onChange.
  const applyPreset = (range: [Date, Date]) =>
    fpRef.current?.setDate([range[0], range[1]], true);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <input
          ref={ref}
          type="text"
          placeholder={t("reportsPage.selectDateRange")}
          className="h-11 w-full sm:w-auto min-w-[220px] rounded-lg border border-gray-200 bg-white px-4 py-2.5 pl-12 pr-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
        />
        <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none left-4 top-1/2 dark:text-gray-400">
          <CalenderIcon />
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => {
          const active = isActive(p.range);
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => applyPreset(p.range)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                active
                  ? "border-brand-400 bg-brand-50 text-brand-600 dark:border-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                  : "border-gray-200 bg-white text-gray-500 hover:border-brand-300 hover:text-brand-600 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400 dark:hover:border-brand-700 dark:hover:text-brand-400"
              }`}
            >
              {t(`reportsPage.${p.key}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
