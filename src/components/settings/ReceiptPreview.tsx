"use client";
import React from "react";
import Image from "next/image";
import { useTranslations } from "@/hooks/useTranslations";

interface ReceiptPreviewProps {
  receiptName: string;
  showLogo: boolean;
  logo: string | null;
  vatEnabled: boolean;
  vatRate: number;
}

export default function ReceiptPreview({
  receiptName,
  showLogo,
  logo,
  vatEnabled,
  vatRate,
}: ReceiptPreviewProps) {
  const { t } = useTranslations();
  const currentDate = new Date().toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // Sample line on the preview is 100 000 (VAT-inclusive). Break out the tax
  // portion using the configured rate.
  const sampleTotal = 100000;
  const vatPercentLabel = String(vatRate);
  const vatAmount =
    vatEnabled && vatRate > 0
      ? Math.round((sampleTotal * vatRate) / (100 + vatRate))
      : 0;
  const vatAmountLabel = new Intl.NumberFormat("ru-RU").format(vatAmount);
  const vatLine =
    t("receipt.vatIncluded")?.replace("{percent}", vatPercentLabel) ||
    `в т.ч. НДС ${vatPercentLabel}%`;

  return (
    <div className="bg-white dark:bg-gray-900 max-w-md mx-auto shadow-lg relative">
      {/* Torn paper border effect at top */}
      <div className="absolute top-0 left-0 right-0 h-6 overflow-hidden pointer-events-none">
        <svg className="w-full h-full" viewBox="0 0 400 24" preserveAspectRatio="none">
          <path
            d="M0,24 Q30,12 60,18 Q90,6 120,15 Q150,9 180,12 Q210,6 240,14 Q270,9 300,11 Q330,7 360,13 Q380,10 400,8 L400,0 L0,0 Z"
            fill="white"
            className="dark:fill-gray-900"
          />
        </svg>
      </div>

      <div className="px-8 py-10 pt-16 pb-16">
        {/* Logo - Centered */}
        {showLogo && logo && (
          <div className="mb-8 flex justify-center">
            <div className="relative w-full h-40">
              <Image
                src={logo}
                alt="Logo"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          </div>
        )}

        {/* Store Name - Left aligned */}
        <div className="mb-3 text-left">
          <h3 className="text-lg font-semibold text-black dark:text-white tracking-tight">
            {t("receipt.storeName") || "Store Riviera"}
          </h3>
        </div>

        {/* Date - Left aligned */}
        <div className="mb-8 text-left text-sm text-black/80 dark:text-white/70 font-normal">
          {t("receipt.dateLabel") || "Дата"}: {currentDate}
        </div>

        {/* Product Section */}
        <div className="mb-8">
          <h4 className="text-sm font-semibold text-black dark:text-white/90 mb-3 tracking-tight">
            1. {t("receipt.productName") || "Название продукта"}
          </h4>
          
          {/* Item with dashed line */}
          <div className="flex items-center mb-3">
            <span className="text-sm text-black dark:text-white/90 font-medium whitespace-nowrap">1 × 100 000</span>
            <div className="flex-1 border-t border-dashed border-black/30 dark:border-white/30 mx-3 h-px"></div>
            <span className="text-sm text-black dark:text-white/90 font-medium whitespace-nowrap">100 000 сум</span>
          </div>

          {/* VAT with dashed line */}
          {vatEnabled && (
            <div className="flex items-center">
              <span className="text-sm text-black/70 dark:text-white/70 whitespace-nowrap">
                {vatLine}
              </span>
              <div className="flex-1 border-t border-dashed border-black/30 dark:border-white/30 mx-3 h-px"></div>
              <span className="text-sm text-black/70 dark:text-white/70 whitespace-nowrap">{vatAmountLabel} сум</span>
            </div>
          )}
        </div>

        {/* Total Section */}
        <div className="mb-8">
          <h4 className="text-base font-bold text-black dark:text-white mb-3 tracking-tight">
            {t("receipt.total") || "ИТОГО"}
          </h4>
          
          {/* Total with dashed line */}
          <div className="flex items-center mb-3">
            <div className="flex-1 border-t border-dashed border-black/30 dark:border-white/30 h-px"></div>
            <span className="text-sm font-semibold text-black dark:text-white/90 ml-3 whitespace-nowrap">100 000 сум</span>
          </div>

          {/* Total VAT with dashed line */}
          {vatEnabled && (
            <div className="flex items-center">
              <span className="text-sm text-black/70 dark:text-white/70 whitespace-nowrap">
                {vatLine}
              </span>
              <div className="flex-1 border-t border-dashed border-black/30 dark:border-white/30 mx-3 h-px"></div>
              <span className="text-sm text-black/70 dark:text-white/70 whitespace-nowrap">{vatAmountLabel} сум</span>
            </div>
          )}
        </div>

        {/* Thank You Message - Centered */}
        <div className="text-center mt-10 pt-4">
          <p className="text-sm font-medium text-black/80 dark:text-white/70 tracking-wide">
            {t("receipt.thankYouMessage") || "Спасибо за вашу покупку!"}
          </p>
        </div>
      </div>

      {/* Torn paper border effect at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-6 overflow-hidden pointer-events-none">
        <svg className="w-full h-full" viewBox="0 0 400 24" preserveAspectRatio="none">
          <path
            d="M0,0 Q30,12 60,6 Q90,18 120,9 Q150,15 180,12 Q210,18 240,10 Q270,15 300,13 Q330,17 360,11 Q380,14 400,16 L400,24 L0,24 Z"
            fill="white"
            className="dark:fill-gray-900"
          />
        </svg>
      </div>
    </div>
  );
}

