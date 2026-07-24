"use client";

import React, { useEffect, useState } from "react";
import { RiTelegram2Fill } from "react-icons/ri";
import { LuExternalLink } from "react-icons/lu";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import {
  getTelegramLinks,
  deleteTelegramLink,
  getTelegramConnectInfo,
  type TelegramLink,
  type TelegramConnectInfo,
} from "@/lib/api";

// Date + time in 24-hour format (uz-UZ), matching the rest of the app.
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("uz-UZ")}, ${d.toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

// Display name for a connected chat: first name, then @username, then the raw
// chat id as a last resort so the row is never blank.
function chatLabel(l: TelegramLink): string {
  if (l.tgFirstName) return l.tgFirstName;
  if (l.tgUsername) return `@${l.tgUsername}`;
  return l.chatId;
}

export default function IntegrationsManagement() {
  const { t } = useTranslations();
  const { showToast } = useToast();

  const [links, setLinks] = useState<TelegramLink[]>([]);
  const [connectInfo, setConnectInfo] = useState<TelegramConnectInfo | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [linkToRemove, setLinkToRemove] = useState<TelegramLink | null>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setIsLoading(true);
        const [fetchedLinks, info] = await Promise.all([
          getTelegramLinks(),
          getTelegramConnectInfo(),
        ]);
        if (!active) return;
        setLinks(fetchedLinks);
        setConnectInfo(info);
      } catch (err: unknown) {
        if (active)
          showToast(
            "error",
            (err as Error)?.message || "Failed to load integrations",
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

  // Disconnect: optimistic remove, restore on failure.
  const confirmRemove = async () => {
    if (!linkToRemove) return;
    const removed = linkToRemove;
    setRemoving(true);
    setLinks((prev) => prev.filter((l) => l.id !== removed.id));
    try {
      await deleteTelegramLink(removed.id);
      setLinkToRemove(null);
      showToast("success", t("integrations.disconnected"), "Success");
    } catch (e) {
      setLinks((prev) => [...prev, removed]);
      showToast("error", (e as Error).message, "Error");
    } finally {
      setRemoving(false);
    }
  };

  const botConfigured = !!connectInfo?.botUsername;

  const connectSteps = [
    t("integrations.connectStep1"),
    t("integrations.connectStep2"),
    t("integrations.connectStep3"),
  ];

  return (
    <div className="min-h-fill overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-5 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="mb-6">
        <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
          Telegram
        </h3>
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">
          {t("integrations.telegramSubtitle")}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Connect card */}
          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-light-50 text-blue-light-500 dark:bg-blue-light-500/10">
                  <RiTelegram2Fill className="h-7 w-7" />
                </span>
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-white/90">
                    {t("integrations.connectTitle")}
                  </h4>
                  <p className="mt-0.5 text-theme-sm text-gray-500 dark:text-gray-400">
                    {t("integrations.telegramSubtitle")}
                  </p>
                  {botConfigured ? (
                    <ol className="mt-3 space-y-2">
                      {connectSteps.map((step, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-theme-xs font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                            {i + 1}
                          </span>
                          <span className="text-theme-sm text-gray-700 dark:text-gray-300">
                            {step}
                          </span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-theme-sm text-gray-400 dark:bg-white/[0.03] dark:text-gray-500">
                      {t("integrations.notConfigured")}
                    </p>
                  )}
                </div>
              </div>
              {botConfigured && connectInfo?.deepLink && (
                <a
                  href={connectInfo.deepLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600"
                >
                  {t("integrations.openBot")}
                  <LuExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
            {botConfigured && (
              <p className="mt-3 text-theme-xs text-gray-400 dark:text-gray-500">
                @{connectInfo?.botUsername}
              </p>
            )}
          </div>

          {/* Connected chats */}
          <div>
            <h4 className="mb-3 font-semibold text-gray-800 dark:text-white/90">
              {t("integrations.connectedChats")}
            </h4>
            {links.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-[640px] w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-theme-xs uppercase tracking-wide text-gray-400 dark:border-gray-800">
                      <th className="px-3 py-3 font-medium">
                        {t("integrations.chat")}
                      </th>
                      <th className="px-3 py-3 font-medium">
                        {t("integrations.account")}
                      </th>
                      <th className="px-3 py-3 font-medium">
                        {t("integrations.connectedAt")}
                      </th>
                      <th className="px-3 py-3 font-medium">
                        {t("integrations.lastSentAt")}
                      </th>
                      <th className="px-3 py-3 text-right font-medium">
                        <span className="sr-only">
                          {t("integrations.disconnect")}
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {links.map((l) => (
                      <tr
                        key={l.id}
                        className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800/60 dark:hover:bg-white/[0.02]"
                      >
                        <td className="px-3 py-3">
                          <div className="font-medium text-gray-800 dark:text-white/90">
                            {chatLabel(l)}
                          </div>
                          {l.tgFirstName && l.tgUsername && (
                            <div className="text-theme-xs text-gray-400">
                              @{l.tgUsername}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="text-gray-700 dark:text-gray-300">
                            {l.accountName}
                          </div>
                          <div className="text-theme-xs text-gray-400">
                            {l.accountLogin}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-gray-700 dark:text-gray-300">
                          {formatDateTime(l.createdAt)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          {l.lastSentAt ? (
                            <>
                              <div className="text-gray-700 dark:text-gray-300">
                                {formatDateTime(l.lastSentAt)}
                              </div>
                              {l.lastSentBy && (
                                <div className="text-theme-xs text-gray-400">
                                  {l.lastSentBy}
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">
                              {t("integrations.never")}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setLinkToRemove(l)}
                            className="rounded-lg px-3 py-2 text-theme-sm font-medium text-gray-500 transition hover:bg-error-50 hover:text-error-500 dark:text-gray-400 dark:hover:bg-error-500/10 dark:hover:text-error-400"
                          >
                            {t("integrations.disconnect")}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-10 dark:border-gray-800">
                <p className="max-w-md text-center text-theme-sm text-gray-500 dark:text-gray-400">
                  {t("integrations.empty")}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!linkToRemove}
        onClose={() => !removing && setLinkToRemove(null)}
        onConfirm={confirmRemove}
        title={t("integrations.disconnectTitle")}
        message={t("integrations.disconnectConfirm")}
        confirmLabel={t("integrations.disconnect")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        isLoading={removing}
        loadingLabel={t("integrations.disconnect")}
      />
    </div>
  );
}
