"use client";
import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import { useTranslations } from "@/hooks/useTranslations";
import ReportShell, { ReportKpi, ReportFilterField } from "./ReportShell";
import ReportDateRange from "./ReportDateRange";
import ReportBranchFilter from "./ReportBranchFilter";
import { getSupplierReturnsReport, type SupplierReturnsReport as Data } from "@/lib/api";
import { currentMonthRange, formatMoney, formatDate, formatNumber, rangeLabel, toISODate } from "@/lib/reportFormat";
import { exportAoaToExcel } from "@/lib/exportExcel";

const th = "py-3 px-4 sm:px-6 font-medium text-gray-500 text-sm dark:text-gray-400";

export default function SupplierReturnsReport() {
  const { t } = useTranslations();
  const [range, setRange] = useState<[Date | null, Date | null]>(currentMonthRange());
  const [branchId, setBranchId] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const som = t("reportsPage.som");
  const money = (n: number) => formatMoney(n, som);

  useEffect(() => {
    let active = true;
    const [from, to] = range;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const d = await getSupplierReturnsReport(
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

  const handleExport = () => {
    if (!data) return;
    const aoa: (string | number)[][] = [
      [t("reportsPage.date"), t("reportsPage.supplier"), t("reportsPage.items"), t("reportsPage.total")],
      ...data.items.map((r) => [formatDate(r.createdAt), r.supplierName, r.itemCount, Math.round(r.totalAmount)]),
    ];
    exportAoaToExcel("supplier-returns", aoa, "Returns");
  };

  const kpis = data ? (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-2 sm:max-w-md">
      <ReportKpi label={t("reportsPage.items")} value={formatNumber(data.totals.returns)} />
      <ReportKpi label={t("reportsPage.total")} value={money(data.totals.totalAmount)} tone="error" />
    </div>
  ) : null;

  return (
    <ReportShell
      title={t("sidebar.reportsSupplierReturns")}
      filterSummary={rangeLabel(range)}
      activeFilterCount={branchId ? 1 : 0}
      filters={
        <>
          <ReportFilterField label={t("reportsPage.period")}>
            <ReportDateRange value={range} onChange={setRange} />
          </ReportFilterField>
          <ReportBranchFilter value={branchId} onChange={setBranchId} />
        </>
      }
      kpis={kpis}
      onExport={handleExport}
      exportDisabled={!data || loading}
    >
      <div className="w-full overflow-x-auto -mx-4 sm:-mx-6 tabular-nums">
        <Table className="w-full min-w-[560px]">
          <TableHeader className="border-y border-gray-100 dark:border-gray-800">
            <TableRow>
              <TableCell isHeader className={`${th} text-start`}>{t("reportsPage.date")}</TableCell>
              <TableCell isHeader className={`${th} text-start`}>{t("reportsPage.supplier")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.items")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.total")}</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <TableRow><TableCell colSpan={4} className="py-10 text-center text-gray-500 dark:text-gray-400">{t("reportsPage.loading")}</TableCell></TableRow>
            ) : error ? (
              <TableRow><TableCell colSpan={4} className="py-10 text-center text-error-500">{error}</TableCell></TableRow>
            ) : data && data.items.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="py-10 text-center text-gray-500 dark:text-gray-400">{t("reportsPage.noData")}</TableCell></TableRow>
            ) : (
              data?.items.map((r) => (
                <TableRow key={r.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                  <TableCell className="py-3 px-4 sm:px-6 text-gray-500 dark:text-gray-400">{formatDate(r.createdAt)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-gray-800 font-medium dark:text-white/90">{r.supplierName}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-500 dark:text-gray-400">{formatNumber(r.itemCount)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end font-medium text-gray-800 dark:text-white/90">{money(r.totalAmount)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </ReportShell>
  );
}
