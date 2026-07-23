"use client";
import { useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableRow } from "../ui/table";
import { useTranslations } from "@/hooks/useTranslations";
import ReportShell, { ReportKpi, ReportFilterField } from "./ReportShell";
import { ReportTableSkeleton } from "./ReportSkeleton";
import ReportDateRange from "./ReportDateRange";
import ReportBranchFilter from "./ReportBranchFilter";
import { getPnlReport, type PnlReport as PnlData } from "@/lib/api";
import { currentMonthRange, formatMoney, rangeLabel, toISODate } from "@/lib/reportFormat";
import { exportAoaToExcel } from "@/lib/exportExcel";

type RowStyle = "normal" | "subtotal" | "total" | "muted";

export default function PnlReport() {
  const { t } = useTranslations();
  const [range, setRange] = useState<[Date | null, Date | null]>(currentMonthRange());
  const [branchId, setBranchId] = useState("");
  const [data, setData] = useState<PnlData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const som = t("reportsPage.som");
  const money = (n: number) => formatMoney(n, som);

  useEffect(() => {
    let active = true;
    const [from, to] = range;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const d = await getPnlReport(
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
    return () => {
      active = false;
    };
  }, [range, branchId]);

  // Ordered P&L lines derived from the report payload.
  const rows = useMemo(() => {
    if (!data) return [] as { label: string; value: string; style: RowStyle }[];
    const out: { label: string; value: string; style: RowStyle }[] = [];
    out.push({ label: t("reportsPage.grossRevenue"), value: money(data.revenue.gross), style: "normal" });
    out.push({ label: t("reportsPage.discounts"), value: `− ${money(data.revenue.discounts)}`, style: "muted" });
    out.push({ label: t("reportsPage.returnsLine"), value: `− ${money(data.revenue.returns)}`, style: "muted" });
    out.push({ label: t("reportsPage.netRevenue"), value: money(data.revenue.net), style: "subtotal" });
    out.push({ label: t("reportsPage.totalIncome"), value: money(data.totalIncome), style: "total" });
    out.push({ label: t("reportsPage.cogs"), value: `− ${money(data.cogs)}`, style: "muted" });
    out.push({ label: t("reportsPage.grossProfit"), value: money(data.grossProfit), style: "subtotal" });
    out.push({ label: t("reportsPage.grossMargin"), value: `${data.grossMargin.toFixed(1)}%`, style: "muted" });
    for (const e of data.expenses) {
      out.push({ label: e.category, value: `− ${money(e.amount)}`, style: "muted" });
    }
    out.push({ label: t("reportsPage.totalExpenses"), value: `− ${money(data.totalExpenses)}`, style: "subtotal" });
    out.push({
      label: t("reportsPage.cashDifference"),
      value: `${data.cashDifference >= 0 ? "+" : "−"} ${money(Math.abs(data.cashDifference))}`,
      style: "muted",
    });
    out.push({ label: t("reportsPage.netProfit"), value: money(data.netProfit), style: "total" });
    return out;
  }, [data, som]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExport = () => {
    if (!data) return;
    const aoa: (string | number)[][] = [
      [t("reportsPage.indicator"), t("reportsPage.amount")],
      ...rows.map((r) => [r.label, r.value]),
    ];
    exportAoaToExcel("pnl-report", aoa, "P&L");
  };

  const kpis = data ? (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <ReportKpi label={t("reportsPage.netRevenue")} value={money(data.revenue.net)} />
      <ReportKpi label={t("reportsPage.grossProfit")} value={money(data.grossProfit)} tone="success" />
      <ReportKpi label={t("reportsPage.totalExpenses")} value={money(data.totalExpenses)} tone="error" />
      <ReportKpi
        label={t("reportsPage.netProfit")}
        value={money(data.netProfit)}
        tone={data.netProfit >= 0 ? "success" : "error"}
      />
    </div>
  ) : null;

  const styleClass = (s: RowStyle) => {
    switch (s) {
      case "total":
        return "font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-white/[0.04]";
      case "subtotal":
        return "font-semibold text-gray-800 dark:text-white/90";
      case "muted":
        return "text-gray-500 dark:text-gray-400 pl-8";
      default:
        return "text-gray-700 dark:text-gray-300";
    }
  };

  return (
    <ReportShell
      title={t("sidebar.reportsPnl")}
      filterSummary={rangeLabel(range)}
      activeFilterCount={branchId ? 1 : 0}
      filters={
        <>
          <ReportFilterField label={t("reportsPage.period")}>
            <ReportDateRange value={range} onChange={setRange} />
          </ReportFilterField>
          <ReportBranchFilter value={branchId} onChange={setBranchId} />
        </>
      }
      kpis={kpis}
      onExport={handleExport}
      exportDisabled={!data || loading}
    >
      <div className="w-full overflow-x-auto tabular-nums">
        <Table className="w-full min-w-[480px]">
          <TableBody>
            {loading ? (
              <ReportTableSkeleton columns={2} />
            ) : error ? (
              <TableRow>
                <TableCell colSpan={2} className="py-10 text-center text-error-500">
                  {error}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r, i) => (
                <TableRow key={i} className="border-b border-gray-100 dark:border-gray-800">
                  <TableCell className={`py-3 px-4 sm:px-6 text-sm ${styleClass(r.style)}`}>
                    {r.label}
                  </TableCell>
                  <TableCell className={`py-3 px-4 sm:px-6 text-sm text-right ${styleClass(r.style)}`}>
                    {r.value}
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
