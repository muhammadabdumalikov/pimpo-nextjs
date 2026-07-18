"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Image from "next/image";
import { ArrowUpIcon, ArrowDownIcon, CalenderIcon } from "@/icons/index";
import { RiFileExcel2Line } from "react-icons/ri";
import { useTranslations } from "@/hooks/useTranslations";
import Badge from "../ui/badge/Badge";
import SelectField from "../form/SelectField";
import flatpickr from "flatpickr";
import { getFlatpickrLocale } from "@/lib/flatpickrLocale";
import { getProductPerformance, type ProductPerformanceRow } from "@/lib/api";

type SortKey = "revenue" | "profit" | "sales";

// UZS amounts, formatted the same way as the rest of the dashboard.
const formatUZS = (amount: number) =>
  `${new Intl.NumberFormat("uz-UZ").format(Math.round(amount))} so'm`;

const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

export default function ProductPerformance() {
  const { t, locale } = useTranslations();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortKey>("revenue");
  const datePickerRef = useRef<HTMLInputElement>(null);
  const itemsPerPage = 7;

  const [data, setData] = useState<ProductPerformanceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

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
  }, [dateRange]);

  // Initialize date picker
  useEffect(() => {
    if (!datePickerRef.current) return;

    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const fp = flatpickr(datePickerRef.current, {
      mode: "range",
      static: false,
      monthSelectorType: "static",
      dateFormat: "d.m.y",
      defaultDate: [firstDay, lastDay],
      clickOpens: true,
      locale: getFlatpickrLocale(locale),
      onChange: (selectedDates, dateStr, instance) => {
        if (selectedDates.length === 2) {
          setDateRange([selectedDates[0], selectedDates[1]]);
          setCurrentPage(1);
        } else if (selectedDates.length === 0) {
          setDateRange([null, null]);
          setCurrentPage(1);
        }
        (instance.element as HTMLInputElement).value = dateStr.replace('to', ' - ');
      },
      onReady: (_, dateStr, instance) => {
        (instance.element as HTMLInputElement).value = dateStr.replace('to', ' - ');
      },
    });

    return () => {
      if (!Array.isArray(fp)) {
        fp.destroy();
      }
    };
  }, [locale]);

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
    const header = [
      t("productPerformance.product"),
      t("productPerformance.category"),
      t("productPerformance.sales"),
      t("productPerformance.revenue"),
      t("productPerformance.profit"),
      t("productPerformance.profitMargin"),
    ];
    const rows = filteredProducts.map((p) => [
      p.name,
      p.category ?? "",
      String(p.unitsSold),
      String(Math.round(p.revenue)),
      String(Math.round(p.profit)),
      `${p.profitMargin.toFixed(1)}%`,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "product-performance.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Main Performance Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-2">
              {t('productPerformance.topTenProducts')}
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              disabled
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
            >
              <RiFileExcel2Line className="h-5 w-5 text-success-600 dark:text-success-500" />
              {t('productPerformance.export')}
            </button>
          </div>
        </div>

        {/* Search and Sort */}
        <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <span className="absolute -translate-y-1/2 left-4 top-1/2 pointer-events-none">
              <svg
                className="fill-gray-500 dark:fill-gray-400"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z"
                  fill=""
                />
              </svg>
            </span>
            <input
              type="text"
              placeholder={t('productPerformance.search')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="h-11 w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-12 pr-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>

          <div className="relative">
            <input
              ref={datePickerRef}
              type="text"
              placeholder={t('productPerformance.selectDateRange')}
              className="h-11 w-full sm:w-auto min-w-[200px] rounded-lg border border-gray-200 bg-white px-4 py-2.5 pl-12 pr-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
            <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none left-4 top-1/2 dark:text-gray-400">
              <CalenderIcon />
            </span>
          </div>

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
        </div>

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
      </div>
    </div>
  );
}
