"use client";

import { useEffect } from "react";
import { useTranslations } from "@/hooks/useTranslations";
import Button from "@/components/ui/button/Button";

// Route-level error boundary: an uncaught render/data error shows a localized
// recovery screen instead of crashing to a blank page.
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslations();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-error-50 text-error-500 dark:bg-error-500/15">
        <svg width="28" height="28" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M8 6V8M8 10H8.00667M14.6667 8C14.6667 11.6819 11.6819 14.6667 8 14.6667C4.3181 14.6667 1.33334 11.6819 1.33334 8C1.33334 4.3181 4.3181 1.33333 8 1.33333C11.6819 1.33333 14.6667 4.3181 14.6667 8Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div>
        <h2 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
          {t("common.errorTitle") || "Something went wrong"}
        </h2>
        <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">
          {t("common.errorDescription") ||
            "An unexpected error occurred while loading this page. Please try again."}
        </p>
      </div>
      <Button size="sm" onClick={reset}>
        {t("common.retry") || "Try again"}
      </Button>
    </div>
  );
}
