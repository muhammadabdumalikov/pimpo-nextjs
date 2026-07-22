"use client";
import { useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import { useTranslations } from "@/hooks/useTranslations";
import SelectField from "../form/SelectField";
import ReportShell, { ReportKpi, ReportFilterField } from "./ReportShell";
import ReportBranchFilter from "./ReportBranchFilter";
import ReportSearch from "./ReportSearch";
import ReportPager from "./ReportPager";
import { getReorderReport, type ReorderReport as ReorderData } from "@/lib/api";
import { formatNumber } from "@/lib/reportFormat";
import { exportAoaToExcel } from "@/lib/exportExcel";

const PAGE = 14;
const th = "py-3 px-4 sm:px-6 font-medium text-gray-500 text-sm dark:text-gray-400";

export default function ReorderReport() {
  const { t } = useTranslations();
  const [branchId, setBranchId] = useState("");
  const [days, setDays] = useState(30);
  const [data, setData] = useState<ReorderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const d = await getReorderReport(branchId || undefined, days);
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

  const daysOfStock = (v: number | null) => (v === null ? "∞" : v < 1 ? "<1" : String(Math.round(v)));

  const handleExport = () => {
    if (!data) return;
    const aoa: (string | number)[][] = [
      [t("reportsPage.product"), t("reportsPage.quantity"), t("reportsPage.threshold"), t("reportsPage.soldWindow"), t("reportsPage.velocity"), t("reportsPage.daysOfStock"), t("reportsPage.suggestedQty")],
      ...filtered.map((i) => [i.name, i.quantity, i.threshold ?? "—", i.soldWindow, i.dailyVelocity.toFixed(2), i.daysOfStock === null ? "∞" : Math.round(i.daysOfStock), i.suggestedQty]),
    ];
    exportAoaToExcel("reorder-report", aoa, "Reorder");
  };

  const totals = data?.totals;
  const kpis = totals ? (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <ReportKpi label={t("reportsPage.flaggedProducts")} value={formatNumber(totals.products)} tone={totals.products > 0 ? "error" : "default"} />
      <ReportKpi label={t("reportsPage.suggestedUnits")} value={formatNumber(totals.suggestedUnits)} />
    </div>
  ) : null;

  return (
    <ReportShell
      title={t("sidebar.reportsReorder")}
      filterSummary={`${t("reportsPage.velocity")}: ${days} ${t("reportsPage.daysShort")}${data ? ` · ${t("reportsPage.coverDays")}: ${data.coverDays} ${t("reportsPage.daysShort")}` : ""}`}
      activeFilterCount={(branchId ? 1 : 0) + (days !== 30 ? 1 : 0)}
      search={<ReportSearch value={search} onChange={(v) => { setSearch(v); setPage(1); }} />}
      filters={
        <>
          <ReportFilterField label={t("reportsPage.velocity")}>
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
        <Table className="w-full min-w-[900px]">
          <TableHeader className="border-y border-gray-100 dark:border-gray-800">
            <TableRow>
              <TableCell isHeader className={`${th} text-start`}>{t("reportsPage.product")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.quantity")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.threshold")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.soldWindow")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.velocity")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.daysOfStock")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.suggestedQty")}</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-gray-500 dark:text-gray-400">{t("reportsPage.loading")}</TableCell></TableRow>
            ) : error ? (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-error-500">{error}</TableCell></TableRow>
            ) : paged.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-gray-500 dark:text-gray-400">{t("reportsPage.noData")}</TableCell></TableRow>
            ) : (
              paged.map((i) => {
                const critical = i.daysOfStock !== null && i.daysOfStock < 7;
                const warn = i.daysOfStock !== null && i.daysOfStock < 14;
                return (
                  <TableRow key={i.productId} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <TableCell className="py-3 px-4 sm:px-6 text-gray-800 font-medium dark:text-white/90">
                      {i.name}
                      {i.code && <span className="block text-xs text-gray-400">{i.code}</span>}
                    </TableCell>
                    <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-800 dark:text-white/90">{formatNumber(i.quantity)}</TableCell>
                    <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-500 dark:text-gray-400">{i.threshold ?? "—"}</TableCell>
                    <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-500 dark:text-gray-400">{formatNumber(i.soldWindow)}</TableCell>
                    <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-500 dark:text-gray-400">{i.dailyVelocity.toFixed(1)}</TableCell>
                    <TableCell className={`py-3 px-4 sm:px-6 text-end font-medium ${critical ? "text-error-500" : warn ? "text-amber-600 dark:text-amber-400" : "text-gray-800 dark:text-white/90"}`}>{daysOfStock(i.daysOfStock)}</TableCell>
                    <TableCell className="py-3 px-4 sm:px-6 text-end font-medium text-brand-500">{i.suggestedQty > 0 ? formatNumber(i.suggestedQty) : "—"}</TableCell>
                  </TableRow>
                );
              })
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
