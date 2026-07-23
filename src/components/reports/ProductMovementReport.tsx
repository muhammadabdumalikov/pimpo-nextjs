"use client";
import { useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import { useTranslations } from "@/hooks/useTranslations";
import ReportShell, { ReportKpi, ReportFilterField } from "./ReportShell";
import { ReportTableSkeleton } from "./ReportSkeleton";
import ReportDateRange from "./ReportDateRange";
import ReportBranchFilter from "./ReportBranchFilter";
import ReportSearch from "./ReportSearch";
import ReportPager from "./ReportPager";
import { getProductMovementReport, type ProductMovementReport as MoveData } from "@/lib/api";
import { currentMonthRange, formatNumber, rangeLabel, toISODate } from "@/lib/reportFormat";
import { exportAoaToExcel } from "@/lib/exportExcel";

const PAGE = 12;
const th = "py-3 px-4 sm:px-6 font-medium text-gray-500 text-sm dark:text-gray-400";

export default function ProductMovementReport() {
  const { t } = useTranslations();
  const [range, setRange] = useState<[Date | null, Date | null]>(currentMonthRange());
  const [branchId, setBranchId] = useState("");
  const [data, setData] = useState<MoveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    const [from, to] = range;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const d = await getProductMovementReport(
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

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const items = data?.items ?? [];
    if (!q) return items;
    return items.filter((i) => i.name.toLowerCase().includes(q) || (i.code ?? "").toLowerCase().includes(q));
  }, [data, search]);

  const totals = useMemo(() => {
    const items = data?.items ?? [];
    return {
      received: items.reduce((s, i) => s + i.received, 0),
      sold: items.reduce((s, i) => s + i.sold, 0),
      writtenOff: items.reduce((s, i) => s + i.writtenOff, 0),
      closing: items.reduce((s, i) => s + i.closing, 0),
    };
  }, [data]);

  const paged = filtered.slice((page - 1) * PAGE, page * PAGE);

  const handleExport = () => {
    if (!data) return;
    const aoa: (string | number)[][] = [
      [
        t("reportsPage.product"),
        t("reportsPage.opening"),
        t("reportsPage.received"),
        t("reportsPage.sold"),
        t("reportsPage.returned"),
        t("reportsPage.writtenOff"),
        t("reportsPage.closing"),
      ],
      ...filtered.map((i) => [i.name, i.opening, i.received, i.sold, i.returned, i.writtenOff, i.closing]),
    ];
    exportAoaToExcel("product-movement", aoa, "Movement");
  };

  const kpis = data ? (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <ReportKpi label={t("reportsPage.received")} value={formatNumber(totals.received)} />
      <ReportKpi label={t("reportsPage.sold")} value={formatNumber(totals.sold)} tone="success" />
      <ReportKpi label={t("reportsPage.writtenOff")} value={formatNumber(totals.writtenOff)} tone="error" />
      <ReportKpi label={t("reportsPage.closing")} value={formatNumber(totals.closing)} />
    </div>
  ) : null;

  return (
    <ReportShell
      title={t("sidebar.reportsProductMovement")}
      filterSummary={rangeLabel(range)}
      activeFilterCount={branchId ? 1 : 0}
      search={<ReportSearch value={search} onChange={(v) => { setSearch(v); setPage(1); }} />}
      filters={
        <>
          <ReportFilterField label={t("reportsPage.period")}>
            <ReportDateRange value={range} onChange={(r) => { setRange(r); setPage(1); }} />
          </ReportFilterField>
          <ReportBranchFilter value={branchId} onChange={(v) => { setBranchId(v); setPage(1); }} />
        </>
      }
      kpis={kpis}
      onExport={handleExport}
      exportDisabled={!data || loading}
    >
      <div className="w-full overflow-x-auto -mx-4 sm:-mx-6 tabular-nums">
        <Table className="w-full min-w-[820px]">
          <TableHeader className="border-y border-gray-100 dark:border-gray-800">
            <TableRow>
              <TableCell isHeader className={`${th} text-start`}>{t("reportsPage.product")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.opening")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.received")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.sold")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.returned")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.writtenOff")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.closing")}</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <ReportTableSkeleton columns={7} />
            ) : error ? (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-error-500">{error}</TableCell></TableRow>
            ) : paged.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-gray-500 dark:text-gray-400">{t("reportsPage.noData")}</TableCell></TableRow>
            ) : (
              paged.map((i) => (
                <TableRow key={i.productId} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                  <TableCell className="py-3 px-4 sm:px-6 text-gray-800 font-medium dark:text-white/90">
                    {i.name}
                    {i.code && <span className="block text-xs text-gray-400">{i.code}</span>}
                  </TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-500 dark:text-gray-400">{formatNumber(i.opening)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-800 dark:text-white/90">{formatNumber(i.received)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end font-medium text-success-600 dark:text-success-500">{formatNumber(i.sold)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-500 dark:text-gray-400">{formatNumber(i.returned)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-error-500">{formatNumber(i.writtenOff)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-800 font-medium dark:text-white/90">{formatNumber(i.closing)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {!loading && !error && filtered.length > PAGE && (
        <ReportPager page={page} totalItems={filtered.length} pageSize={PAGE} onPage={setPage} />
      )}
    </ReportShell>
  );
}
