"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import { getReceipt, type GoodsReceipt } from "@/lib/api";

function formatMoney(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(Math.round(n));
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ReceiptDetail({ id }: { id: string }) {
  const { t } = useTranslations();
  const { showToast } = useToast();
  const [receipt, setReceipt] = useState<GoodsReceipt | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setIsLoading(true);
        const res = await getReceipt(id);
        if (active) setReceipt(res);
      } catch (err: unknown) {
        showToast("error", (err as Error)?.message || "Failed to load receipt", "Error");
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-12 dark:border-gray-800">
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          {t("goodsReceipt.notFound")}
        </p>
        <Link href="/receipts" className="mt-3 text-theme-sm text-brand-500 hover:underline">
          {t("goodsReceipt.backToList")}
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 pb-5 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("goodsReceipt.detailTitle")}
          </h3>
          <dl className="space-y-1 text-theme-sm text-gray-500 dark:text-gray-400">
            <div className="flex gap-2">
              <dt>{t("goodsReceipt.date")}:</dt>
              <dd className="text-gray-700 dark:text-gray-300">{formatDateTime(receipt.createdAt)}</dd>
            </div>
            <div className="flex gap-2">
              <dt>{t("goodsReceipt.supplier")}:</dt>
              <dd className="text-gray-700 dark:text-gray-300">{receipt.supplierName || "—"}</dd>
            </div>
            {receipt.note && (
              <div className="flex gap-2">
                <dt>{t("goodsReceipt.note")}:</dt>
                <dd className="text-gray-700 dark:text-gray-300">{receipt.note}</dd>
              </div>
            )}
          </dl>
        </div>
        <Link href="/receipts" className="text-theme-sm text-brand-500 hover:underline">
          {t("goodsReceipt.backToList")}
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[560px] w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-theme-xs uppercase tracking-wide text-gray-400 dark:border-gray-800">
              <th className="px-3 py-3 font-medium">{t("goodsReceipt.product")}</th>
              <th className="px-3 py-3 font-medium text-right">{t("goodsReceipt.quantity")}</th>
              <th className="px-3 py-3 font-medium text-right">{t("goodsReceipt.priceIn")}</th>
              <th className="px-3 py-3 font-medium text-right">{t("goodsReceipt.lineTotal")}</th>
            </tr>
          </thead>
          <tbody>
            {(receipt.items ?? []).map((item) => (
              <tr key={item.id} className="border-b border-gray-100 dark:border-gray-800/60">
                <td className="px-3 py-3 font-medium text-gray-800 dark:text-white/90">{item.productName}</td>
                <td className="px-3 py-3 text-right text-gray-700 dark:text-gray-300">{item.quantity}</td>
                <td className="px-3 py-3 text-right text-gray-700 dark:text-gray-300">
                  {formatMoney(Number(item.priceIn))}
                </td>
                <td className="px-3 py-3 text-right font-medium text-gray-800 dark:text-white/90">
                  {formatMoney(Number(item.lineTotal))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="px-3 py-3 text-right font-semibold text-gray-800 dark:text-white/90">
                {t("goodsReceipt.total")}
              </td>
              <td className="px-3 py-3 text-right font-semibold text-gray-800 dark:text-white/90">
                {formatMoney(Number(receipt.totalAmount))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
