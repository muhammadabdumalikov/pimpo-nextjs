"use client";
import { useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import Badge from "../ui/badge/Badge";
import SelectField from "../form/SelectField";
import { useTranslations } from "@/hooks/useTranslations";
import ReportShell, { ReportKpi, ReportFilterField } from "./ReportShell";
import ReportDateRange from "./ReportDateRange";
import { getStockTakesReport, type StockTakesReport as Data } from "@/lib/api";
import { currentMonthRange, formatMoney, formatDate, formatNumber, rangeLabel, toISODate } from "@/lib/reportFormat";
import { exportAoaToExcel } from "@/lib/exportExcel";

const th = "py-3 px-4 sm:px-6 font-medium text-gray-500 text-sm dark:text-gray-400";

export default function StockTakesReport() {
  const { t } = useTranslations();
  const [range, setRange] = useState<[Date | null, Date | null]>(currentMonthRange());
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const som = t("reportsPage.som");
  const money = (n: number) => formatMoney(n, som);

  // Client-side type filter (full / partial); totals recompute from the subset.
  const items = useMemo(() => {
    const all = data?.items ?? [];
    return typeFilter === "all" ? all : all.filter((r) => r.type === typeFilter);
  }, [data, typeFilter]);

  const totals = useMemo(
    () => ({
      stockTakes: items.length,
      diffValue: items.reduce((s, i) => s + i.diffValue, 0),
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
        const d = await getStockTakesReport(
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

  const typeLabel = (ty: string) => (ty === "full" ? t("reportsPage.full") : t("reportsPage.partialType"));

  const handleExport = () => {
    if (!data) return;
    const aoa: (string | number)[][] = [
      [
        t("reportsPage.name"),
        t("reportsPage.type"),
        t("reportsPage.by"),
        t("reportsPage.date"),
        t("reportsPage.surplus"),
        t("reportsPage.shortage"),
        t("reportsPage.diffValue"),
      ],
      ...items.map((r) => [
        r.name,
        typeLabel(r.type),
        r.createdByCashierName,
        formatDate(r.completedAt),
        r.surplusQty,
        r.shortageQty,
        Math.round(r.diffValue),
      ]),
    ];
    exportAoaToExcel("stock-takes-report", aoa, "StockTakes");
  };

  const kpis = data ? (
    <div className="grid grid-cols-2 gap-4 sm:max-w-md">
      <ReportKpi label={t("reportsPage.name")} value={formatNumber(totals.stockTakes)} />
      <ReportKpi
        label={t("reportsPage.diffValue")}
        value={money(totals.diffValue)}
        tone={totals.diffValue >= 0 ? "success" : "error"}
      />
    </div>
  ) : null;

  return (
    <ReportShell
      title={t("sidebar.reportsStockTakes")}
      filterSummary={rangeLabel(range)}
      activeFilterCount={typeFilter !== "all" ? 1 : 0}
      filters={
        <>
          <ReportFilterField label={t("reportsPage.period")}>
            <ReportDateRange value={range} onChange={setRange} />
          </ReportFilterField>
          <ReportFilterField label={t("reportsPage.type")}>
            <SelectField
              className="min-w-[180px]"
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: "all", label: t("reportsPage.all") },
                { value: "full", label: t("reportsPage.full") },
                { value: "partial", label: t("reportsPage.partialType") },
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
        <Table className="w-full min-w-[760px]">
          <TableHeader className="border-y border-gray-100 dark:border-gray-800">
            <TableRow>
              <TableCell isHeader className={`${th} text-start`}>{t("reportsPage.name")}</TableCell>
              <TableCell isHeader className={`${th} text-center`}>{t("reportsPage.type")}</TableCell>
              <TableCell isHeader className={`${th} text-start`}>{t("reportsPage.by")}</TableCell>
              <TableCell isHeader className={`${th} text-start`}>{t("reportsPage.date")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.surplus")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.shortage")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.diffValue")}</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-gray-500 dark:text-gray-400">{t("reportsPage.loading")}</TableCell></TableRow>
            ) : error ? (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-error-500">{error}</TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-gray-500 dark:text-gray-400">{t("reportsPage.noData")}</TableCell></TableRow>
            ) : (
              items.map((r) => (
                <TableRow key={r.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                  <TableCell className="py-3 px-4 sm:px-6 text-gray-800 font-medium dark:text-white/90">{r.name}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-center">
                    <Badge color={r.type === "full" ? "info" : "light"}>{typeLabel(r.type)}</Badge>
                  </TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-gray-500 dark:text-gray-400">{r.createdByCashierName}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-gray-500 dark:text-gray-400">{formatDate(r.completedAt)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-success-600 dark:text-success-500">{formatNumber(r.surplusQty)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-error-500">{formatNumber(r.shortageQty)}</TableCell>
                  <TableCell className={`py-3 px-4 sm:px-6 text-end font-medium ${r.diffValue >= 0 ? "text-success-600 dark:text-success-500" : "text-error-500"}`}>{money(r.diffValue)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </ReportShell>
  );
}
