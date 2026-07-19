"use client";
import { useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import Badge from "../ui/badge/Badge";
import SelectField from "../form/SelectField";
import { useTranslations } from "@/hooks/useTranslations";
import ReportShell, { ReportKpi, ReportFilterField } from "./ReportShell";
import ReportDateRange from "./ReportDateRange";
import ReportBranchFilter from "./ReportBranchFilter";
import { getImportsReport, type ImportsReport as ImportsData } from "@/lib/api";
import { currentMonthRange, formatMoney, formatDate, formatNumber, rangeLabel, toISODate } from "@/lib/reportFormat";
import { exportAoaToExcel } from "@/lib/exportExcel";

const th = "py-3 px-4 sm:px-6 font-medium text-gray-500 text-sm dark:text-gray-400";

const payColor = (s: string): "success" | "warning" | "error" =>
  s === "paid" ? "success" : s === "partial" ? "warning" : "error";
const payLabelKey = (s: string) =>
  s === "paid" ? "reportsPage.paidStatus" : s === "partial" ? "reportsPage.partial" : "reportsPage.unpaid";

export default function ImportsReport() {
  const { t } = useTranslations();
  const [range, setRange] = useState<[Date | null, Date | null]>(currentMonthRange());
  const [data, setData] = useState<ImportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payStatus, setPayStatus] = useState("all");
  const [branchId, setBranchId] = useState("");
  const som = t("reportsPage.som");
  const money = (n: number) => formatMoney(n, som);

  // Client-side payment-status filter; totals recompute from the filtered set.
  const items = useMemo(() => {
    const all = data?.items ?? [];
    return payStatus === "all" ? all : all.filter((r) => r.paymentStatus === payStatus);
  }, [data, payStatus]);

  const totals = useMemo(
    () => ({
      receipts: items.length,
      totalAmount: items.reduce((s, i) => s + i.totalAmount, 0),
      paidAmount: items.reduce((s, i) => s + i.paidAmount, 0),
      returnedAmount: items.reduce((s, i) => s + i.returnedAmount, 0),
    }),
    [items],
  );

  useEffect(() => {
    let active = true;
    const [from, to] = range;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const d = await getImportsReport(
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
      [
        t("reportsPage.date"),
        t("reportsPage.supplier"),
        t("reportsPage.items"),
        t("reportsPage.total"),
        t("reportsPage.paid"),
        t("reportsPage.paymentStatus"),
      ],
      ...items.map((r) => [
        formatDate(r.createdAt),
        r.supplierName,
        r.itemCount,
        Math.round(r.totalAmount),
        Math.round(r.paidAmount),
        t(payLabelKey(r.paymentStatus)),
      ]),
    ];
    exportAoaToExcel("imports-report", aoa, "Imports");
  };

  const kpis = data ? (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <ReportKpi label={t("reportsPage.items")} value={formatNumber(totals.receipts)} />
      <ReportKpi label={t("reportsPage.total")} value={money(totals.totalAmount)} />
      <ReportKpi label={t("reportsPage.paid")} value={money(totals.paidAmount)} tone="success" />
      <ReportKpi label={t("reportsPage.returned")} value={money(totals.returnedAmount)} tone="error" />
    </div>
  ) : null;

  return (
    <ReportShell
      title={t("sidebar.reportsImports")}
      filterSummary={rangeLabel(range)}
      activeFilterCount={(payStatus !== "all" ? 1 : 0) + (branchId ? 1 : 0)}
      filters={
        <>
          <ReportFilterField label={t("reportsPage.period")}>
            <ReportDateRange value={range} onChange={setRange} />
          </ReportFilterField>
          <ReportBranchFilter value={branchId} onChange={setBranchId} />
          <ReportFilterField label={t("reportsPage.paymentStatus")}>
            <SelectField
              className="min-w-[180px]"
              value={payStatus}
              onChange={setPayStatus}
              options={[
                { value: "all", label: t("reportsPage.all") },
                { value: "paid", label: t("reportsPage.paidStatus") },
                { value: "partial", label: t("reportsPage.partial") },
                { value: "unpaid", label: t("reportsPage.unpaid") },
              ]}
            />
          </ReportFilterField>
        </>
      }
      kpis={kpis}
      onExport={handleExport}
      exportDisabled={!data || loading}
    >
      <div className="w-full overflow-x-auto -mx-4 sm:-mx-6 tabular-nums">
        <Table className="w-full min-w-[720px]">
          <TableHeader className="border-y border-gray-100 dark:border-gray-800">
            <TableRow>
              <TableCell isHeader className={`${th} text-start`}>{t("reportsPage.date")}</TableCell>
              <TableCell isHeader className={`${th} text-start`}>{t("reportsPage.supplier")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.items")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.total")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.paid")}</TableCell>
              <TableCell isHeader className={`${th} text-center`}>{t("reportsPage.paymentStatus")}</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-gray-500 dark:text-gray-400">{t("reportsPage.loading")}</TableCell></TableRow>
            ) : error ? (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-error-500">{error}</TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-gray-500 dark:text-gray-400">{t("reportsPage.noData")}</TableCell></TableRow>
            ) : (
              items.map((r) => (
                <TableRow key={r.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                  <TableCell className="py-3 px-4 sm:px-6 text-gray-500 dark:text-gray-400">{formatDate(r.createdAt)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-gray-800 font-medium dark:text-white/90">{r.supplierName}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-500 dark:text-gray-400">{formatNumber(r.itemCount)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-800 font-medium dark:text-white/90">{money(r.totalAmount)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-500 dark:text-gray-400">{money(r.paidAmount)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-center">
                    <Badge color={payColor(r.paymentStatus)}>{t(payLabelKey(r.paymentStatus))}</Badge>
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
