"use client";

import { useTranslations } from "@/hooks/useTranslations";

// Route-level loading boundary: shown instantly while a page's client bundle
// and data load, so navigation over slow connections never looks frozen.
export default function AdminLoading() {
  const { t } = useTranslations();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
      <span className="text-sm text-gray-500 dark:text-gray-400">
        {t("common.loading") || "Loading..."}
      </span>
    </div>
  );
}
