"use client";
import { useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import { useTranslations } from "@/hooks/useTranslations";
import ReportShell, { ReportKpi, ReportFilterField } from "./ReportShell";
import ReportDateRange from "./ReportDateRange";
import ReportBranchFilter from "./ReportBranchFilter";
import ReportSearch from "./ReportSearch";
import ReportPager from "./ReportPager";
import ReportCompareToggle from "./ReportCompareToggle";
import { getSuppliersReport, type SuppliersReport as SuppliersData } from "@/lib/api";
import { currentMonthRange, formatMoney, formatNumber, rangeLabel, toISODate } from "@/lib/reportFormat";
import { useReportComparison } from "@/hooks/useReportComparison";
import { deltaPct, type CompareMode } from "@/lib/reportCompare";
import { exportAoaToExcel } from "@/lib/exportExcel";

const PAGE = 14;
const th = "py-3 px-4 sm:px-6 font-medium text-gray-500 text-sm dark:text-gray-400";

export default function SuppliersReport() {
  const { t } = useTranslations();
  const [range, setRange] = useState<[Date | null, Date | null]>(currentMonthRange());
  const [branchId, setBranchId] = useState("");
  const [data, setData] = useState<SuppliersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [compare, setCompare] = useState<CompareMode>("off");
  const som = t("reportsPage.som");
  const money = (n: number) => formatMoney(n, som);

  const { prev } = useReportComparison(compare, range, [branchId], (f, tt) =>
    getSuppliersReport(f, tt, branchId || undefined),
  );
  const delta = (k: keyof SuppliersData["totals"]) =>
    prev && data ? deltaPct(data.totals[k], prev.totals[k]) : undefined;

  useEffect(() => {
    let active = true;
    const [from, to] = range;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const d = await getSuppliersReport(
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
    const list = data?.suppliers ?? [];
    if (!q) return list;
    return list.filter((s) => s.supplierName.toLowerCase().includes(q));
  }, [data, search]);
  const paged = filtered.slice((page - 1) * PAGE, page * PAGE);
  const totals = data?.totals;

  const handleExport = () => {
    if (!data) return;
    const aoa: (string | number)[][] = [
      [t("reportsPage.supplier"), t("reportsPage.receipts"), t("reportsPage.purchased"), t("reportsPage.paid"), t("reportsPage.returned"), t("reportsPage.supplierDebt")],
      ...filtered.map((s) => [s.supplierName, s.receipts, Math.round(s.purchased), Math.round(s.paid), Math.round(s.returned), Math.round(s.outstanding)]),
    ];
    exportAoaToExcel("suppliers-report", aoa, "Suppliers");
  };

  const kpis = totals ? (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <ReportKpi label={t("reportsPage.purchased")} value={money(totals.purchased)} delta={delta("purchased")} />
      <ReportKpi label={t("reportsPage.paid")} value={money(totals.paid)} tone="success" delta={delta("paid")} />
      <ReportKpi label={t("reportsPage.supplierDebt")} value={money(totals.outstanding)} tone={totals.outstanding > 0 ? "error" : "default"} delta={delta("outstanding")} deltaInverse />
      <ReportKpi label={t("reportsPage.supplier")} value={formatNumber(totals.suppliers)} delta={delta("suppliers")} />
    </div>
  ) : null;

  return (
    <ReportShell
      title={t("sidebar.reportsSuppliers")}
      filterSummary={rangeLabel(range)}
      activeFilterCount={(branchId ? 1 : 0) + (compare !== "off" ? 1 : 0)}
      search={<ReportSearch value={search} onChange={(v) => { setSearch(v); setPage(1); }} />}
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
      exportDisabled={!data || loading || filtered.length === 0}
    >
      <div className="w-full overflow-x-auto -mx-4 sm:-mx-6 tabular-nums">
        <Table className="w-full min-w-[820px]">
          <TableHeader className="border-y border-gray-100 dark:border-gray-800">
            <TableRow>
              <TableCell isHeader className={`${th} text-start`}>{t("reportsPage.supplier")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.receipts")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.purchased")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.paid")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.returned")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.supplierDebt")}</TableCell>
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
              paged.map((s, i) => (
                <TableRow key={s.supplierId ?? i} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                  <TableCell className="py-3 px-4 sm:px-6 text-gray-800 font-medium dark:text-white/90">{s.supplierName}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-500 dark:text-gray-400">{formatNumber(s.receipts)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-800 dark:text-white/90">{money(s.purchased)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-success-600 dark:text-success-500">{money(s.paid)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-500 dark:text-gray-400">{s.returned > 0 ? money(s.returned) : "—"}</TableCell>
                  <TableCell className={`py-3 px-4 sm:px-6 text-end font-medium ${s.outstanding > 0 ? "text-error-500" : "text-gray-500 dark:text-gray-400"}`}>{s.outstanding > 0 ? money(s.outstanding) : "—"}</TableCell>
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
