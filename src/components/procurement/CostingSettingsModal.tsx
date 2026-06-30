"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import { Modal } from "@/components/ui/modal";
import SelectField from "@/components/form/SelectField";
import Button from "@/components/ui/button/Button";
import {
  getReceiptSettings,
  updateReceiptSettings,
  type CostingMethod,
  type PriceIncreaseMode,
} from "@/lib/api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Inventory costing configuration (per business): how COGS is valued (FIFO vs
 * weighted average) and what happens to existing stock's selling price when a
 * receipt arrives at a higher price. Persists to the receipt settings.
 */
export default function CostingSettingsModal({ isOpen, onClose }: Props) {
  const { t } = useTranslations();
  const { showToast } = useToast();

  const [costingMethod, setCostingMethod] = useState<CostingMethod>("AVERAGE");
  const [priceIncreaseMode, setPriceIncreaseMode] =
    useState<PriceIncreaseMode>("KEEP_OLD");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load current settings each time the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setIsLoading(true);
    getReceiptSettings()
      .then((s) => {
        if (!active) return;
        if (s.costingMethod) setCostingMethod(s.costingMethod);
        if (s.priceIncreaseMode) setPriceIncreaseMode(s.priceIncreaseMode);
      })
      .catch((e) => {
        if (active) showToast("error", (e as Error)?.message || "Failed to load");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen, showToast]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateReceiptSettings({ costingMethod, priceIncreaseMode });
      showToast("success", t("inventory.costingSaved") || "Сохранено");
      onClose();
    } catch (e) {
      showToast("error", (e as Error)?.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-[520px] m-4 p-6 sm:p-8"
    >
      <h4 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
        {t("inventory.costingTitle") || "Учёт себестоимости"}
      </h4>
      <p className="mb-3 text-theme-sm text-gray-500 dark:text-gray-400">
        {t("inventory.costingDescription") ||
          "Как считается себестоимость проданных товаров и что делать с ценой продажи при приходе по более высокой цене."}
      </p>
      <Link
        href="/receipts/costing-guide"
        onClick={onClose}
        className="mb-6 inline-block text-theme-sm font-medium text-brand-500 hover:underline"
      >
        {t("costingGuide.learnMore") || "Что это? Подробнее →"}
      </Link>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">
            {t("inventory.costingMethod") || "Метод себестоимости"}
          </label>
          <SelectField
            value={costingMethod}
            onChange={(v) => setCostingMethod(v as CostingMethod)}
            disabled={isLoading}
            options={[
              {
                value: "AVERAGE",
                label: t("inventory.methodAverage") || "Средневзвешенная",
              },
              { value: "FIFO", label: t("inventory.methodFifo") || "По партиям" },
            ]}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">
            {t("inventory.priceIncreaseMode") || "При росте цены продажи"}
          </label>
          <SelectField
            value={priceIncreaseMode}
            onChange={(v) => setPriceIncreaseMode(v as PriceIncreaseMode)}
            disabled={isLoading}
            options={[
              {
                value: "KEEP_OLD",
                label: t("inventory.keepOld") || "Оставить старую цену остаткам",
              },
              {
                value: "REPRICE_EXISTING",
                label:
                  t("inventory.repriceExisting") ||
                  "Поднять цену старым остаткам",
              },
            ]}
          />
        </div>
      </div>

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" size="md" onClick={onClose} disabled={isSaving}>
          {t("common.cancel") || "Отмена"}
        </Button>
        <Button type="button" size="md" onClick={handleSave} disabled={isSaving || isLoading}>
          {isSaving ? t("common.saving") || "..." : t("common.save") || "Сохранить"}
        </Button>
      </div>
    </Modal>
  );
}
