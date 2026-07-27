"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { getStoreBot, updateStoreBot, type StoreBotInfo } from "@/lib/api";

/**
 * Settings → Online store → Telegram bot.
 *
 * The shop runs its own bot so the storefront opens as a Mini App under its own
 * brand: customers order inside Telegram and get status messages from the shop's
 * bot, not from ours. The owner creates the bot in BotFather, pastes the token
 * here (validated with getMe before it is stored), then points the bot's Mini
 * App URL at the address shown below.
 */
export default function StoreBotSettings({
  storeUrl,
}: {
  /** The shop's storefront address; the bot has nothing to open without it. */
  storeUrl: string | null;
}) {
  const { t } = useTranslations();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState<StoreBotInfo | null>(null);
  const [token, setToken] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await getStoreBot();
        if (active) setInfo(res);
      } catch (err) {
        if (active) {
          showToast("error", (err as Error)?.message || "Error", "Error");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [showToast]);

  const miniAppUrl = info?.miniAppUrl ?? storeUrl;

  const connect = async () => {
    const trimmed = token.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const res = await updateStoreBot({ botToken: trimmed });
      setInfo(res);
      setToken("");
      showToast("success", t("storeBot.connected"));
    } catch (err) {
      showToast("error", (err as Error)?.message || "Error", "Error");
    } finally {
      setSaving(false);
    }
  };

  const disconnect = async () => {
    setSaving(true);
    try {
      const res = await updateStoreBot({ botToken: null });
      setInfo(res);
      showToast("success", t("storeBot.disconnected"));
    } catch (err) {
      showToast("error", (err as Error)?.message || "Error", "Error");
    } finally {
      setSaving(false);
    }
  };

  const copyUrl = async () => {
    if (!miniAppUrl) return;
    try {
      await navigator.clipboard.writeText(miniAppUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("error", t("storeBot.copyFailed"), "Error");
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="h-40 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          {t("storeBot.title")}
        </h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            info?.connected
              ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400"
              : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
          }`}
        >
          {info?.connected ? t("storeBot.statusOn") : t("storeBot.statusOff")}
        </span>
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {t("storeBot.description")}
      </p>

      {/* The bot needs an address to open — without a slug the setup is moot. */}
      {!miniAppUrl && (
        <p className="mt-4 rounded-xl bg-warning-50 px-4 py-3 text-sm font-medium text-warning-700 dark:bg-warning-500/10 dark:text-warning-400">
          {t("storeBot.needsSlug")}
        </p>
      )}

      {info?.connected ? (
        <div className="mt-6 flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {t("storeBot.yourBot")}
            </span>
            {info.botLink ? (
              <a
                href={info.botLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-base font-semibold text-brand-500 hover:underline"
              >
                @{info.botUsername}
              </a>
            ) : (
              <span className="text-base font-semibold text-gray-800 dark:text-white/90">
                {t("storeBot.statusOn")}
              </span>
            )}
          </div>

          {miniAppUrl && (
            <div className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-white/[0.04]">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {t("storeBot.miniAppUrlLabel")}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <code className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  {miniAppUrl}
                </code>
                <button
                  type="button"
                  onClick={copyUrl}
                  className="text-sm font-semibold text-brand-500 hover:text-brand-600"
                >
                  {copied ? t("storeBot.copied") : t("storeBot.copy")}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {t("storeBot.miniAppUrlHint")}
              </p>
            </div>
          )}

          <div>
            <Button variant="outline" onClick={disconnect} disabled={saving}>
              {saving ? t("storeBot.saving") : t("storeBot.disconnect")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-5">
          <ol className="flex flex-col gap-2 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:bg-white/[0.04] dark:text-gray-300">
            <li>1. {t("storeBot.step1")}</li>
            <li>2. {t("storeBot.step2")}</li>
            <li>3. {t("storeBot.step3")}</li>
          </ol>

          <div>
            <Label>{t("storeBot.tokenLabel")}</Label>
            <Input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="123456789:AA..."
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              {t("storeBot.tokenHint")}
            </p>
          </div>

          <div>
            <Button onClick={connect} disabled={saving || !token.trim()}>
              {saving ? t("storeBot.saving") : t("storeBot.connect")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
