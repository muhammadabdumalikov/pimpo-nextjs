"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import { PlusIcon, AccountSettingsIcon } from "@/icons/index";
import { RiFileExcel2Line } from "react-icons/ri";
import SelectField from "@/components/form/SelectField";
import Checkbox from "@/components/form/input/Checkbox";
import Pagination from "@/components/ui/pagination/Pagination";
import CostingSettingsModal from "./CostingSettingsModal";
import { exportReceiptsToExcel } from "@/lib/receiptsExcel";
import {
  getReceipts,
  getSuppliers,
  getBranches,
  type GoodsReceipt,
  type Supplier,
  type Branch,
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

// 24-hour HH:mm, matching the app's other list time stamps (uz-UZ).
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function ReceiptsManagement() {
  const { t } = useTranslations();
  const { showToast } = useToast();
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  // Filter option lists load independently of the table data. The filters stay
  // rendered while this is true so they don't pop in after the fetch.
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [supplierFilter, setSupplierFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [payFilter, setPayFilter] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);
  // Excel export: checkboxes are always visible; the "Excel" button exports the
  // selected orders. Selection persists across pages.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  // Load suppliers + branches once for the filter dropdowns. Errors are
  // non-fatal — the list still works; filters just show only the "all" option.
  useEffect(() => {
    let active = true;
    (async () => {
      const [sup, br] = await Promise.allSettled([
        getSuppliers(1, 1000),
        getBranches(),
      ]);
      if (!active) return;
      if (sup.status === "fulfilled") setSuppliers(sup.value.suppliers);
      if (br.status === "fulfilled") setBranches(br.value.branches);
      setFiltersLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Reset to the first page whenever a filter changes.
  useEffect(() => {
    setPage(1);
  }, [supplierFilter, branchFilter, payFilter]);

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
          undefined,
          branchFilter || undefined,
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
  }, [page, supplierFilter, branchFilter, payFilter]);

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

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allPageSelected =
    receipts.length > 0 && receipts.every((r) => selected.has(r.id));

  const toggleAllPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) receipts.forEach((r) => next.delete(r.id));
      else receipts.forEach((r) => next.add(r.id));
      return next;
    });
  };

  const doExport = async () => {
    if (selected.size === 0) return;
    setExporting(true);
    try {
      await exportReceiptsToExcel([...selected], t);
      showToast("success", t("goodsReceipt.exportDone"), "Success");
      setSelected(new Set());
    } catch (err: unknown) {
      showToast("error", (err as Error)?.message || "Export failed", "Error");
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  return (
    <div className="min-h-fill overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      {/* Zone 1 — identity + primary action */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("goodsReceipt.title")}
          </h3>
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            {t("goodsReceipt.description")}
          </p>
        </div>
        <Link
          href="/receipts/new"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-theme-sm font-medium text-white shadow-theme-xs hover:bg-brand-600"
        >
          <PlusIcon />
          {t("goodsReceipt.create")}
        </Link>
      </div>

      {/* Toolbar: filters (left) · tools (right) */}
      <div className="mb-4 flex flex-col gap-3 border-t border-gray-100 pt-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SelectField
            value={payFilter}
            onChange={setPayFilter}
            placeholder={t("goodsReceipt.allPayments")}
            className="min-w-[170px]"
            options={payTabs.map((tb) => ({ value: tb.key, label: tb.label }))}
          />
          {(filtersLoading || branches.length > 1) && (
            <SelectField
              value={branchFilter}
              onChange={setBranchFilter}
              placeholder={t("goodsReceipt.allBranches")}
              className="min-w-[180px]"
              loading={filtersLoading}
              options={[
                { value: "", label: t("goodsReceipt.allBranches") },
                ...branches.map((b) => ({ value: b.id, label: b.name })),
              ]}
            />
          )}
          {(filtersLoading || suppliers.length > 0) && (
            <SelectField
              value={supplierFilter}
              onChange={setSupplierFilter}
              placeholder={t("goodsReceipt.allSuppliers")}
              searchable
              searchPlaceholder={t("goodsReceipt.searchSupplier") || "Search supplier..."}
              className="min-w-[200px]"
              loading={filtersLoading}
              options={[
                { value: "", label: t("goodsReceipt.allSuppliers") },
                ...suppliers.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={doExport}
            disabled={exporting || selected.size === 0}
            className="inline-flex h-[42px] items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            <RiFileExcel2Line className="h-5 w-5 text-success-600 dark:text-success-500" />
            {exporting
              ? t("goodsReceipt.exporting")
              : selected.size > 0
                ? `Excel (${selected.size})`
                : "Excel"}
          </button>
          <button
            type="button"
            onClick={() => setConfigOpen(true)}
            title={t("inventory.costingConfig") || t("common.settings") || "Настройки"}
            aria-label={t("inventory.costingConfig") || t("common.settings") || "Настройки"}
            className="inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            <AccountSettingsIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <CostingSettingsModal
        isOpen={configOpen}
        onClose={() => setConfigOpen(false)}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
        </div>
      ) : receipts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-theme-xs uppercase tracking-wide text-gray-400 dark:border-gray-800">
                  <th className="w-10 px-3 py-3 font-medium">
                    <Checkbox checked={allPageSelected} onChange={toggleAllPage} />
                  </th>
                  <th className="px-3 py-3 font-medium">{t("goodsReceipt.date")}</th>
                  <th className="px-3 py-3 font-medium">{t("goodsReceipt.branch")}</th>
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
                      <Checkbox
                        checked={selected.has(r.id)}
                        onChange={() => toggleOne(r.id)}
                      />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <Link
                        href={`/receipts/${r.id}`}
                        className="font-medium text-brand-500 hover:underline"
                      >
                        {formatDate(r.createdAt)}
                      </Link>
                      <span className="mt-0.5 block text-theme-xs text-gray-400 dark:text-gray-500">
                        {formatTime(r.createdAt)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-700 dark:text-gray-300">
                      {r.branchName || "—"}
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
