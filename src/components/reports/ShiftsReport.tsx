"use client";
import { useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import { useTranslations } from "@/hooks/useTranslations";
import ReportShell, { ReportKpi, ReportFilterField } from "./ReportShell";
import ReportDateRange from "./ReportDateRange";
import ReportPager from "./ReportPager";
import { getShiftsReport, type ShiftsReport as ShiftsData } from "@/lib/api";
import { currentMonthRange, formatMoney, formatNumber, formatDate, rangeLabel, toISODate } from "@/lib/reportFormat";
import { exportAoaToExcel } from "@/lib/exportExcel";

const PAGE = 12;
const th = "py-3 px-4 sm:px-6 font-medium text-gray-500 text-sm dark:text-gray-400";

// Signed money with a +/− sign and colour: shortage red, surplus green.
function DiffCell({ value, som }: { value: number; som: string }) {
  if (value === 0) return <span className="text-gray-400">0 {som}</span>;
  const neg = value < 0;
  return (
    <span className={neg ? "text-error-500" : "text-success-600 dark:text-success-500"}>
      {neg ? "−" : "+"}
      {formatMoney(Math.abs(value), som)}
    </span>
  );
}

export default function ShiftsReport() {
  const { t } = useTranslations();
  const [range, setRange] = useState<[Date | null, Date | null]>(currentMonthRange());
  const [data, setData] = useState<ShiftsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const som = t("reportsPage.som");
  const money = (n: number) => formatMoney(n, som);

  useEffect(() => {
    let active = true;
    const [from, to] = range;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const d = await getShiftsReport(
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

  const shifts = data?.shifts ?? [];
  const paged = useMemo(() => shifts.slice((page - 1) * PAGE, page * PAGE), [shifts, page]);
  const totals = data?.totals;

  const handleExport = () => {
    if (!data) return;
    const aoa: (string | number)[][] = [
      [
        t("reportsPage.date"),
        t("reportsPage.register"),
        t("reportsPage.cashier"),
        t("reportsPage.orders"),
        t("reportsPage.cashIn"),
        t("reportsPage.cashOut"),
        t("reportsPage.expectedCash"),
        t("reportsPage.countedCash"),
        t("reportsPage.difference"),
      ],
      ...shifts.map((s) => [
        formatDate(s.closedAt),
        s.registerName,
        s.cashierName,
        s.orderCount,
        Math.round(s.cashIn),
        Math.round(s.cashOut),
        Math.round(s.expectedCash),
        Math.round(s.countedCash),
        Math.round(s.difference),
      ]),
    ];
    exportAoaToExcel("shifts-report", aoa, "Shifts");
  };

  const kpis = totals ? (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <ReportKpi label={t("reportsPage.shiftsCount")} value={formatNumber(totals.shifts)} />
      <ReportKpi
        label={t("reportsPage.netDifference")}
        value={money(totals.difference)}
        tone={totals.difference < 0 ? "error" : totals.difference > 0 ? "success" : "default"}
      />
      <ReportKpi label={t("reportsPage.shortages")} value={formatNumber(totals.shortages)} tone={totals.shortages > 0 ? "error" : "default"} />
      <ReportKpi label={t("reportsPage.cashIn")} value={money(totals.cashIn)} />
    </div>
  ) : null;

  return (
    <ReportShell
      title={t("sidebar.reportsShifts")}
      filterSummary={rangeLabel(range)}
      filters={
        <ReportFilterField label={t("reportsPage.period")}>
          <ReportDateRange value={range} onChange={(r) => { setRange(r); setPage(1); }} />
        </ReportFilterField>
      }
      kpis={kpis}
      onExport={handleExport}
      exportDisabled={!data || loading || shifts.length === 0}
    >
      {/* Per-cashier rollup — surfaces recurring shortages (theft signal). */}
      {!loading && !error && (data?.byCashier.length ?? 0) > 0 && (
        <div className="mb-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
            {t("reportsPage.byCashier")}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data!.byCashier.map((c, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-gray-50/60 p-3.5 dark:border-gray-800 dark:bg-white/[0.02]">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-gray-800 dark:text-white/90">{c.cashierName}</span>
                  <span className="shrink-0 text-sm tabular-nums"><DiffCell value={c.difference} som={som} /></span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span>{c.shifts} {t("reportsPage.shiftsShort")}</span>
                  {c.shortages > 0 && (
                    <span className="text-error-500">{c.shortages}× {t("reportsPage.shortageShort")}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="w-full overflow-x-auto -mx-4 sm:-mx-6 tabular-nums">
        <Table className="w-full min-w-[900px]">
          <TableHeader className="border-y border-gray-100 dark:border-gray-800">
            <TableRow>
              <TableCell isHeader className={`${th} text-start`}>{t("reportsPage.date")}</TableCell>
              <TableCell isHeader className={`${th} text-start`}>{t("reportsPage.cashier")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.orders")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.cashIn")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.cashOut")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.expectedCash")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.countedCash")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.difference")}</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <TableRow><TableCell colSpan={8} className="py-10 text-center text-gray-500 dark:text-gray-400">{t("reportsPage.loading")}</TableCell></TableRow>
            ) : error ? (
              <TableRow><TableCell colSpan={8} className="py-10 text-center text-error-500">{error}</TableCell></TableRow>
            ) : paged.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="py-10 text-center text-gray-500 dark:text-gray-400">{t("reportsPage.noData")}</TableCell></TableRow>
            ) : (
              paged.map((s) => (
                <TableRow key={s.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                  <TableCell className="py-3 px-4 sm:px-6 text-gray-800 dark:text-white/90">
                    {formatDate(s.closedAt)}
                    <span className="block text-xs text-gray-400">{s.registerName}</span>
                  </TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-gray-800 font-medium dark:text-white/90">{s.cashierName}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-500 dark:text-gray-400">{formatNumber(s.orderCount)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-800 dark:text-white/90">{money(s.cashIn)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-800 dark:text-white/90">{money(s.cashOut)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-500 dark:text-gray-400">{money(s.expectedCash)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-800 dark:text-white/90">{money(s.countedCash)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end font-medium"><DiffCell value={s.difference} som={som} /></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {!loading && !error && shifts.length > PAGE && (
        <ReportPager page={page} totalItems={shifts.length} pageSize={PAGE} onPage={setPage} />
      )}
    </ReportShell>
  );
}
