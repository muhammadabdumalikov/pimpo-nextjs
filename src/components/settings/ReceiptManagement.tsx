"use client";
import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "@/hooks/useTranslations";
import ReceiptPreview from "./ReceiptPreview";
import ReceiptSettings from "./ReceiptSettings";

export default function ReceiptManagement() {
  const { t } = useTranslations();
  const router = useRouter();
  const [receiptName, setReceiptName] = useState(t("receipt.title") || "Стандартный");
  const [showLogo, setShowLogo] = useState(true);
  const [logo, setLogo] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

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
    setReceiptName(t("receipt.title") || "Стандартный");
    setShowLogo(true);
    setLogo(null);
    setLogoFile(null);
  };

  const handleSave = () => {
    // TODO: Implement save functionality
    console.log("Saving receipt settings:", {
      receiptName,
      showLogo,
      logo: logoFile,
    });
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
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
          >
            {t("receipt.reset") || "Сбросить"}
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-theme-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 dark:bg-brand-500 dark:hover:bg-brand-600"
          >
            {t("receipt.save") || "Сохранить"}
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

