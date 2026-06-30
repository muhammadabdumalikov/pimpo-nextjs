"use client";
import React, { useState, useEffect } from "react";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import {
  getReceiptSettings,
  updateReceiptSettings,
  uploadStorageFile,
} from "@/lib/api";
import ReceiptPreview from "./ReceiptPreview";
import ReceiptSettings from "./ReceiptSettings";

const DEFAULT_NAME = "Standart";

// Static VAT (QQS) config for now. Shown on the receipt preview but not editable
// or persisted. TODO: wire back to the business's receipt settings API.
const VAT_ENABLED = true;
const VAT_RATE = 12;

export default function ReceiptManagement() {
  const { t } = useTranslations();
  const { showToast } = useToast();

  const [receiptName, setReceiptName] = useState(DEFAULT_NAME);
  const [showLogo, setShowLogo] = useState(true);
  // `logo` is the preview src (persisted URL or a freshly-picked data URL).
  const [logo, setLogo] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  // The last value loaded from / saved to the backend, used to reset and to
  // tell whether the logo URL actually changed.
  const [savedLogoUrl, setSavedLogoUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getReceiptSettings()
      .then((s) => {
        if (cancelled) return;
        setReceiptName(s.receiptName || DEFAULT_NAME);
        setShowLogo(s.showLogo);
        setLogo(s.logoUrl);
        setSavedLogoUrl(s.logoUrl);
      })
      .catch((e) => {
        if (!cancelled) showToast("error", e?.message || "Failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const handleLogoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogo(reader.result as string);
      setLogoFile(file);
    };
    reader.readAsDataURL(file);
  };

  const handleLogoRemove = () => {
    setLogo(null);
    setLogoFile(null);
  };

  const handleReset = () => {
    setReceiptName(DEFAULT_NAME);
    setShowLogo(true);
    setLogo(savedLogoUrl);
    setLogoFile(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Resolve the logo URL: upload a freshly-picked file, keep the saved URL,
      // or null it out when the logo was removed.
      let logoUrl: string | null = savedLogoUrl;
      if (logoFile) {
        const uploaded = await uploadStorageFile(logoFile, "receipts");
        logoUrl = uploaded.url;
      } else if (logo === null) {
        logoUrl = null;
      }

      const saved = await updateReceiptSettings({
        receiptName: receiptName.trim() || DEFAULT_NAME,
        showLogo,
        logoUrl,
      });

      setReceiptName(saved.receiptName || DEFAULT_NAME);
      setShowLogo(saved.showLogo);
      setLogo(saved.logoUrl);
      setSavedLogoUrl(saved.logoUrl);
      setLogoFile(null);
      showToast("success", t("receipt.saved") || "Saved");
    } catch (e) {
      showToast(
        "error",
        (e as Error)?.message || t("receipt.saveFailed") || "Failed to save",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-2">
            {t("receipt.title") || "Чек Стандартный"}
          </h3>
          <p className="text-gray-500 text-theme-sm dark:text-gray-400">
            {t("receipt.description") || "Настройте внешний вид и параметры чека"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
          >
            {t("receipt.reset") || "Сбросить"}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-theme-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-brand-500 dark:hover:bg-brand-600"
          >
            {isSaving
              ? t("receipt.saving") || "..."
              : t("receipt.save") || "Сохранить"}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Receipt Preview - Takes 2 columns */}
        <div className="lg:col-span-2">
          <ReceiptPreview
            receiptName={receiptName}
            showLogo={showLogo}
            logo={logo}
            vatEnabled={VAT_ENABLED}
            vatRate={VAT_RATE}
          />
        </div>

        {/* Settings Panel - Takes 1 column */}
        <div className="lg:col-span-1">
          <ReceiptSettings
            receiptName={receiptName}
            onReceiptNameChange={setReceiptName}
            showLogo={showLogo}
            onShowLogoChange={setShowLogo}
            logo={logo}
            onLogoUpload={handleLogoUpload}
            onLogoRemove={handleLogoRemove}
          />
        </div>
      </div>
    </div>
  );
}

