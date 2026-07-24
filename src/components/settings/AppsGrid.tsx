"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { RiTelegram2Fill } from "react-icons/ri";
import { LuSettings } from "react-icons/lu";
import { useTranslations } from "@/hooks/useTranslations";
import Badge from "@/components/ui/badge/Badge";
import { getTelegramLinks } from "@/lib/api";

// Registry of integration apps shown on the grid. Add new entries here and a
// matching detail page under /settings/applications/<id>.
interface AppEntry {
  id: string;
  name: string;
  descriptionKey: string;
  href: string;
  icon: React.ReactNode;
}

const APPS: AppEntry[] = [
  {
    id: "telegram",
    name: "Telegram",
    descriptionKey: "integrations.telegramSubtitle",
    href: "/settings/applications/telegram",
    icon: (
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-light-50 text-blue-light-500 dark:bg-blue-light-500/10">
        <RiTelegram2Fill className="h-7 w-7" />
      </span>
    ),
  },
];

export default function AppsGrid() {
  const { t } = useTranslations();

  // Per-app connection status; undefined = still loading (skeleton shown).
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [statusLoaded, setStatusLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const links = await getTelegramLinks();
        if (!active) return;
        setConnected({ telegram: links.length > 0 });
      } catch {
        // Status is decorative on this page — the detail page surfaces errors.
      } finally {
        if (active) setStatusLoaded(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-fill overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-5 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="mb-6">
        <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
          {t("settingsPages.integrations.title")}
        </h3>
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">
          {t("settingsPages.integrations.description")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {APPS.map((app) => (
          <Link
            key={app.id}
            href={app.href}
            className="group flex flex-col rounded-xl border border-gray-200 transition hover:border-brand-300 hover:shadow-theme-xs dark:border-gray-800 dark:hover:border-brand-500/40"
          >
            <div className="flex-1 p-4 sm:p-5">
              {app.icon}
              <h4 className="mt-4 font-semibold text-gray-800 dark:text-white/90">
                {app.name}
              </h4>
              <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
                {t(app.descriptionKey)}
              </p>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 dark:border-gray-800 sm:px-5">
              <span className="inline-flex items-center gap-2 text-theme-sm font-medium text-gray-500 transition-colors group-hover:text-brand-500 dark:text-gray-400 dark:group-hover:text-brand-400">
                <LuSettings className="h-4 w-4" />
                {t("integrations.manage")}
              </span>
              {statusLoaded ? (
                connected[app.id] ? (
                  <Badge size="sm" color="success">
                    {t("integrations.statusConnected")}
                  </Badge>
                ) : (
                  <Badge size="sm" color="light">
                    {t("integrations.statusNotConnected")}
                  </Badge>
                )
              ) : (
                <span className="h-5 w-20 animate-pulse rounded-full bg-gray-100 dark:bg-white/5" />
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
