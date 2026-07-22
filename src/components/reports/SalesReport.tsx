"use client";
import { useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import { useTranslations } from "@/hooks/useTranslations";
import SelectField from "../form/SelectField";
import ReportShell, { ReportKpi, ReportFilterField } from "./ReportShell";
import ReportDateRange from "./ReportDateRange";
import ReportBranchFilter from "./ReportBranchFilter";
import ReportPager from "./ReportPager";
import ReportCompareToggle from "./ReportCompareToggle";
import { getSalesReport, type SalesReport as SalesData, type SalesGroupBy } from "@/lib/api";
import { currentMonthRange, formatMoney, formatNumber, formatDate, rangeLabel, toISODate } from "@/lib/reportFormat";
import { useReportComparison } from "@/hooks/useReportComparison";
import { deltaPct, type CompareMode } from "@/lib/reportCompare";
import { exportAoaToExcel } from "@/lib/exportExcel";

const PAGE = 14;
const th = "py-3 px-4 sm:px-6 font-medium text-gray-500 text-sm dark:text-gray-400";

export default function SalesReport() {
  const { t } = useTranslations();
  const [range, setRange] = useState<[Date | null, Date | null]>(currentMonthRange());
  const [branchId, setBranchId] = useState("");
  const [groupBy, setGroupBy] = useState<SalesGroupBy>("day");
  const [data, setData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [compare, setCompare] = useState<CompareMode>("off");
  const som = t("reportsPage.som");
  const money = (n: number) => formatMoney(n, som);

  const { prev } = useReportComparison(compare, range, [branchId, groupBy], (f, tt) =>
    getSalesReport(f, tt, branchId || undefined, groupBy),
  );

  useEffect(() => {
    let active = true;
    const [from, to] = range;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const d = await getSalesReport(
          from ? toISODate(from) : undefined,
          to ? toISODate(to) : undefined,
          branchId || undefined,
          groupBy,
        );
        if (active) setData(d);
      } catch (e) {
        if (active) setError((e as Error)?.message || "Failed to load");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [range, branchId, groupBy]);

  // Newest bucket first for the table (the API returns oldest→newest).
  const buckets = useMemo(() => (data ? [...data.buckets].reverse() : []), [data]);
  const paged = buckets.slice((page - 1) * PAGE, page * PAGE);

  const periodLabel = (p: string) =>
    groupBy === "month" ? p.split("-").reverse().join(".") : formatDate(p);

  const handleExport = () => {
    if (!data) return;
    const aoa: (string | number)[][] = [
      [
        t("reportsPage.period"),
        t("reportsPage.orders"),
        t("reportsPage.revenue"),
        t("reportsPage.avgCheck"),
        t("reportsPage.discounts"),
        t("reportsPage.grossProfit"),
        t("reportsPage.grossMargin"),
      ],
      ...data.buckets.map((b) => [
        periodLabel(b.period),
        b.orderCount,
        Math.round(b.revenue),
        Math.round(b.avgCheck),
        Math.round(b.discounts),
        Math.round(b.profit),
        `${b.margin.toFixed(1)}%`,
      ]),
    ];
    exportAoaToExcel("sales-report", aoa, "Sales");
  };

  const totals = data?.totals;
  const delta = (k: keyof NonNullable<typeof totals>) =>
    prev && totals ? deltaPct(totals[k], prev.totals[k]) : undefined;
  const kpis = totals ? (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <ReportKpi label={t("reportsPage.revenue")} value={money(totals.revenue)} tone="success" delta={delta("revenue")} />
      <ReportKpi label={t("reportsPage.orders")} value={formatNumber(totals.orderCount)} delta={delta("orderCount")} />
      <ReportKpi label={t("reportsPage.avgCheck")} value={money(totals.avgCheck)} delta={delta("avgCheck")} />
      <ReportKpi
        label={`${t("reportsPage.grossProfit")} · ${totals.margin.toFixed(1)}%`}
        value={money(totals.profit)}
        tone={totals.profit >= 0 ? "success" : "error"}
        delta={delta("profit")}
      />
    </div>
  ) : null;

  return (
    <ReportShell
      title={t("sidebar.reportsSales")}
      filterSummary={rangeLabel(range)}
      activeFilterCount={(branchId ? 1 : 0) + (groupBy !== "day" ? 1 : 0) + (compare !== "off" ? 1 : 0)}
      filters={
        <>
          <ReportFilterField label={t("reportsPage.period")}>
            <ReportDateRange value={range} onChange={(r) => { setRange(r); setPage(1); }} />
          </ReportFilterField>
          <ReportFilterField label={t("reportsPage.groupBy")}>
            <SelectField
              className="min-w-[160px]"
              value={groupBy}
              onChange={(v) => { setGroupBy(v as SalesGroupBy); setPage(1); }}
              options={[
                { value: "day", label: t("reportsPage.byDay") },
                { value: "week", label: t("reportsPage.byWeek") },
                { value: "month", label: t("reportsPage.byMonth") },
              ]}
            />
          </ReportFilterField>
          <ReportCompareToggle value={compare} onChange={setCompare} />
          <ReportBranchFilter value={branchId} onChange={(v) => { setBranchId(v); setPage(1); }} />
        </>
      }
      kpis={kpis}
      onExport={handleExport}
      exportDisabled={!data || loading || buckets.length === 0}
    >
      <div className="w-full overflow-x-auto -mx-4 sm:-mx-6 tabular-nums">
        <Table className="w-full min-w-[820px]">
          <TableHeader className="border-y border-gray-100 dark:border-gray-800">
            <TableRow>
              <TableCell isHeader className={`${th} text-start`}>{t("reportsPage.period")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.orders")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.revenue")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.avgCheck")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.discounts")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.grossProfit")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.grossMargin")}</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-gray-500 dark:text-gray-400">{t("reportsPage.loading")}</TableCell></TableRow>
            ) : error ? (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-error-500">{error}</TableCell></TableRow>
            ) : paged.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-gray-500 dark:text-gray-400">{t("reportsPage.noData")}</TableCell></TableRow>
            ) : (
              paged.map((b) => (
                <TableRow key={b.period} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                  <TableCell className="py-3 px-4 sm:px-6 text-gray-800 font-medium dark:text-white/90">{periodLabel(b.period)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-800 dark:text-white/90">{formatNumber(b.orderCount)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end font-medium text-success-600 dark:text-success-500">{money(b.revenue)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-800 dark:text-white/90">{money(b.avgCheck)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-500 dark:text-gray-400">{b.discounts > 0 ? money(b.discounts) : "—"}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-800 dark:text-white/90">{money(b.profit)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-500 dark:text-gray-400">{b.margin.toFixed(1)}%</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {!loading && !error && buckets.length > PAGE && (
        <ReportPager page={page} totalItems={buckets.length} pageSize={PAGE} onPage={setPage} />
      )}
    </ReportShell>
  );
}
