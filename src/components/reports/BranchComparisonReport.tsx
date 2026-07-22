"use client";
import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import { useTranslations } from "@/hooks/useTranslations";
import ReportShell, { ReportKpi, ReportFilterField } from "./ReportShell";
import ReportDateRange from "./ReportDateRange";
import ReportCompareToggle from "./ReportCompareToggle";
import { getBranchComparisonReport, type BranchComparisonReport as BranchData } from "@/lib/api";
import { currentMonthRange, formatMoney, formatNumber, rangeLabel, toISODate } from "@/lib/reportFormat";
import { useReportComparison } from "@/hooks/useReportComparison";
import { deltaPct, type CompareMode } from "@/lib/reportCompare";
import { exportAoaToExcel } from "@/lib/exportExcel";

const th = "py-3 px-4 sm:px-6 font-medium text-gray-500 text-sm dark:text-gray-400";

export default function BranchComparisonReport() {
  const { t } = useTranslations();
  const [range, setRange] = useState<[Date | null, Date | null]>(currentMonthRange());
  const [data, setData] = useState<BranchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [compare, setCompare] = useState<CompareMode>("off");
  const som = t("reportsPage.som");
  const money = (n: number) => formatMoney(n, som);

  const { prev } = useReportComparison(compare, range, [], (f, tt) =>
    getBranchComparisonReport(f, tt),
  );

  useEffect(() => {
    let active = true;
    const [from, to] = range;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const d = await getBranchComparisonReport(
          from ? toISODate(from) : undefined,
          to ? toISODate(to) : undefined,
        );
        if (active) setData(d);
      } catch (e) {
        if (active) setError((e as Error)?.message || "Failed to load");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [range]);

  const rows = data?.branches ?? [];
  const totals = data?.totals;
  const delta = (k: keyof BranchData["totals"]) =>
    prev && totals ? deltaPct(totals[k], prev.totals[k]) : undefined;

  const handleExport = () => {
    if (!data) return;
    const aoa: (string | number)[][] = [
      [t("reportsPage.branch"), t("reportsPage.orders"), t("reportsPage.revenue"), t("reportsPage.avgCheck"), t("reportsPage.profit"), t("reportsPage.marginShort"), t("reportsPage.stockValue")],
      ...rows.map((b) => [b.branchName, b.orderCount, Math.round(b.revenue), Math.round(b.avgCheck), Math.round(b.profit), `${b.margin.toFixed(1)}%`, Math.round(b.stockValue)]),
    ];
    exportAoaToExcel("branch-comparison-report", aoa, "Branches");
  };

  const kpis = totals ? (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <ReportKpi label={t("reportsPage.branches")} value={formatNumber(totals.branches)} />
      <ReportKpi label={t("reportsPage.revenue")} value={money(totals.revenue)} tone="success" delta={delta("revenue")} />
      <ReportKpi label={t("reportsPage.profit")} value={money(totals.profit)} tone={totals.profit >= 0 ? "success" : "error"} delta={delta("profit")} />
      <ReportKpi label={t("reportsPage.stockValue")} value={money(totals.stockValue)} />
    </div>
  ) : null;

  return (
    <ReportShell
      title={t("sidebar.reportsBranchComparison")}
      filterSummary={rangeLabel(range)}
      activeFilterCount={compare !== "off" ? 1 : 0}
      filters={
        <>
          <ReportFilterField label={t("reportsPage.period")}>
            <ReportDateRange value={range} onChange={setRange} />
          </ReportFilterField>
          <ReportCompareToggle value={compare} onChange={setCompare} />
        </>
      }
      kpis={kpis}
      onExport={handleExport}
      exportDisabled={!data || loading || rows.length === 0}
    >
      <div className="w-full overflow-x-auto -mx-4 sm:-mx-6 tabular-nums">
        <Table className="w-full min-w-[900px]">
          <TableHeader className="border-y border-gray-100 dark:border-gray-800">
            <TableRow>
              <TableCell isHeader className={`${th} text-start`}>{t("reportsPage.branch")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.orders")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.revenue")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.avgCheck")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.profit")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.marginShort")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.stockValue")}</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-gray-500 dark:text-gray-400">{t("reportsPage.loading")}</TableCell></TableRow>
            ) : error ? (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-error-500">{error}</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-gray-500 dark:text-gray-400">{t("reportsPage.noData")}</TableCell></TableRow>
            ) : (
              rows.map((b, i) => (
                <TableRow key={b.branchId ?? i} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                  <TableCell className="py-3 px-4 sm:px-6 text-gray-800 font-medium dark:text-white/90">{b.branchName}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-500 dark:text-gray-400">{formatNumber(b.orderCount)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end font-medium text-success-600 dark:text-success-500">{money(b.revenue)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-800 dark:text-white/90">{money(b.avgCheck)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-800 dark:text-white/90">{money(b.profit)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-500 dark:text-gray-400">{b.margin.toFixed(1)}%</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-500 dark:text-gray-400">{money(b.stockValue)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </ReportShell>
  );
}
