"use client";
import { useState, useEffect, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Image from "next/image";
import { ArrowUpIcon, ArrowDownIcon } from "@/icons/index";
import { useTranslations } from "@/hooks/useTranslations";
import Badge from "../ui/badge/Badge";
import SelectField from "../form/SelectField";
import ReportShell, { ReportFilterField } from "../reports/ReportShell";
import ReportSearch from "../reports/ReportSearch";
import ReportDateRange from "../reports/ReportDateRange";
import ReportBranchFilter from "../reports/ReportBranchFilter";
import { rangeLabel } from "@/lib/reportFormat";
import { getProductPerformance, type ProductPerformanceRow } from "@/lib/api";
import { exportAoaToExcel } from "@/lib/exportExcel";

type SortKey = "revenue" | "profit" | "sales";

// UZS amounts, formatted the same way as the rest of the dashboard.
const formatUZS = (amount: number) =>
  `${new Intl.NumberFormat("uz-UZ").format(Math.round(amount))} so'm`;

const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

export default function ProductPerformance() {
  const { t } = useTranslations();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortKey>("revenue");
  const itemsPerPage = 7;

  const [data, setData] = useState<ProductPerformanceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [branchId, setBranchId] = useState("");

  // Default to the current month.
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    firstDayOfMonth,
    lastDayOfMonth,
  ]);

  // Fetch whenever the (server-side) date range changes.
  useEffect(() => {
    let active = true;
    const [from, to] = dateRange;
    (async () => {
      try {
        setIsLoading(true);
        setError("");
        const rows = await getProductPerformance(
          from ? toISODate(from) : undefined,
          to ? toISODate(to) : undefined,
          branchId || undefined,
        );
        if (active) setData(rows);
      } catch (e: unknown) {
        if (active) setError((e as Error)?.message || "Failed to load");
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [dateRange, branchId]);


  // Search + sort happen client-side over the fetched rows.
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return data
      .filter((product) => {
        if (!q) return true;
        return (
          product.name.toLowerCase().includes(q) ||
          (product.code ?? "").toLowerCase().includes(q) ||
          (product.category ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "revenue":
            return b.revenue - a.revenue;
          case "profit":
            return b.profit - a.profit;
          case "sales":
            return b.unitsSold - a.unitsSold;
          default:
            return 0;
        }
      });
  }, [data, searchQuery, sortBy]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleExport = () => {
    const aoa: (string | number)[][] = [
      [
        t("productPerformance.product"),
        t("productPerformance.category"),
        t("productPerformance.sales"),
        t("productPerformance.revenue"),
        t("productPerformance.profit"),
        t("productPerformance.profitMargin"),
      ],
      ...filteredProducts.map((p) => [
        p.name,
        p.category ?? "",
        p.unitsSold,
        Math.round(p.revenue),
        Math.round(p.profit),
        `${p.profitMargin.toFixed(1)}%`,
      ]),
    ];
    exportAoaToExcel("product-performance", aoa, "Products");
  };

  return (
    <ReportShell
      title={t('productPerformance.topTenProducts')}
      filterSummary={rangeLabel(dateRange)}
      activeFilterCount={(branchId ? 1 : 0) + (sortBy !== "revenue" ? 1 : 0)}
      search={
        <ReportSearch
          value={searchQuery}
          onChange={(v) => { setSearchQuery(v); setCurrentPage(1); }}
          placeholder={t('productPerformance.search')}
        />
      }
      filters={
        <>
          <ReportFilterField label={t('reportsPage.period')}>
            <ReportDateRange
              value={dateRange}
              onChange={(r) => { setDateRange(r); setCurrentPage(1); }}
            />
          </ReportFilterField>
          <ReportBranchFilter
            value={branchId}
            onChange={(v) => { setBranchId(v); setCurrentPage(1); }}
          />
          <ReportFilterField label={t('reportsPage.sortLabel')}>
            <SelectField
              className="min-w-[180px]"
              value={sortBy}
              onChange={(value) => setSortBy(value as SortKey)}
              options={[
                { value: "revenue", label: t('productPerformance.sortByRevenue') },
                { value: "profit", label: t('productPerformance.sortByProfit') },
                { value: "sales", label: t('productPerformance.sortBySales') },
              ]}
            />
          </ReportFilterField>
        </>
      }
      onExport={handleExport}
      exportDisabled={filteredProducts.length === 0}
    >
      {/* Table */}
        <div className="w-full overflow-x-auto -mx-4 sm:-mx-6" style={{ scrollbarGutter: 'stable' }}>
          <Table className="w-full min-w-[760px]! [table-layout:fixed]">
            <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
              <TableRow>
                <TableCell
                  isHeader
                  className="py-3 pr-4 sm:pl-12 sm:pr-6 font-medium text-gray-500 text-start text-sm dark:text-gray-400 w-[30%]"
                >
                  {t('productPerformance.product')}
                </TableCell>
                <TableCell
                  isHeader
                  className="py-3 px-4 sm:px-6 font-medium text-gray-500 text-start text-sm dark:text-gray-400 w-[14%]"
                >
                  {t('productPerformance.sales')}
                </TableCell>
                <TableCell
                  isHeader
                  className="py-3 px-4 sm:px-6 font-medium text-gray-500 text-start text-sm dark:text-gray-400 w-[18%]"
                >
                  {t('productPerformance.revenue')}
                </TableCell>
                <TableCell
                  isHeader
                  className="py-3 px-4 sm:px-6 font-medium text-gray-500 text-start text-sm dark:text-gray-400 w-[18%]"
                >
                  {t('productPerformance.profit')}
                </TableCell>
                <TableCell
                  isHeader
                  className="py-3 px-4 sm:px-6 font-medium text-gray-500 text-start text-sm dark:text-gray-400 w-[20%]"
                >
                  {t('productPerformance.profitMargin')}
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-gray-500 dark:text-gray-400">
                    …
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-error-500">
                    {error}
                  </TableCell>
                </TableRow>
              ) : paginatedProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-gray-500 dark:text-gray-400">
                    {t('productPerformance.showing')} 0 {t('productPerformance.results')}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedProducts.map((product) => (
                  <TableRow key={product.productId ?? product.name} className="transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <TableCell className="py-3 pr-4 sm:pl-12 sm:pr-6 w-[30%]">
                      <div className="flex items-center gap-3">
                        <div className="h-[50px] w-[50px] overflow-hidden rounded-md bg-gray-100 dark:bg-white/[0.03]">
                          <Image
                            width={50}
                            height={50}
                            src={product.image || "/images/product/product-01.jpg"}
                            className="h-[50px] w-[50px] object-cover"
                            alt={product.name}
                          />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-base dark:text-white/90">
                            {product.name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {product.code || product.category || "—"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-4 sm:px-6 w-[14%] text-gray-500 text-base dark:text-gray-400">
                      {product.unitsSold}
                    </TableCell>
                    <TableCell className="py-3 px-4 sm:px-6 w-[18%] text-gray-800 text-base font-medium dark:text-white/90">
                      {formatUZS(product.revenue)}
                    </TableCell>
                    <TableCell className="py-3 px-4 sm:px-6 w-[18%] text-base font-medium text-success-600 dark:text-success-500">
                      {formatUZS(product.profit)}
                    </TableCell>
                    <TableCell className="py-3 px-4 sm:px-6 w-[20%]">
                      <Badge color={product.profit >= 0 ? "success" : "error"}>
                        {product.profit >= 0 ? <ArrowUpIcon /> : <ArrowDownIcon />}
                        {product.profitMargin.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-4 pt-4 mt-4 -mx-4 sm:-mx-6 px-4 sm:px-6 border-t border-gray-100 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {t('productPerformance.showing')} {filteredProducts.length > 0 ? startIndex + 1 : 0} {t('productPerformance.to')}{" "}
            {Math.min(endIndex, filteredProducts.length)} {t('productPerformance.of')} {filteredProducts.length} {t('productPerformance.results')}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center justify-center h-10 w-10 rounded-lg border border-gray-300 bg-white text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                let page;
                if (totalPages <= 3) {
                  page = i + 1;
                } else if (currentPage === 1) {
                  page = i + 1;
                } else if (currentPage === totalPages) {
                  page = totalPages - 2 + i;
                } else {
                  page = currentPage - 1 + i;
                }
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`flex w-10 h-10 items-center justify-center rounded-lg text-sm font-medium ${currentPage === page
                        ? "bg-brand-500 text-white"
                        : "text-gray-700 hover:bg-blue-500/[0.08] hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-500"
                      }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
              className="flex items-center justify-center h-10 w-10 rounded-lg border border-gray-300 bg-white text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
    </ReportShell>
  );
}
