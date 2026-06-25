"use client";
import React from "react";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { useTranslations } from "@/hooks/useTranslations";

interface CheckoutPanelProps {
  clientName: string;
  onClientNameChange: (name: string) => void;
  discount: number;
  onDiscountChange: (percent: number) => void;
}

export default function CheckoutPanel({
  clientName,
  onClientNameChange,
  discount,
  onDiscountChange,
}: CheckoutPanelProps) {
  const { t } = useTranslations();
  const discountOptions = [15, 30, 50, 75];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6">
      {/* Client Section */}
      <div>
        <Label className="mb-3">{t("checkout.client")}</Label>
        <Input
          type="text"
          value={clientName}
          onChange={(e) => onClientNameChange(e.target.value)}
          placeholder={t("checkout.clientPlaceholder")}
          className="mt-2"
        />
      </div>

      {/* Discount Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label className="mb-0">{t("checkout.discount")}</Label>
          {discount > 0 && (
            <button
              onClick={() => onDiscountChange(0)}
              className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
            >
              {t("checkout.removeDiscount")}
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {discountOptions.map((percent) => (
            <button
              key={percent}
              onClick={() => onDiscountChange(percent)}
              className={`py-2.5 px-4 rounded-lg border text-sm font-medium transition-colors ${
                discount === percent
                  ? "bg-brand-500 border-brand-500 text-white hover:bg-brand-600"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              {percent}%
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

