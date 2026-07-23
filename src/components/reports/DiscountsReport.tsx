"use client";
import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import { useTranslations } from "@/hooks/useTranslations";
import ReportShell, { ReportKpi, ReportFilterField } from "./ReportShell";
import { ReportTableSkeleton } from "./ReportSkeleton";
import ReportDateRange from "./ReportDateRange";
import ReportBranchFilter from "./ReportBranchFilter";
import ReportCompareToggle from "./ReportCompareToggle";
import { getDiscountsReport, type DiscountsReport as DiscountsData } from "@/lib/api";
import { currentMonthRange, formatMoney, formatNumber, rangeLabel, toISODate } from "@/lib/reportFormat";
import { useReportComparison } from "@/hooks/useReportComparison";
import { deltaPct, type CompareMode } from "@/lib/reportCompare";
import { exportAoaToExcel } from "@/lib/exportExcel";

const th = "py-3 px-4 sm:px-6 font-medium text-gray-500 text-sm dark:text-gray-400";

export default function DiscountsReport() {
  const { t } = useTranslations();
  const [range, setRange] = useState<[Date | null, Date | null]>(currentMonthRange());
  const [branchId, setBranchId] = useState("");
  const [data, setData] = useState<DiscountsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [compare, setCompare] = useState<CompareMode>("off");
  const som = t("reportsPage.som");
  const money = (n: number) => formatMoney(n, som);

  const { prev } = useReportComparison(compare, range, [branchId], (f, tt) =>
    getDiscountsReport(f, tt, branchId || undefined),
  );
  const delta = (k: keyof DiscountsData["totals"]) =>
    prev && data ? deltaPct(data.totals[k], prev.totals[k]) : undefined;

  useEffect(() => {
    let active = true;
    const [from, to] = range;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const d = await getDiscountsReport(
          from ? toISODate(from) : undefined,
          to ? toISODate(to) : undefined,
          branchId || undefined,
        );
        if (active) setData(d);
      } catch (e) {
        if (active) setError((e as Error)?.message || "Failed to load");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [range, branchId]);

  // Only cashiers who actually gave a discount are worth listing.
  const sellers = (data?.sellers ?? []).filter((s) => s.discountTotal > 0);
  const totals = data?.totals;

  const handleExport = () => {
    if (!data) return;
    const aoa: (string | number)[][] = [
      [
        t("reportsPage.seller"),
        t("reportsPage.orders"),
        t("reportsPage.discountedOrders"),
        t("reportsPage.discountTotal"),
        t("reportsPage.discountRate"),
      ],
      ...sellers.map((s) => [
        s.cashierName,
        s.orderCount,
        s.discountedOrders,
        Math.round(s.discountTotal),
        `${s.discountRate.toFixed(1)}%`,
      ]),
    ];
    exportAoaToExcel("discounts-report", aoa, "Discounts");
  };

  const kpis = totals ? (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <ReportKpi label={t("reportsPage.discountTotal")} value={money(totals.discountTotal)} tone="error" delta={delta("discountTotal")} deltaInverse />
      <ReportKpi label={t("reportsPage.discountedOrders")} value={formatNumber(totals.discountedOrders)} delta={delta("discountedOrders")} deltaInverse />
      <ReportKpi label={t("reportsPage.discountRate")} value={`${totals.discountRate.toFixed(1)}%`} delta={delta("discountRate")} deltaInverse />
      <ReportKpi label={t("reportsPage.revenue")} value={money(totals.revenue)} tone="success" delta={delta("revenue")} />
    </div>
  ) : null;

  return (
    <ReportShell
      title={t("sidebar.reportsDiscounts")}
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
      exportDisabled={!data || loading || sellers.length === 0}
    >
      <div className="w-full overflow-x-auto -mx-4 sm:-mx-6 tabular-nums">
        <Table className="w-full min-w-[720px]">
          <TableHeader className="border-y border-gray-100 dark:border-gray-800">
            <TableRow>
              <TableCell isHeader className={`${th} text-start`}>{t("reportsPage.seller")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.orders")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.discountedOrders")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.discountTotal")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.discountRate")}</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <ReportTableSkeleton columns={5} />
            ) : error ? (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-error-500">{error}</TableCell></TableRow>
            ) : sellers.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-gray-500 dark:text-gray-400">{t("reportsPage.noData")}</TableCell></TableRow>
            ) : (
              sellers.map((s, i) => (
                <TableRow key={s.cashierId ?? i} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                  <TableCell className="py-3 px-4 sm:px-6 text-gray-800 font-medium dark:text-white/90">{s.cashierName}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-500 dark:text-gray-400">{formatNumber(s.orderCount)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-800 dark:text-white/90">{formatNumber(s.discountedOrders)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end font-medium text-error-500">{money(s.discountTotal)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-800 dark:text-white/90">{s.discountRate.toFixed(1)}%</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </ReportShell>
  );
}
