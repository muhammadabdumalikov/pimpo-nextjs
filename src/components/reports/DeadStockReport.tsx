"use client";
import { useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import { useTranslations } from "@/hooks/useTranslations";
import SelectField from "../form/SelectField";
import ReportShell, { ReportKpi, ReportFilterField } from "./ReportShell";
import { ReportTableSkeleton } from "./ReportSkeleton";
import ReportBranchFilter from "./ReportBranchFilter";
import ReportSearch from "./ReportSearch";
import ReportPager from "./ReportPager";
import { getDeadStockReport, type DeadStockReport as DeadData } from "@/lib/api";
import { formatMoney, formatNumber, formatDate } from "@/lib/reportFormat";
import { exportAoaToExcel } from "@/lib/exportExcel";

const PAGE = 14;
const th = "py-3 px-4 sm:px-6 font-medium text-gray-500 text-sm dark:text-gray-400";

export default function DeadStockReport() {
  const { t } = useTranslations();
  const [branchId, setBranchId] = useState("");
  const [days, setDays] = useState(30);
  const [data, setData] = useState<DeadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const som = t("reportsPage.som");
  const money = (n: number) => formatMoney(n, som);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const d = await getDeadStockReport(branchId || undefined, days);
        if (active) setData(d);
      } catch (e) {
        if (active) setError((e as Error)?.message || "Failed to load");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [branchId, days]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const list = data?.items ?? [];
    if (!q) return list;
    return list.filter((i) => i.name.toLowerCase().includes(q) || (i.code ?? "").toLowerCase().includes(q));
  }, [data, search]);
  const paged = filtered.slice((page - 1) * PAGE, page * PAGE);

  const handleExport = () => {
    if (!data) return;
    const aoa: (string | number)[][] = [
      [t("reportsPage.product"), t("reportsPage.quantity"), t("reportsPage.costPrice"), t("reportsPage.frozenValue"), t("reportsPage.lastSale"), t("reportsPage.daysSinceSale")],
      ...filtered.map((i) => [i.name, i.quantity, Math.round(i.priceIn), Math.round(i.frozenValue), i.lastSaleAt ? formatDate(i.lastSaleAt) : "—", i.daysSinceSale ?? "∞"]),
    ];
    exportAoaToExcel("dead-stock-report", aoa, "DeadStock");
  };

  const totals = data?.totals;
  const kpis = totals ? (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <ReportKpi label={t("reportsPage.frozenValue")} value={money(totals.frozenValue)} tone="error" />
      <ReportKpi label={t("reportsPage.products")} value={formatNumber(totals.products)} />
      <ReportKpi label={t("reportsPage.units")} value={formatNumber(totals.units)} />
    </div>
  ) : null;

  return (
    <ReportShell
      title={t("sidebar.reportsDeadStock")}
      filterSummary={`${days} ${t("reportsPage.notSoldInDays")}`}
      activeFilterCount={(branchId ? 1 : 0) + (days !== 30 ? 1 : 0)}
      search={<ReportSearch value={search} onChange={(v) => { setSearch(v); setPage(1); }} />}
      filters={
        <>
          <ReportFilterField label={t("reportsPage.period")}>
            <SelectField
              className="min-w-[160px]"
              value={String(days)}
              onChange={(v) => { setDays(Number(v)); setPage(1); }}
              options={[
                { value: "30", label: t("reportsPage.days30") },
                { value: "60", label: t("reportsPage.days60") },
                { value: "90", label: t("reportsPage.days90") },
              ]}
            />
          </ReportFilterField>
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
              <TableCell isHeader className={`${th} text-start`}>{t("reportsPage.product")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.quantity")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.costPrice")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.frozenValue")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.lastSale")}</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <ReportTableSkeleton columns={5} />
            ) : error ? (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-error-500">{error}</TableCell></TableRow>
            ) : paged.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-gray-500 dark:text-gray-400">{t("reportsPage.noData")}</TableCell></TableRow>
            ) : (
              paged.map((i) => (
                <TableRow key={i.productId} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                  <TableCell className="py-3 px-4 sm:px-6 text-gray-800 font-medium dark:text-white/90">
                    {i.name}
                    {i.code && <span className="block text-xs text-gray-400">{i.code}</span>}
                  </TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-800 dark:text-white/90">{formatNumber(i.quantity)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-500 dark:text-gray-400">{money(i.priceIn)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end font-medium text-error-500">{money(i.frozenValue)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-500 dark:text-gray-400">
                    {i.lastSaleAt ? formatDate(i.lastSaleAt) : t("reportsPage.neverSold")}
                    {i.daysSinceSale !== null && <span className="block text-xs text-gray-400">{i.daysSinceSale} {t("reportsPage.daysShort")}</span>}
                  </TableCell>
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
