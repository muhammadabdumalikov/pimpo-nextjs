"use client";
import React, { useRef, useState } from "react";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Switch from "@/components/form/switch/Switch";
import { PlusIcon, PencilIcon, TrashBinIcon } from "@/icons/index";
import { useTranslations } from "@/hooks/useTranslations";
import Image from "next/image";

interface ReceiptSettingsProps {
  receiptName: string;
  onReceiptNameChange: (name: string) => void;
  showLogo: boolean;
  onShowLogoChange: (show: boolean) => void;
  logo: string | null;
  onLogoUpload: (file: File) => void;
  onLogoRemove: () => void;
}

export default function ReceiptSettings({
  receiptName,
  onReceiptNameChange,
  showLogo,
  onShowLogoChange,
  logo,
  onLogoUpload,
  onLogoRemove,
}: ReceiptSettingsProps) {
  const { t } = useTranslations();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === "image/jpeg" || file.type === "image/png") {
        if (file.size <= 5 * 1024 * 1024) {
          // 5MB
          onLogoUpload(file);
        } else {
          alert(t("receipt.logoSizeError") || "File size must be less than 5MB");
        }
      } else {
        alert(t("receipt.logoFormatError") || "Only JPG or PNG files are allowed");
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.type === "image/jpeg" || file.type === "image/png") {
        if (file.size <= 5 * 1024 * 1024) {
          onLogoUpload(file);
        } else {
          alert(t("receipt.logoSizeError") || "File size must be less than 5MB");
        }
      } else {
        alert(t("receipt.logoFormatError") || "Only JPG or PNG files are allowed");
      }
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6">
      {/* Receipt Name */}
      <div>
        <Label>{t("receipt.receiptName") || "Название чека"}</Label>
        <Input
          type="text"
          value={receiptName}
          onChange={(e) => onReceiptNameChange(e.target.value)}
          placeholder={t("receipt.receiptNamePlaceholder") || "Введите название чека"}
          className="mt-2"
        />
      </div>

      {/* Logo Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <Label className="mb-0">{t("receipt.logo") || "Логотип"}</Label>
          <div className="flex items-center">
            <Switch
              key={showLogo ? "on" : "off"}
              label=""
              defaultChecked={showLogo}
              onChange={onShowLogoChange}
            />
          </div>
        </div>

        {showLogo && (
          <>
            {logo ? (
              <div className="space-y-4">
                <div className="relative w-full h-32 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                  <div className="relative w-full h-full">
                    <Image
                      src={logo}
                      alt="Logo"
                      fill
                      className="object-contain p-4"
                      unoptimized
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
                  >
                    <PencilIcon/>
                    {t("receipt.replace") || "Заменить"}
                  </button>
                  <button
                    onClick={onLogoRemove}
                    className="inline-flex items-center gap-2 text-sm font-medium text-red-500 hover:text-red-600 dark:text-red-400"
                  >
                    <TrashBinIcon />
                    {t("receipt.delete") || "Удалить"}
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative w-full h-32 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
                  isDragging
                    ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
                    : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-brand-400"
                }`}
              >
                <div className="text-center">
                  <PlusIcon className="mx-auto mb-2 text-brand-500" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("receipt.uploadLogo") || "Загрузите логотип"}
                  </p>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Instructions */}
            <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <PlusIcon className="text-brand-500" />
                <span>{t("receipt.uploadLogoInstruction") || "Загрузите логотип"}</span>
              </div>
              <div className="flex items-center gap-2">
                <PencilIcon className="text-brand-500" />
                <span>{t("receipt.clickLogoInstruction") || "Кликните на него"}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-brand-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 9l4-4 4 4m0 6l-4 4-4-4"
                  />
                </svg>
                <span>
                  {t("receipt.moveResizeInstruction") ||
                    "Передвигайте и меняйте размер логотипа"}
                </span>
              </div>
            </div>

            {/* File Format Info */}
            <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              {t("receipt.logoFormatInfo") ||
                "Формат загружаемого фото: JPG или PNG. Максимальный размер: 5МБ."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

