"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import { PlusIcon, AccountSettingsIcon } from "@/icons/index";
import SelectField from "@/components/form/SelectField";
import Pagination from "@/components/ui/pagination/Pagination";
import CostingSettingsModal from "./CostingSettingsModal";
import {
  getReceipts,
  getSuppliers,
  type GoodsReceipt,
  type Supplier,
} from "@/lib/api";

const ITEMS_PER_PAGE = 10;

function formatMoney(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(Math.round(n));
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function ReceiptsManagement() {
  const { t } = useTranslations();
  const { showToast } = useToast();
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierFilter, setSupplierFilter] = useState("");
  const [payFilter, setPayFilter] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);

  // Load suppliers once for the filter dropdown.
  useEffect(() => {
    let active = true;
    getSuppliers(1, 1000)
      .then((res) => {
        if (active) setSuppliers(res.suppliers);
      })
      .catch(() => {
        /* non-fatal: the list still works without the filter */
      });
    return () => {
      active = false;
    };
  }, []);

  // Reset to the first page whenever a filter changes.
  useEffect(() => {
    setPage(1);
  }, [supplierFilter, payFilter]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setIsLoading(true);
        const res = await getReceipts(
          page,
          ITEMS_PER_PAGE,
          supplierFilter || undefined,
          undefined,
          undefined,
          payFilter || undefined,
        );
        if (active) {
          setReceipts(res.receipts);
          setTotal(res.total);
        }
      } catch (err: unknown) {
        showToast("error", (err as Error)?.message || "Failed to load receipts", "Error");
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, supplierFilter, payFilter]);

  const payTabs: { key: string; label: string }[] = [
    { key: "", label: t("goodsReceipt.allPayments") },
    { key: "unpaid", label: t("goodsReceipt.statusUnpaid") },
    { key: "partial", label: t("goodsReceipt.statusPartial") },
    { key: "paid", label: t("goodsReceipt.statusPaid") },
  ];

  const docBadge = (r: GoodsReceipt) => {
    const draft = r.status === "draft";
    return (
      <span
        className={`rounded-full px-2.5 py-1 text-theme-xs font-medium ${
          draft
            ? "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400"
            : "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400"
        }`}
      >
        {draft
          ? t("goodsReceipt.statusDraft")
          : t("goodsReceipt.statusReceived")}
      </span>
    );
  };

  const statusBadge = (r: GoodsReceipt) => {
    const s = r.paymentStatus;
    const cls =
      s === "paid"
        ? "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400"
        : s === "partial"
          ? "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400"
          : "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400";
    const label =
      s === "paid"
        ? t("goodsReceipt.statusPaid")
        : s === "partial"
          ? t("goodsReceipt.statusPartial")
          : t("goodsReceipt.statusUnpaid");
    return (
      <span className={`rounded-full px-2.5 py-1 text-theme-xs font-medium ${cls}`}>
        {label}
      </span>
    );
  };

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("goodsReceipt.title")}
          </h3>
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            {t("goodsReceipt.description")}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {suppliers.length > 0 && (
            <SelectField
              value={supplierFilter}
              onChange={setSupplierFilter}
              placeholder={t("goodsReceipt.allSuppliers")}
              searchable
              searchPlaceholder={t("goodsReceipt.searchSupplier") || "Search supplier..."}
              className="min-w-[200px]"
              options={[
                { value: "", label: t("goodsReceipt.allSuppliers") },
                ...suppliers.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
          )}
          <button
            type="button"
            onClick={() => setConfigOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            <AccountSettingsIcon className="h-5 w-5" />
            {t("inventory.costingConfig") || t("common.settings") || "Настройки"}
          </button>
          <Link
            href="/receipts/new"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-theme-sm font-medium text-white shadow-theme-xs hover:bg-brand-600"
          >
            <PlusIcon />
            {t("goodsReceipt.create")}
          </Link>
        </div>
      </div>

      <CostingSettingsModal
        isOpen={configOpen}
        onClose={() => setConfigOpen(false)}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {payTabs.map((tb) => (
          <button
            key={tb.key || "all"}
            type="button"
            onClick={() => setPayFilter(tb.key)}
            className={
              payFilter === tb.key
                ? "rounded-lg bg-brand-500 px-3 py-1.5 text-theme-sm font-medium text-white"
                : "rounded-lg bg-gray-100 px-3 py-1.5 text-theme-sm font-medium text-gray-600 hover:bg-gray-200 dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.06]"
            }
          >
            {tb.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
        </div>
      ) : receipts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-[640px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-theme-xs uppercase tracking-wide text-gray-400 dark:border-gray-800">
                  <th className="px-3 py-3 font-medium">{t("goodsReceipt.date")}</th>
                  <th className="px-3 py-3 font-medium">{t("goodsReceipt.supplier")}</th>
                  <th className="px-3 py-3 font-medium">{t("goodsReceipt.docStatus")}</th>
                  <th className="px-3 py-3 font-medium text-right">{t("goodsReceipt.itemCount")}</th>
                  <th className="px-3 py-3 font-medium text-right">{t("goodsReceipt.total")}</th>
                  <th className="px-3 py-3 font-medium text-right">{t("goodsReceipt.paid")}</th>
                  <th className="px-3 py-3 font-medium">{t("goodsReceipt.paymentStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800/60 dark:hover:bg-white/[0.02]"
                  >
                    <td className="px-3 py-3">
                      <Link
                        href={`/receipts/${r.id}`}
                        className="font-medium text-brand-500 hover:underline"
                      >
                        {formatDate(r.createdAt)}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-gray-700 dark:text-gray-300">
                      {r.supplierName || "—"}
                    </td>
                    <td className="px-3 py-3">{docBadge(r)}</td>
                    <td className="px-3 py-3 text-right text-gray-700 dark:text-gray-300">{r.itemCount}</td>
                    <td className="px-3 py-3 text-right font-medium text-gray-800 dark:text-white/90">
                      {formatMoney(Number(r.totalAmount))}
                      {r.currency !== "UZS" ? ` ${r.currency}` : ""}
                    </td>
                    <td className="px-3 py-3 text-right text-gray-700 dark:text-gray-300">
                      {formatMoney(Number(r.paidAmount))}
                      {r.currency !== "UZS" ? ` ${r.currency}` : ""}
                    </td>
                    <td className="px-3 py-3">{statusBadge(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-gray-200 py-14 dark:border-gray-800">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            {t("goodsReceipt.noReceipts")}
          </p>
          <Link
            href="/receipts/new"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-theme-sm font-medium text-white shadow-theme-xs hover:bg-brand-600"
          >
            <PlusIcon />
            {t("goodsReceipt.create")}
          </Link>
        </div>
      )}

      {/* Pagination — always shown (controls disable on a single page) */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={total}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={(p) => setPage(Math.min(Math.max(1, p), totalPages))}
      />
    </div>
  );
}
