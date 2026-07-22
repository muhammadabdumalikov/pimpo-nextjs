"use client";
import { useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import { useTranslations } from "@/hooks/useTranslations";
import SelectField from "../form/SelectField";
import ReportShell, { ReportKpi, ReportFilterField } from "./ReportShell";
import ReportDateRange from "./ReportDateRange";
import ReportBranchFilter from "./ReportBranchFilter";
import ReportSearch from "./ReportSearch";
import ReportCompareToggle from "./ReportCompareToggle";
import { getAssortmentReport, type AssortmentReport as AssortData, type AssortmentDimension } from "@/lib/api";
import { currentMonthRange, formatMoney, formatNumber, rangeLabel, toISODate } from "@/lib/reportFormat";
import { useReportComparison } from "@/hooks/useReportComparison";
import { deltaPct, type CompareMode } from "@/lib/reportCompare";
import { exportAoaToExcel } from "@/lib/exportExcel";

const th = "py-3 px-4 sm:px-6 font-medium text-gray-500 text-sm dark:text-gray-400";

export default function AssortmentReport() {
  const { t } = useTranslations();
  const [range, setRange] = useState<[Date | null, Date | null]>(currentMonthRange());
  const [branchId, setBranchId] = useState("");
  const [dimension, setDimension] = useState<AssortmentDimension>("category");
  const [data, setData] = useState<AssortData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [compare, setCompare] = useState<CompareMode>("off");
  const som = t("reportsPage.som");
  const money = (n: number) => formatMoney(n, som);

  const { prev } = useReportComparison(compare, range, [branchId, dimension], (f, tt) =>
    getAssortmentReport(f, tt, branchId || undefined, dimension),
  );
  const delta = (k: keyof AssortData["totals"]) =>
    prev && data ? deltaPct(data.totals[k], prev.totals[k]) : undefined;

  useEffect(() => {
    let active = true;
    const [from, to] = range;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const d = await getAssortmentReport(
          from ? toISODate(from) : undefined,
          to ? toISODate(to) : undefined,
          branchId || undefined,
          dimension,
        );
        if (active) setData(d);
      } catch (e) {
        if (active) setError((e as Error)?.message || "Failed to load");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [range, branchId, dimension]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const list = data?.groups ?? [];
    if (!q) return list;
    return list.filter((g) => g.name.toLowerCase().includes(q));
  }, [data, search]);

  const handleExport = () => {
    if (!data) return;
    const aoa: (string | number)[][] = [
      [dimension === "brand" ? t("reportsPage.brand") : t("reportsPage.category"), t("reportsPage.units"), t("reportsPage.revenue"), t("reportsPage.profit"), t("reportsPage.marginShort"), t("reportsPage.share")],
      ...filtered.map((g) => [g.name, g.units, Math.round(g.revenue), Math.round(g.profit), `${g.margin.toFixed(1)}%`, `${g.share.toFixed(1)}%`]),
    ];
    exportAoaToExcel("assortment-report", aoa, "Assortment");
  };

  const totals = data?.totals;
  const kpis = totals ? (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <ReportKpi label={t("reportsPage.revenue")} value={money(totals.revenue)} tone="success" delta={delta("revenue")} />
      <ReportKpi label={t("reportsPage.profit")} value={money(totals.profit)} tone={totals.profit >= 0 ? "success" : "error"} delta={delta("profit")} />
      <ReportKpi label={dimension === "brand" ? t("reportsPage.brands") : t("reportsPage.categories")} value={formatNumber(totals.groups)} delta={delta("groups")} />
      <ReportKpi label={t("reportsPage.units")} value={formatNumber(totals.units)} delta={delta("units")} />
    </div>
  ) : null;

  return (
    <ReportShell
      title={t("sidebar.reportsAssortment")}
      filterSummary={rangeLabel(range)}
      activeFilterCount={(branchId ? 1 : 0) + (dimension !== "category" ? 1 : 0) + (compare !== "off" ? 1 : 0)}
      search={<ReportSearch value={search} onChange={setSearch} />}
      filters={
        <>
          <ReportFilterField label={t("reportsPage.period")}>
            <ReportDateRange value={range} onChange={setRange} />
          </ReportFilterField>
          <ReportCompareToggle value={compare} onChange={setCompare} />
          <ReportFilterField label={t("reportsPage.dimension")}>
            <SelectField
              className="min-w-[170px]"
              value={dimension}
              onChange={(v) => setDimension(v as AssortmentDimension)}
              options={[
                { value: "category", label: t("reportsPage.byCategory") },
                { value: "brand", label: t("reportsPage.byBrand") },
              ]}
            />
          </ReportFilterField>
          <ReportBranchFilter value={branchId} onChange={setBranchId} />
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
              <TableCell isHeader className={`${th} text-start`}>{dimension === "brand" ? t("reportsPage.brand") : t("reportsPage.category")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.units")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.revenue")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.profit")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.marginShort")}</TableCell>
              <TableCell isHeader className={`${th} text-start`}>{t("reportsPage.share")}</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-gray-500 dark:text-gray-400">{t("reportsPage.loading")}</TableCell></TableRow>
            ) : error ? (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-error-500">{error}</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-gray-500 dark:text-gray-400">{t("reportsPage.noData")}</TableCell></TableRow>
            ) : (
              filtered.map((g, i) => (
                <TableRow key={g.key ?? i} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                  <TableCell className="py-3 px-4 sm:px-6 text-gray-800 font-medium dark:text-white/90">{g.name}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-500 dark:text-gray-400">{formatNumber(g.units)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end font-medium text-success-600 dark:text-success-500">{money(g.revenue)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-800 dark:text-white/90">{money(g.profit)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-500 dark:text-gray-400">{g.margin.toFixed(1)}%</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-full max-w-[140px] overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.06]">
                        <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(100, g.share)}%` }} />
                      </div>
                      <span className="w-12 shrink-0 text-end text-sm text-gray-500 dark:text-gray-400">{g.share.toFixed(1)}%</span>
                    </div>
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
