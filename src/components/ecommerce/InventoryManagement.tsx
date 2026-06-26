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
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setIsLoading(true);
        const res = await getProducts(1, 1000);
        if (active) setProducts(res.products);
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
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.code ?? "").toLowerCase().includes(q) ||
        (p.barcode ?? "").toLowerCase().includes(q),
    );
  }, [products, searchQuery]);

  const stats = useMemo(() => {
    let inStock = 0;
    let low = 0;
    let out = 0;
    for (const p of filtered) {
      const s = stockStatus(p.quantity);
      if (s === "in") inStock++;
      else if (s === "low") low++;
      else out++;
    }
    return { total: filtered.length, inStock, low, out };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const page = Math.min(currentPage, totalPages);
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const paginated = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleExport = () => {
    const header = ["Name", "Code", "Barcode", "Quantity"];
    const rows = filtered.map((p) => [
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
          disabled={filtered.length === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
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
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-12 dark:border-gray-800">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">{t("inventory.noItems")}</p>
        </div>
      ) : (
        <>
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between py-4">
              <p className="text-theme-sm text-gray-500 dark:text-gray-400">
                {t("inventory.showing")} {startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, filtered.length)} {t("inventory.of")} {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-theme-sm text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400"
                >
                  ‹
                </button>
                <span className="text-theme-sm text-gray-600 dark:text-gray-400">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-theme-sm text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400"
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
