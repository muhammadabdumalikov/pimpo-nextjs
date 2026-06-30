"use client";

import React from "react";
import { useTranslations } from "@/hooks/useTranslations";

interface PaginationProps {
  /** 1-based current page. */
  currentPage: number;
  /** Total number of pages. */
  totalPages: number;
  /** Total number of matching items (for the "of N" summary). */
  totalItems: number;
  /** Page size, used to compute the "X–Y" range. */
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

/**
 * Shared pagination control: "Showing X–Y of N" plus Prev / windowed page
 * numbers / Next. Used across the admin tables so they all look the same.
 */
export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
}: PaginationProps) {
  const { t } = useTranslations();
  const pages = Math.max(1, totalPages);
  const from = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const to = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex flex-col gap-4 pt-4 mt-4 -mx-4 sm:-mx-6 px-4 sm:px-6 border-t border-gray-100 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-gray-500 dark:text-gray-400">
        {t("common.showing")} {from} {t("common.to")} {to} {t("common.of")}{" "}
        {totalItems} {t("common.results")}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="flex items-center justify-center h-10 w-10 rounded-lg border border-gray-300 bg-white text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          {Array.from({ length: Math.min(3, pages) }, (_, i) => {
            let page;
            if (pages <= 3) {
              page = i + 1;
            } else if (currentPage === 1) {
              page = i + 1;
            } else if (currentPage >= pages) {
              page = pages - 2 + i;
            } else {
              page = currentPage - 1 + i;
            }
            return (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                className={`flex w-10 h-10 items-center justify-center rounded-lg text-sm font-medium ${
                  currentPage === page
                    ? "bg-brand-500 text-white"
                    : "text-gray-700 hover:bg-blue-500/[0.08] hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-500"
                }`}
              >
                {page}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= pages}
          className="flex items-center justify-center h-10 w-10 rounded-lg border border-gray-300 bg-white text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
