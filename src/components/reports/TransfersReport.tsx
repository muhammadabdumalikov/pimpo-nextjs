"use client";
import { useEffect, useMemo, useState } from "react";
import { LuArrowRight } from "react-icons/lu";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import { useTranslations } from "@/hooks/useTranslations";
import ReportShell, { ReportKpi, ReportFilterField } from "./ReportShell";
import ReportDateRange from "./ReportDateRange";
import ReportBranchFilter from "./ReportBranchFilter";
import ReportSearch from "./ReportSearch";
import ReportPager from "./ReportPager";
import { getTransfersReport, type TransfersReport as TransfersData } from "@/lib/api";
import { currentMonthRange, formatMoney, formatNumber, formatDate, rangeLabel, toISODate } from "@/lib/reportFormat";
import { exportAoaToExcel } from "@/lib/exportExcel";

const PAGE = 14;
const th = "py-3 px-4 sm:px-6 font-medium text-gray-500 text-sm dark:text-gray-400";

const dateTime = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${formatDate(d)} ${hh}:${mm}`;
};

export default function TransfersReport() {
  const { t } = useTranslations();
  const [range, setRange] = useState<[Date | null, Date | null]>(currentMonthRange());
  const [branchId, setBranchId] = useState("");
  const [data, setData] = useState<TransfersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
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
        const d = await getTransfersReport(
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
    const q = search.toLowerCase().trim();
    const list = data?.items ?? [];
    if (!q) return list;
    return list.filter(
      (i) =>
        i.fromBranchName.toLowerCase().includes(q) ||
        i.toBranchName.toLowerCase().includes(q) ||
        (i.note ?? "").toLowerCase().includes(q),
    );
  }, [data, search]);
  const paged = filtered.slice((page - 1) * PAGE, page * PAGE);
  const totals = data?.totals;

  const handleExport = () => {
    if (!data) return;
    const aoa: (string | number)[][] = [
      [t("reportsPage.date"), t("reportsPage.direction"), t("reportsPage.items"), t("reportsPage.quantity"), t("reportsPage.value"), t("reportsPage.cashier"), t("reportsPage.note")],
      ...filtered.map((i) => [dateTime(i.createdAt), `${i.fromBranchName} → ${i.toBranchName}`, i.itemCount, i.totalQty, Math.round(i.totalValue), i.cashierName, i.note ?? ""]),
    ];
    exportAoaToExcel("transfers-report", aoa, "Transfers");
  };

  const kpis = totals ? (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <ReportKpi label={t("reportsPage.transfersCount")} value={formatNumber(totals.transfers)} />
      <ReportKpi label={t("reportsPage.movedQty")} value={formatNumber(totals.qty)} />
      <ReportKpi label={t("reportsPage.movedValue")} value={money(totals.value)} />
    </div>
  ) : null;

  return (
    <ReportShell
      title={t("sidebar.reportsTransfers")}
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
      exportDisabled={!data || loading || filtered.length === 0}
    >
      <div className="w-full overflow-x-auto -mx-4 sm:-mx-6 tabular-nums">
        <Table className="w-full min-w-[860px]">
          <TableHeader className="border-y border-gray-100 dark:border-gray-800">
            <TableRow>
              <TableCell isHeader className={`${th} text-start`}>{t("reportsPage.date")}</TableCell>
              <TableCell isHeader className={`${th} text-start`}>{t("reportsPage.direction")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.items")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.quantity")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.value")}</TableCell>
              <TableCell isHeader className={`${th} text-start`}>{t("reportsPage.cashier")}</TableCell>
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
              paged.map((i) => (
                <TableRow key={i.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                  <TableCell className="py-3 px-4 sm:px-6 text-gray-800 dark:text-white/90">{dateTime(i.createdAt)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6">
                    <span className="inline-flex items-center gap-2 text-gray-800 dark:text-white/90">
                      <span className="font-medium">{i.fromBranchName}</span>
                      <LuArrowRight size={15} className="shrink-0 text-gray-400" />
                      <span className="font-medium">{i.toBranchName}</span>
                    </span>
                    {i.note && <span className="block text-xs text-gray-400">{i.note}</span>}
                  </TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-500 dark:text-gray-400">{formatNumber(i.itemCount)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-800 dark:text-white/90">{formatNumber(i.totalQty)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-800 dark:text-white/90">{money(i.totalValue)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-gray-500 dark:text-gray-400">{i.cashierName}</TableCell>
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
