"use client";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ImportProductsWizard from "@/components/ecommerce/ImportProductsWizard";
import { useSubscription } from "@/context/SubscriptionContext";
import { useTranslations } from "@/hooks/useTranslations";

export default function ImportProductsPage() {
  const { currentTier } = useSubscription();
  const { t } = useTranslations();
  // Bulk import is a paid-plan feature (backend enforces this too).
  const allowed = currentTier !== "free";

  return (
    <div>
      <PageBreadcrumb pageTitle="Import Products" titleKey="import.title" />
      <div className="space-y-6">
        {allowed ? (
          <ImportProductsWizard />
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-14 text-center dark:border-gray-700 dark:bg-white/[0.02]">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
                <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
              </svg>
            </div>
            <p className="max-w-md text-sm text-gray-600 dark:text-gray-300">{t("import.freeGate")}</p>
            <Link
              href="/upgrade-plan"
              className="inline-flex items-center rounded-full bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
            >
              {t("products.upgradeCta")}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
