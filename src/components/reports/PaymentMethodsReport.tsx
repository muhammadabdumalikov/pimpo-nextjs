"use client";
import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import { useTranslations } from "@/hooks/useTranslations";
import ReportShell, { ReportKpi, ReportFilterField } from "./ReportShell";
import { ReportTableSkeleton } from "./ReportSkeleton";
import ReportDateRange from "./ReportDateRange";
import ReportBranchFilter from "./ReportBranchFilter";
import ReportCompareToggle from "./ReportCompareToggle";
import { getPaymentMethodsReport, type PaymentMethodsReport as PmData } from "@/lib/api";
import { currentMonthRange, formatMoney, formatNumber, rangeLabel, toISODate } from "@/lib/reportFormat";
import { useReportComparison } from "@/hooks/useReportComparison";
import { deltaPct, type CompareMode } from "@/lib/reportCompare";
import { exportAoaToExcel } from "@/lib/exportExcel";

const th = "py-3 px-4 sm:px-6 font-medium text-gray-500 text-sm dark:text-gray-400";

// Accent per known method so the share bars read as a legend.
const METHOD_BAR: Record<string, string> = {
  cash: "bg-emerald-500",
  card: "bg-blue-500",
  click: "bg-violet-500",
  debt: "bg-amber-500",
  other: "bg-gray-400",
};

export default function PaymentMethodsReport() {
  const { t } = useTranslations();
  const [range, setRange] = useState<[Date | null, Date | null]>(currentMonthRange());
  const [branchId, setBranchId] = useState("");
  const [data, setData] = useState<PmData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [compare, setCompare] = useState<CompareMode>("off");
  const som = t("reportsPage.som");
  const money = (n: number) => formatMoney(n, som);

  const { prev } = useReportComparison(compare, range, [branchId], (f, tt) =>
    getPaymentMethodsReport(f, tt, branchId || undefined),
  );

  // Localized method label (falls back to the raw method string).
  const methodLabel = (m: string) => {
    const key = `reportsPage.pm_${m}`;
    const label = t(key);
    return label === key ? m : label;
  };

  useEffect(() => {
    let active = true;
    const [from, to] = range;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const d = await getPaymentMethodsReport(
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

  const methods = data?.methods ?? [];

  const handleExport = () => {
    if (!data) return;
    const aoa: (string | number)[][] = [
      [t("reportsPage.paymentMethod"), t("reportsPage.orders"), t("reportsPage.amount"), t("reportsPage.share")],
      ...methods.map((m) => [methodLabel(m.method), m.orders, Math.round(m.amount), `${m.share.toFixed(1)}%`]),
    ];
    exportAoaToExcel("payment-methods-report", aoa, "Payments");
  };

  const kpis = data ? (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <ReportKpi label={t("reportsPage.total")} value={money(data.total)} tone="success" delta={prev ? deltaPct(data.total, prev.total) : undefined} />
      <ReportKpi label={t("reportsPage.methodsCount")} value={formatNumber(methods.length)} delta={prev ? deltaPct(methods.length, prev.methods.length) : undefined} />
    </div>
  ) : null;

  return (
    <ReportShell
      title={t("sidebar.reportsPaymentMethods")}
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
      exportDisabled={!data || loading || methods.length === 0}
    >
      <div className="w-full overflow-x-auto -mx-4 sm:-mx-6 tabular-nums">
        <Table className="w-full min-w-[640px]">
          <TableHeader className="border-y border-gray-100 dark:border-gray-800">
            <TableRow>
              <TableCell isHeader className={`${th} text-start`}>{t("reportsPage.paymentMethod")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.orders")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.amount")}</TableCell>
              <TableCell isHeader className={`${th} text-start`}>{t("reportsPage.share")}</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <ReportTableSkeleton columns={4} />
            ) : error ? (
              <TableRow><TableCell colSpan={4} className="py-10 text-center text-error-500">{error}</TableCell></TableRow>
            ) : methods.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="py-10 text-center text-gray-500 dark:text-gray-400">{t("reportsPage.noData")}</TableCell></TableRow>
            ) : (
              methods.map((m) => (
                <TableRow key={m.method} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                  <TableCell className="py-3 px-4 sm:px-6 text-gray-800 font-medium dark:text-white/90">
                    <span className="inline-flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${METHOD_BAR[m.method] ?? METHOD_BAR.other}`} />
                      {methodLabel(m.method)}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-500 dark:text-gray-400">{formatNumber(m.orders)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end font-medium text-gray-800 dark:text-white/90">{money(m.amount)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-full max-w-[160px] overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.06]">
                        <div className={`h-full rounded-full ${METHOD_BAR[m.method] ?? METHOD_BAR.other}`} style={{ width: `${Math.min(100, m.share)}%` }} />
                      </div>
                      <span className="w-12 shrink-0 text-end text-sm text-gray-500 dark:text-gray-400">{m.share.toFixed(1)}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </ReportShell>
  );
}
