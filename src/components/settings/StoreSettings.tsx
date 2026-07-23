"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Switch from "@/components/form/switch/Switch";
import { getCurrentUser, updateStoreSettings } from "@/lib/api";

// The root domain the storefront is served under. Subdomains of it become each
// store's address. Kept in sync with the ecommerce app's NEXT_PUBLIC_ROOT_DOMAIN.
const ROOT_DOMAIN =
  process.env.NEXT_PUBLIC_STORE_ROOT_DOMAIN || "kpos.uz";

/** Settings → Online store: pick the subdomain and switch the storefront on. */
export default function StoreSettings() {
  const { t } = useTranslations();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slug, setSlug] = useState("");
  const [enabled, setEnabled] = useState(false);
  // The values currently persisted, to build the live URL and detect changes.
  const [savedSlug, setSavedSlug] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await getCurrentUser();
        if (!active) return;
        setSlug(res.business.storeSlug ?? "");
        setSavedSlug(res.business.storeSlug ?? null);
        setEnabled(Boolean(res.business.storeEnabled));
      } catch (err) {
        showToast(
          "error",
          (err as Error)?.message || "Failed to load",
          "Error"
        );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [showToast]);

  const normalizedSlug = slug.trim().toLowerCase();
  const storeUrl = savedSlug ? `https://${savedSlug}.${ROOT_DOMAIN}` : null;

  const save = async () => {
    setSaving(true);
    try {
      const res = await updateStoreSettings({
        storeSlug: normalizedSlug || null,
        storeEnabled: enabled,
      });
      setSavedSlug(res.storeSlug);
      setSlug(res.storeSlug ?? "");
      setEnabled(res.storeEnabled);
      showToast("success", t("onlineStore.saved"));
    } catch (err) {
      showToast("error", (err as Error)?.message || "Error", "Error");
    } finally {
      setSaving(false);
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
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          {t("onlineStore.title")}
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("onlineStore.description")}
        </p>

        <div className="mt-6 flex flex-col gap-5">
          <div>
            <Label>{t("onlineStore.slugLabel")}</Label>
            {/* Subdomain field: the label after the input shows the fixed root
                domain so the full address reads left to right. */}
            <div className="flex items-stretch">
              <div className="flex-1">
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="salom-market"
                  className="rounded-r-none"
                />
              </div>
              <span className="inline-flex shrink-0 items-center rounded-r-lg border border-l-0 border-gray-300 bg-gray-50 px-3 text-sm font-medium text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                .{ROOT_DOMAIN}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              {t("onlineStore.slugHint")}
            </p>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 dark:bg-white/[0.04]">
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                {t("onlineStore.enableLabel")}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("onlineStore.enableHint")}
              </p>
            </div>
            <Switch
              key={String(enabled)}
              label=""
              defaultChecked={enabled}
              onChange={setEnabled}
            />
          </div>

          <div>
            <Button onClick={save} disabled={saving}>
              {saving ? t("onlineStore.saving") : t("onlineStore.save")}
            </Button>
          </div>
        </div>
      </div>

      {storeUrl && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
            {t("onlineStore.yourAddress")}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <a
              href={storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-base font-semibold text-brand-500 hover:underline"
            >
              {storeUrl}
            </a>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                enabled
                  ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400"
                  : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              {enabled ? t("onlineStore.statusOn") : t("onlineStore.statusOff")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
