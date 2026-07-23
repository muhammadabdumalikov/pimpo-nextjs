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
import ReportCompareToggle from "./ReportCompareToggle";
import { getCustomersReport, type CustomersReport as CustData } from "@/lib/api";
import { currentMonthRange, formatMoney, formatNumber, formatDate, rangeLabel, toISODate } from "@/lib/reportFormat";
import { useReportComparison } from "@/hooks/useReportComparison";
import { deltaPct, type CompareMode } from "@/lib/reportCompare";
import { exportAoaToExcel } from "@/lib/exportExcel";

const PAGE = 12;
const th = "py-3 px-4 sm:px-6 font-medium text-gray-500 text-sm dark:text-gray-400";

export default function CustomersReport() {
  const { t } = useTranslations();
  const [range, setRange] = useState<[Date | null, Date | null]>(currentMonthRange());
  const [branchId, setBranchId] = useState("");
  const [data, setData] = useState<CustData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [compare, setCompare] = useState<CompareMode>("off");
  const som = t("reportsPage.som");
  const money = (n: number) => formatMoney(n, som);

  const { prev } = useReportComparison(compare, range, [branchId], (f, tt) =>
    getCustomersReport(f, tt, branchId || undefined),
  );
  const delta = (k: keyof CustData["totals"]) =>
    prev && data ? deltaPct(data.totals[k], prev.totals[k]) : undefined;

  useEffect(() => {
    let active = true;
    const [from, to] = range;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const d = await getCustomersReport(
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
    const items = data?.customers ?? [];
    if (!q) return items;
    return items.filter((c) => c.name.toLowerCase().includes(q) || (c.phone ?? "").includes(q));
  }, [data, search]);

  const paged = filtered.slice((page - 1) * PAGE, page * PAGE);

  const handleExport = () => {
    if (!data) return;
    const aoa: (string | number)[][] = [
      [
        t("reportsPage.customer"),
        t("reportsPage.phone"),
        t("reportsPage.orders"),
        t("reportsPage.revenue"),
        t("reportsPage.avgCheck"),
        t("reportsPage.lastPurchase"),
      ],
      ...filtered.map((c) => [
        c.name,
        c.phone ?? "",
        c.orderCount,
        Math.round(c.revenue),
        Math.round(c.avgCheck),
        formatDate(c.lastOrderAt),
      ]),
    ];
    exportAoaToExcel("customers-report", aoa, "Customers");
  };

  const kpis = data ? (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <ReportKpi label={t("reportsPage.newCustomers")} value={formatNumber(data.totals.newCustomers)} tone="success" delta={delta("newCustomers")} />
      <ReportKpi label={t("reportsPage.returningCustomers")} value={formatNumber(data.totals.returningCustomers)} delta={delta("returningCustomers")} />
      <ReportKpi label={t("reportsPage.revenue")} value={money(data.totals.revenue)} delta={delta("revenue")} />
      <ReportKpi label={t("reportsPage.avgCheck")} value={money(data.totals.avgCheck)} delta={delta("avgCheck")} />
    </div>
  ) : null;

  return (
    <ReportShell
      title={t("sidebar.reportsCustomers")}
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
      exportDisabled={!data || loading}
    >
      <div className="w-full overflow-x-auto -mx-4 sm:-mx-6 tabular-nums">
        <Table className="w-full min-w-[720px]">
          <TableHeader className="border-y border-gray-100 dark:border-gray-800">
            <TableRow>
              <TableCell isHeader className={`${th} text-start`}>{t("reportsPage.customer")}</TableCell>
              <TableCell isHeader className={`${th} text-start`}>{t("reportsPage.phone")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.orders")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.revenue")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.avgCheck")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.lastPurchase")}</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <ReportTableSkeleton columns={6} />
            ) : error ? (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-error-500">{error}</TableCell></TableRow>
            ) : paged.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-gray-500 dark:text-gray-400">{t("reportsPage.noData")}</TableCell></TableRow>
            ) : (
              paged.map((c, i) => (
                <TableRow key={c.userId ?? i} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                  <TableCell className="py-3 px-4 sm:px-6 text-gray-800 font-medium dark:text-white/90">{c.name}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-gray-500 dark:text-gray-400">{c.phone ?? "—"}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-800 dark:text-white/90">{formatNumber(c.orderCount)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end font-medium text-gray-800 dark:text-white/90">{money(c.revenue)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-500 dark:text-gray-400">{money(c.avgCheck)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-500 dark:text-gray-400">{formatDate(c.lastOrderAt)}</TableCell>
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
