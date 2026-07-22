"use client";
import { useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import { useTranslations } from "@/hooks/useTranslations";
import ReportShell, { ReportKpi, ReportFilterField } from "./ReportShell";
import ReportDateRange from "./ReportDateRange";
import ReportBranchFilter from "./ReportBranchFilter";
import ReportPager from "./ReportPager";
import ReportCompareToggle from "./ReportCompareToggle";
import { getCancelledReport, type CancelledReport as CancelledData } from "@/lib/api";
import { currentMonthRange, formatMoney, formatNumber, formatDate, rangeLabel, toISODate } from "@/lib/reportFormat";
import { useReportComparison } from "@/hooks/useReportComparison";
import { deltaPct, type CompareMode } from "@/lib/reportCompare";
import { exportAoaToExcel } from "@/lib/exportExcel";

const PAGE = 14;
const th = "py-3 px-4 sm:px-6 font-medium text-gray-500 text-sm dark:text-gray-400";

// Date + time (cancellations are worth pinning to the minute).
const dateTime = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${formatDate(d)} ${hh}:${mm}`;
};

export default function CancelledReport() {
  const { t } = useTranslations();
  const [range, setRange] = useState<[Date | null, Date | null]>(currentMonthRange());
  const [branchId, setBranchId] = useState("");
  const [data, setData] = useState<CancelledData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [compare, setCompare] = useState<CompareMode>("off");
  const som = t("reportsPage.som");
  const money = (n: number) => formatMoney(n, som);

  const { prev } = useReportComparison(compare, range, [branchId], (f, tt) =>
    getCancelledReport(f, tt, branchId || undefined),
  );
  const delta = (k: keyof CancelledData["totals"]) =>
    prev && data ? deltaPct(data.totals[k], prev.totals[k]) : undefined;

  useEffect(() => {
    let active = true;
    const [from, to] = range;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const d = await getCancelledReport(
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

  const items = data?.items ?? [];
  const paged = useMemo(() => items.slice((page - 1) * PAGE, page * PAGE), [items, page]);
  const totals = data?.totals;

  const handleExport = () => {
    if (!data) return;
    const aoa: (string | number)[][] = [
      [
        t("reportsPage.date"),
        t("reportsPage.cashier"),
        t("reportsPage.customer"),
        t("reportsPage.items"),
        t("reportsPage.amount"),
        t("reportsPage.note"),
      ],
      ...items.map((o) => [
        dateTime(o.createdAt),
        o.cashierName,
        o.customerName ?? "—",
        o.itemCount,
        Math.round(o.totalAmount),
        o.note ?? "",
      ]),
    ];
    exportAoaToExcel("cancelled-report", aoa, "Cancelled");
  };

  const kpis = totals ? (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <ReportKpi label={t("reportsPage.cancelledCount")} value={formatNumber(totals.count)} tone={totals.count > 0 ? "error" : "default"} delta={delta("count")} deltaInverse />
      <ReportKpi label={t("reportsPage.cancelledAmount")} value={money(totals.amount)} tone={totals.amount > 0 ? "error" : "default"} delta={delta("amount")} deltaInverse />
    </div>
  ) : null;

  return (
    <ReportShell
      title={t("sidebar.reportsCancelled")}
      filterSummary={rangeLabel(range)}
      activeFilterCount={(branchId ? 1 : 0) + (compare !== "off" ? 1 : 0)}
      filters={
        <>
          <ReportFilterField label={t("reportsPage.period")}>
            <ReportDateRange value={range} onChange={(r) => { setRange(r); setPage(1); }} />
          </ReportFilterField>
          <ReportCompareToggle value={compare} onChange={setCompare} />
          <ReportBranchFilter value={branchId} onChange={(v) => { setBranchId(v); setPage(1); }} />
        </>
      }
      kpis={kpis}
      onExport={handleExport}
      exportDisabled={!data || loading || items.length === 0}
    >
      {/* Per-cashier rollup — who is voiding the most. */}
      {!loading && !error && (data?.byCashier.length ?? 0) > 1 && (
        <div className="mb-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
            {t("reportsPage.byCashier")}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data!.byCashier.map((c, i) => (
              <div key={i} className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50/60 p-3.5 dark:border-gray-800 dark:bg-white/[0.02]">
                <span className="truncate font-medium text-gray-800 dark:text-white/90">{c.cashierName}</span>
                <span className="shrink-0 text-sm tabular-nums text-error-500">{c.count} · {money(c.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="w-full overflow-x-auto -mx-4 sm:-mx-6 tabular-nums">
        <Table className="w-full min-w-[820px]">
          <TableHeader className="border-y border-gray-100 dark:border-gray-800">
            <TableRow>
              <TableCell isHeader className={`${th} text-start`}>{t("reportsPage.date")}</TableCell>
              <TableCell isHeader className={`${th} text-start`}>{t("reportsPage.cashier")}</TableCell>
              <TableCell isHeader className={`${th} text-start`}>{t("reportsPage.customer")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.items")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.amount")}</TableCell>
              <TableCell isHeader className={`${th} text-start`}>{t("reportsPage.note")}</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-gray-500 dark:text-gray-400">{t("reportsPage.loading")}</TableCell></TableRow>
            ) : error ? (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-error-500">{error}</TableCell></TableRow>
            ) : paged.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-gray-500 dark:text-gray-400">{t("reportsPage.noData")}</TableCell></TableRow>
            ) : (
              paged.map((o) => (
                <TableRow key={o.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                  <TableCell className="py-3 px-4 sm:px-6 text-gray-800 dark:text-white/90">{dateTime(o.createdAt)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-gray-800 font-medium dark:text-white/90">{o.cashierName}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-gray-500 dark:text-gray-400">{o.customerName ?? "—"}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-500 dark:text-gray-400">{formatNumber(o.itemCount)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end font-medium text-error-500">{money(o.totalAmount)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-gray-500 dark:text-gray-400">{o.note || "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {!loading && !error && items.length > PAGE && (
        <ReportPager page={page} totalItems={items.length} pageSize={PAGE} onPage={setPage} />
      )}
    </ReportShell>
  );
}
