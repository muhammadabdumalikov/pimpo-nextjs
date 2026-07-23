"use client";
import { useState, useEffect, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import { CalenderIcon } from "@/icons/index";
import { useTranslations } from "@/hooks/useTranslations";
import { storeToday } from "@/lib/reportFormat";
import flatpickr from "flatpickr";
import { getFlatpickrLocale } from "@/lib/flatpickrLocale";
import { getSalesByEmployee, type SalesByEmployeeRow } from "@/lib/api";

const formatUZS = (amount: number) =>
  `${new Intl.NumberFormat("uz-UZ").format(Math.round(amount))} so'm`;

const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

export default function StaffSales() {
  const { t, locale } = useTranslations();
  const datePickerRef = useRef<HTMLInputElement>(null);

  const today = storeToday();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    firstDay,
    lastDay,
  ]);

  const [rows, setRows] = useState<SalesByEmployeeRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Date range picker.
  useEffect(() => {
    if (!datePickerRef.current) return;
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
        } else if (selectedDates.length === 0) {
          setDateRange([null, null]);
        }
        (instance.element as HTMLInputElement).value = dateStr.replace(
          "to",
          " - ",
        );
      },
      onReady: (_, dateStr, instance) => {
        (instance.element as HTMLInputElement).value = dateStr.replace(
          "to",
          " - ",
        );
      },
    });
    return () => {
      if (!Array.isArray(fp)) fp.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  // Fetch whenever the server-side date range changes.
  useEffect(() => {
    let active = true;
    const [from, to] = dateRange;
    (async () => {
      try {
        setIsLoading(true);
        setError("");
        const data = await getSalesByEmployee(
          from ? toISODate(from) : undefined,
          to ? toISODate(to) : undefined,
        );
        if (active) setRows(data);
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

  const totalOrders = rows.reduce((s, r) => s + r.orderCount, 0);
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);

  return (
    <div className="min-h-fill overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("staffSales.title")}
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            {t("staffSales.description")}
          </p>
        </div>
        <div className="relative sm:w-64">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            <CalenderIcon className="size-5" />
          </span>
          <input
            ref={datePickerRef}
            type="text"
            placeholder={t("staffSales.selectDateRange")}
            className="h-11 w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-12 pr-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30"
          />
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <Table className="w-full">
          <TableHeader className="border-y border-gray-100 dark:border-gray-800">
            <TableRow>
              <TableCell isHeader className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 sm:px-6">
                {t("staffSales.employee")}
              </TableCell>
              <TableCell isHeader className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 sm:px-6">
                {t("staffSales.orders")}
              </TableCell>
              <TableCell isHeader className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 sm:px-6">
                {t("staffSales.revenue")}
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading ? (
              <TableRow>
                <TableCell className="px-4 py-6 text-center text-gray-400 text-theme-sm sm:px-6">
                  {t("common.loading")}
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell className="px-4 py-6 text-center text-error-500 text-theme-sm sm:px-6">
                  {error}
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell className="px-4 py-6 text-center text-gray-400 text-theme-sm sm:px-6">
                  {t("staffSales.noData")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow
                  key={r.cashierId ?? "unassigned"}
                  className="transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                >
                  <TableCell className="px-4 py-3 sm:px-6">
                    <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                      {r.cashierName ?? t("staffSales.unassigned")}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400 sm:px-6">
                    {r.orderCount}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90 sm:px-6">
                    {formatUZS(r.revenue)}
                  </TableCell>
                </TableRow>
              ))
            )}

            {!isLoading && !error && rows.length > 0 && (
              <TableRow className="bg-gray-50/60 dark:bg-white/[0.02]">
                <TableCell className="px-4 py-3 text-theme-sm font-semibold text-gray-800 dark:text-white/90 sm:px-6">
                  {t("staffSales.total")}
                </TableCell>
                <TableCell className="px-4 py-3 text-theme-sm font-semibold text-gray-800 dark:text-white/90 sm:px-6">
                  {totalOrders}
                </TableCell>
                <TableCell className="px-4 py-3 text-theme-sm font-semibold text-brand-600 dark:text-brand-400 sm:px-6">
                  {formatUZS(totalRevenue)}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
