"use client";
import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import { DownloadIcon } from "@/icons/index";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import Badge from "../ui/badge/Badge";
import Pagination from "../ui/pagination/Pagination";
import { getProducts, type Product } from "@/lib/api";

const LOW_STOCK_THRESHOLD = 10;
const ITEMS_PER_PAGE = 10;

type StockStatus = "in" | "low" | "out";

function stockStatus(qty: number): StockStatus {
  if (qty <= 0) return "out";
  if (qty <= LOW_STOCK_THRESHOLD) return "low";
  return "in";
}

export default function InventoryManagement() {
  const { t } = useTranslations();
  const { showToast } = useToast();
  // The current page of rows from the server (search + pagination are backend).
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  // Debounce the search box, and reset to the first page when the query changes.
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [searchQuery]);

  // Fetch the current page from the backend (server filters by name/code/barcode).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setIsLoading(true);
        const res = await getProducts(
          currentPage,
          ITEMS_PER_PAGE,
          debouncedSearch || undefined,
        );
        if (active) {
          setProducts(res.products);
          setTotal(res.total);
        }
      } catch (err: unknown) {
        showToast("error", (err as Error)?.message || "Failed to load inventory", "Error");
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, debouncedSearch]);

  // Stock-status counts for the current page (Total reflects all matching rows).
  const stats = useMemo(() => {
    let inStock = 0;
    let low = 0;
    let out = 0;
    for (const p of products) {
      const s = stockStatus(p.quantity);
      if (s === "in") inStock++;
      else if (s === "low") low++;
      else out++;
    }
    return { total, inStock, low, out };
  }, [products, total]);

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
  const page = Math.min(currentPage, totalPages);
  const paginated = products;

  const handleExport = async () => {
    // Export every matching row, not just the current page.
    setIsExporting(true);
    try {
      const res = await getProducts(1, Math.max(total, 1), debouncedSearch || undefined);
      const header = ["Name", "Code", "Barcode", "Quantity"];
      const rows = res.products.map((p) => [
        p.name,
        p.code ?? "",
        p.barcode ?? "",
        String(p.quantity),
      ]);
      const csv = [header, ...rows]
        .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
        .join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "inventory.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      showToast("error", (err as Error)?.message || "Failed to export inventory", "Error");
    } finally {
      setIsExporting(false);
    }
  };

  const statusBadge = (qty: number) => {
    const s = stockStatus(qty);
    if (s === "out") return <Badge color="error">{t("inventory.outOfStock")}</Badge>;
    if (s === "low") return <Badge color="warning">{t("inventory.lowStock")}</Badge>;
    return <Badge color="success">{t("inventory.inStock")}</Badge>;
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("inventory.title")}
          </h3>
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            {t("inventory.description")}
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
        >
          <DownloadIcon />
          {t("inventory.export")}
        </button>
      </div>

      {/* Stat cards */}
      <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">{t("inventory.totalItems")}</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white/90">{stats.total}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">{t("inventory.inStock")}</p>
          <p className="text-2xl font-bold text-success-600 dark:text-success-500">{stats.inStock}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">{t("inventory.lowStock")}</p>
          <p className="text-2xl font-bold text-warning-600 dark:text-warning-500">{stats.low}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">{t("inventory.outOfStock")}</p>
          <p className="text-2xl font-bold text-error-600 dark:text-error-500">{stats.out}</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4 max-w-md">
        <input
          type="text"
          placeholder={t("inventory.search")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-12 dark:border-gray-800">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">{t("inventory.noItems")}</p>
        </div>
      ) : (
        <div className="custom-scrollbar overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-gray-800">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                    {t("inventory.product")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                    {t("inventory.code")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                    {t("inventory.barcode")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                    {t("inventory.stock")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                    {t("inventory.status")}
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {paginated.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                          {p.image ? (
                            <Image src={p.image} alt={p.name} width={40} height={40} className="h-full w-full object-cover" unoptimized />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-gray-500">
                              {p.name.slice(0, 1)}
                            </span>
                          )}
                        </div>
                        <span className="font-medium text-gray-800 dark:text-white/90">{p.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-3 text-theme-sm text-gray-500 dark:text-gray-400">{p.code || "—"}</TableCell>
                    <TableCell className="px-5 py-3 text-theme-sm text-gray-500 dark:text-gray-400">{p.barcode || "—"}</TableCell>
                    <TableCell className="px-5 py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">
                      {p.quantity} {p.quantityType || ""}
                    </TableCell>
                    <TableCell className="px-5 py-3">{statusBadge(p.quantity)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
      )}

      {/* Pagination — always shown (controls disable on a single page) */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={total}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={(p) => setCurrentPage(Math.min(Math.max(1, p), totalPages))}
      />
    </div>
  );
}
