"use client";
import { useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import { useTranslations } from "@/hooks/useTranslations";
import ReportShell, { ReportKpi, ReportFilterField } from "./ReportShell";
import { ReportTableSkeleton } from "./ReportSkeleton";
import ReportDateRange from "./ReportDateRange";
import ReportBranchFilter from "./ReportBranchFilter";
import ReportCompareToggle from "./ReportCompareToggle";
import { getSellersReport, type SellerReportRow } from "@/lib/api";
import { currentMonthRange, formatMoney, formatNumber, rangeLabel, toISODate } from "@/lib/reportFormat";
import { useReportComparison } from "@/hooks/useReportComparison";
import { deltaPct, type CompareMode } from "@/lib/reportCompare";
import { exportAoaToExcel } from "@/lib/exportExcel";

const th = "py-3 px-4 sm:px-6 font-medium text-gray-500 text-sm dark:text-gray-400";

export default function SellersReport() {
  const { t } = useTranslations();
  const [range, setRange] = useState<[Date | null, Date | null]>(currentMonthRange());
  const [branchId, setBranchId] = useState("");
  const [rows, setRows] = useState<SellerReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [compare, setCompare] = useState<CompareMode>("off");
  const som = t("reportsPage.som");
  const money = (n: number) => formatMoney(n, som);

  const { prev } = useReportComparison(compare, range, [branchId], (f, tt) =>
    getSellersReport(f, tt, branchId || undefined),
  );

  useEffect(() => {
    let active = true;
    const [from, to] = range;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const d = await getSellersReport(
          from ? toISODate(from) : undefined,
          to ? toISODate(to) : undefined,
          branchId || undefined,
        );
        if (active) setRows(d);
      } catch (e) {
        if (active) setError((e as Error)?.message || "Failed to load");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [range, branchId]);

  const totals = useMemo(() => {
    const revenue = rows.reduce((s, r) => s + r.revenue, 0);
    const orders = rows.reduce((s, r) => s + r.orderCount, 0);
    return { sellers: rows.length, revenue, orders, avgCheck: orders > 0 ? revenue / orders : 0 };
  }, [rows]);

  const prevTotals = useMemo(() => {
    if (!prev) return null;
    const revenue = prev.reduce((s, r) => s + r.revenue, 0);
    const orders = prev.reduce((s, r) => s + r.orderCount, 0);
    return { sellers: prev.length, revenue, orders, avgCheck: orders > 0 ? revenue / orders : 0 };
  }, [prev]);
  const delta = (k: keyof typeof totals) =>
    prevTotals ? deltaPct(totals[k], prevTotals[k]) : undefined;

  const handleExport = () => {
    const aoa: (string | number)[][] = [
      [
        t("reportsPage.seller"),
        t("reportsPage.orders"),
        t("reportsPage.revenue"),
        t("reportsPage.avgCheck"),
        t("reportsPage.avgItems"),
      ],
      ...rows.map((r) => [
        r.cashierName,
        r.orderCount,
        Math.round(r.revenue),
        Math.round(r.avgCheck),
        r.avgItemsPerCheck.toFixed(1),
      ]),
    ];
    exportAoaToExcel("sellers-report", aoa, "Sellers");
  };

  const kpis = (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <ReportKpi label={t("reportsPage.seller")} value={formatNumber(totals.sellers)} delta={delta("sellers")} />
      <ReportKpi label={t("reportsPage.orders")} value={formatNumber(totals.orders)} delta={delta("orders")} />
      <ReportKpi label={t("reportsPage.revenue")} value={money(totals.revenue)} tone="success" delta={delta("revenue")} />
      <ReportKpi label={t("reportsPage.avgCheck")} value={money(totals.avgCheck)} delta={delta("avgCheck")} />
    </div>
  );

  return (
    <ReportShell
      title={t("sidebar.reportsSellers")}
      filterSummary={rangeLabel(range)}
      activeFilterCount={(branchId ? 1 : 0) + (compare !== "off" ? 1 : 0)}
      filters={
        <>
          <ReportFilterField label={t("reportsPage.period")}>
            <ReportDateRange value={range} onChange={setRange} />
          </ReportFilterField>
          <ReportCompareToggle value={compare} onChange={setCompare} />
          <ReportBranchFilter value={branchId} onChange={setBranchId} />
        </>
      }
      kpis={kpis}
      onExport={handleExport}
      exportDisabled={loading || rows.length === 0}
    >
      <div className="w-full overflow-x-auto -mx-4 sm:-mx-6 tabular-nums">
        <Table className="w-full min-w-[720px]">
          <TableHeader className="border-y border-gray-100 dark:border-gray-800">
            <TableRow>
              <TableCell isHeader className={`${th} text-start`}>{t("reportsPage.seller")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.orders")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.revenue")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.avgCheck")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.avgItems")}</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <ReportTableSkeleton columns={5} />
            ) : error ? (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-error-500">{error}</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-gray-500 dark:text-gray-400">{t("reportsPage.noData")}</TableCell></TableRow>
            ) : (
              rows.map((r, i) => (
                <TableRow key={r.cashierId ?? i} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                  <TableCell className="py-3 px-4 sm:px-6 text-gray-800 font-medium dark:text-white/90">{r.cashierName}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-800 dark:text-white/90">{formatNumber(r.orderCount)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end font-medium text-success-600 dark:text-success-500">{money(r.revenue)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-800 dark:text-white/90">{money(r.avgCheck)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-500 dark:text-gray-400">{r.avgItemsPerCheck.toFixed(1)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </ReportShell>
  );
}
