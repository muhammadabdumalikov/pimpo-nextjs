"use client";
import { useTranslations } from "@/hooks/useTranslations";

// Compact prev / page-numbers / next pager shared by the table reports.
export default function ReportPager({
  page,
  totalItems,
  pageSize,
  onPage,
}: {
  page: number;
  totalItems: number;
  pageSize: number;
  onPage: (p: number) => void;
}) {
  const { t } = useTranslations();
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = totalItems > 0 ? (page - 1) * pageSize + 1 : 0;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-4 pt-4 mt-4 -mx-4 sm:-mx-6 px-4 sm:px-6 border-t border-gray-100 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-gray-500 dark:text-gray-400">
        {t("reportsPage.showing")} {start} {t("reportsPage.to")} {end}{" "}
        {t("reportsPage.of")} {totalItems} {t("reportsPage.results")}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
            let p;
            if (totalPages <= 3) p = i + 1;
            else if (page === 1) p = i + 1;
            else if (page === totalPages) p = totalPages - 2 + i;
            else p = page - 1 + i;
            return (
              <button
                key={p}
                onClick={() => onPage(p)}
                className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium ${
                  page === p
                    ? "bg-brand-500 text-white"
                    : "text-gray-700 hover:bg-blue-500/[0.08] hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-500"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages || totalPages === 0}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
