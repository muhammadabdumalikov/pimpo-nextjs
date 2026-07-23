"use client";

import React from "react";
import { LuSettings } from "react-icons/lu";
import { useTranslations } from "@/hooks/useTranslations";

interface SettingsComingSoonProps {
  /** i18n key prefix under `settingsPages`, e.g. "paymentMethods". */
  sectionKey: "paymentMethods" | "units" | "catalog" | "profile";
}

// S0 skeleton placeholder: the settings section exists in the sidebar and has
// a route, but its content ships in a later task (S1–S5, see SOZLAMALAR.md).
const SettingsComingSoon: React.FC<SettingsComingSoonProps> = ({ sectionKey }) => {
  const { t } = useTranslations();

  return (
    <div className="min-h-fill overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="mb-6">
        <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
          {t(`settingsPages.${sectionKey}.title`)}
        </h3>
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">
          {t(`settingsPages.${sectionKey}.description`)}
        </p>
      </div>

      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-white/[0.05] dark:text-gray-500">
          <LuSettings size={28} />
        </div>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-theme-sm font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
          {t("settingsPages.comingSoon")}
        </span>
        <p className="max-w-sm text-theme-sm text-gray-500 dark:text-gray-400">
          {t("settingsPages.comingSoonHint")}
        </p>
      </div>
    </div>
  );
};

export default SettingsComingSoon;
