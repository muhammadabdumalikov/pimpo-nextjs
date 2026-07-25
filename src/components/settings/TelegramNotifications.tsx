"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import Toggle from "@/components/settings/receipt-template/Toggle";
import {
  getTelegramNotificationSettings,
  updateTelegramNotificationSettings,
  type TelegramNotificationSettings,
} from "@/lib/api";

type EventKey = keyof TelegramNotificationSettings;

// Order the toggles are shown in; each maps to a title/description i18n key.
const EVENTS: EventKey[] = [
  "checkout",
  "cashShifts",
  "cashOperations",
  "dailySales",
];

/**
 * Per-event Telegram notification toggles. Which of these bot messages a shop
 * receives (checkout, cash shifts, cash operations, the daily digest). Each
 * toggle auto-saves optimistically and reverts on failure.
 */
export default function TelegramNotifications() {
  const { t } = useTranslations();
  const { showToast } = useToast();

  const [settings, setSettings] = useState<TelegramNotificationSettings | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setIsLoading(true);
        const s = await getTelegramNotificationSettings();
        if (active) setSettings(s);
      } catch (err: unknown) {
        if (active)
          showToast(
            "error",
            (err as Error)?.message || "Failed to load notification settings",
            "Error",
          );
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Optimistic flip; persist just the one changed flag; revert on failure.
  const toggle = async (key: EventKey, value: boolean) => {
    if (!settings || saving) return;
    const previous = settings;
    setSettings({ ...settings, [key]: value });
    setSaving(true);
    try {
      const updated = await updateTelegramNotificationSettings({ [key]: value });
      setSettings(updated);
      showToast("success", t("integrations.notifications.saved"), "Success");
    } catch (e) {
      setSettings(previous);
      showToast("error", (e as Error).message, "Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-fill overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-5 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="mb-6">
        <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
          {t("integrations.notifications.title")}
        </h3>
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">
          {t("integrations.notifications.subtitle")}
        </p>
      </div>

      {isLoading || !settings ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
          {EVENTS.map((key) => (
            <div
              key={key}
              className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <div className="font-medium text-gray-800 dark:text-white/90">
                  {t(`integrations.notifications.${key}Title`)}
                </div>
                <p className="mt-0.5 text-theme-sm text-gray-500 dark:text-gray-400">
                  {t(`integrations.notifications.${key}Desc`)}
                </p>
              </div>
              <div className="shrink-0">
                <Toggle
                  checked={settings[key]}
                  disabled={saving}
                  onChange={(v) => toggle(key, v)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
