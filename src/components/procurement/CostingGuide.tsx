"use client";

import React from "react";
import { useTranslations } from "@/hooks/useTranslations";

/** A single term + explanation block. */
function Term({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
      <h4 className="mb-1.5 text-base font-semibold text-gray-800 dark:text-white/90">
        {term}
      </h4>
      <p className="text-theme-sm leading-relaxed text-gray-600 dark:text-gray-300">
        {children}
      </p>
    </div>
  );
}

/**
 * Read-only educational page explaining the inventory costing terminology
 * (COGS, batch, FIFO, weighted average, batch selling price). Linked from the
 * costing settings on /receipts so users can learn what each option means.
 */
export default function CostingGuide() {
  const { t } = useTranslations();

  return (
    <div className="space-y-6 rounded-2xl border border-gray-200 bg-white px-4 pb-6 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div>
        <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
          {t("costingGuide.title") || "Учёт себестоимости — термины"}
        </h3>
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">
          {t("costingGuide.subtitle") ||
            "Краткое объяснение понятий, которые используются при приёмке товаров и расчёте прибыли."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Term term={t("costingGuide.cogsTerm") || "Себестоимость (COGS)"}>
          {t("costingGuide.cogsDesc") ||
            "Стоимость проданного товара по цене закупки. Прибыль = выручка − себестоимость. Фиксируется в момент продажи, поэтому отчёты не меняются при последующем изменении цен."}
        </Term>
        <Term term={t("costingGuide.batchTerm") || "Партия (Batch)"}>
          {t("costingGuide.batchDesc") ||
            "Поступление товара с конкретной ценой закупки и продажи. Каждый приход создаёт партию. Продажа списывает партии по очереди (старые — первыми)."}
        </Term>
        <Term term={t("costingGuide.fifoTerm") || "По партиям (FIFO)"}>
          {t("costingGuide.fifoDesc") ||
            "Себестоимость берётся из самой старой партии. Точно отражает реальную цену закупки каждой единицы. Удобно при росте цен."}
        </Term>
        <Term term={t("costingGuide.avgTerm") || "Средневзвешенная"}>
          {t("costingGuide.avgDesc") ||
            "Себестоимость — усреднённая цена закупки всех остатков. Сглаживает колебания цен. Поведение системы по умолчанию."}
        </Term>
      </div>

      {/* Worked example */}
      <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <h4 className="mb-1 text-base font-semibold text-gray-800 dark:text-white/90">
          {t("costingGuide.exampleTitle") || "Пример"}
        </h4>
        <p className="mb-4 text-theme-sm text-gray-600 dark:text-gray-300">
          {t("costingGuide.exampleIntro") ||
            "Партия 1: 3 шт по $9. Партия 2: 5 шт по $10. Продаём 5 шт:"}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-theme-xs uppercase tracking-wide text-gray-400 dark:border-gray-800">
                <th className="px-3 py-2 font-medium">
                  {t("costingGuide.colMethod") || "Метод"}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("costingGuide.colCogs") || "Себестоимость 5 шт"}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("costingGuide.colNote") || "Как считается"}
                </th>
              </tr>
            </thead>
            <tbody className="text-gray-700 dark:text-gray-300">
              <tr className="border-b border-gray-100 dark:border-gray-800/60">
                <td className="px-3 py-2 font-medium">
                  {t("costingGuide.fifoShort") || "По партиям"}
                </td>
                <td className="px-3 py-2">$47.00</td>
                <td className="px-3 py-2 text-gray-500 dark:text-gray-400">
                  3×$9 + 2×$10
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium">
                  {t("costingGuide.avgShort") || "Средневзвешенная"}
                </td>
                <td className="px-3 py-2">≈ $48.13</td>
                <td className="px-3 py-2 text-gray-500 dark:text-gray-400">
                  5 × $9.625
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Selling price by batch + reprice modes */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Term term={t("costingGuide.priceTerm") || "Цена продажи по партиям"}>
          {t("costingGuide.priceDesc") ||
            "У каждой партии своя цена продажи. По FIFO старый остаток продаётся по своей (старой) цене первым, новый — по новой."}
        </Term>
        <Term
          term={t("costingGuide.repriceTerm") || "При приходе по более высокой цене"}
        >
          {t("costingGuide.repriceDesc") ||
            "«Оставить старую цену остаткам» — старый остаток продаётся по старой цене, новый по новой. «Поднять цену старым остаткам» — весь остаток сразу переоценивается в новую цену."}
        </Term>
      </div>

      <p className="text-theme-xs text-gray-400 dark:text-gray-500">
        {t("costingGuide.note") ||
          "Метод себестоимости и поведение цены настраиваются для всего бизнеса в разделе приходов (кнопка «Настройки»)."}
      </p>
    </div>
  );
}
