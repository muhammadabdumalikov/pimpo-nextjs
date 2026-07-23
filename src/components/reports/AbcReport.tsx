"use client";
import { useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import Badge from "../ui/badge/Badge";
import { useTranslations } from "@/hooks/useTranslations";
import ReportShell, { ReportKpi, ReportFilterField } from "./ReportShell";
import { ReportTableSkeleton } from "./ReportSkeleton";
import ReportDateRange from "./ReportDateRange";
import ReportBranchFilter from "./ReportBranchFilter";
import ReportPager from "./ReportPager";
import { getProductPerformance, type ProductPerformanceRow } from "@/lib/api";
import { currentMonthRange, formatMoney, formatNumber, rangeLabel, toISODate } from "@/lib/reportFormat";
import { exportAoaToExcel } from "@/lib/exportExcel";

const PAGE = 12;
const th = "py-3 px-4 sm:px-6 font-medium text-gray-500 text-sm dark:text-gray-400";

type Seg = "A" | "B" | "C";
interface AbcRow extends ProductPerformanceRow {
  share: number;
  cumulative: number;
  segment: Seg;
}

// A ≈ top 80% of revenue, B ≈ next 15% (→95%), C ≈ last 5%.
function segment(cumulative: number): Seg {
  if (cumulative <= 80) return "A";
  if (cumulative <= 95) return "B";
  return "C";
}

const segColor = (s: Seg): "success" | "warning" | "light" =>
  s === "A" ? "success" : s === "B" ? "warning" : "light";

export default function AbcReport() {
  const { t } = useTranslations();
  const [range, setRange] = useState<[Date | null, Date | null]>(currentMonthRange());
  const [branchId, setBranchId] = useState("");
  const [raw, setRaw] = useState<ProductPerformanceRow[]>([]);
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
        const d = await getProductPerformance(
          from ? toISODate(from) : undefined,
          to ? toISODate(to) : undefined,
          branchId || undefined,
        );
        if (active) setRaw(d);
      } catch (e) {
        if (active) setError((e as Error)?.message || "Failed to load");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [range, branchId]);

  const rows = useMemo<AbcRow[]>(() => {
    const total = raw.reduce((s, r) => s + r.revenue, 0);
    if (total <= 0) return [];
    let cum = 0;
    return [...raw]
      .sort((a, b) => b.revenue - a.revenue)
      .map((r) => {
        const share = (r.revenue / total) * 100;
        cum += share;
        return { ...r, share, cumulative: cum, segment: segment(cum) };
      });
  }, [raw]);

  const counts = useMemo(() => {
    return {
      A: rows.filter((r) => r.segment === "A").length,
      B: rows.filter((r) => r.segment === "B").length,
      C: rows.filter((r) => r.segment === "C").length,
    };
  }, [rows]);

  const paged = rows.slice((page - 1) * PAGE, page * PAGE);

  const handleExport = () => {
    const aoa: (string | number)[][] = [
      [
        t("reportsPage.product"),
        t("reportsPage.revenue"),
        t("reportsPage.share"),
        t("reportsPage.cumulative"),
        t("reportsPage.segment"),
      ],
      ...rows.map((r) => [
        r.name,
        Math.round(r.revenue),
        `${r.share.toFixed(1)}%`,
        `${r.cumulative.toFixed(1)}%`,
        r.segment,
      ]),
    ];
    exportAoaToExcel("abc-analysis", aoa, "ABC");
  };

  const kpis = (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <ReportKpi label={t("reportsPage.products")} value={formatNumber(rows.length)} />
      <ReportKpi label="A" value={formatNumber(counts.A)} tone="success" />
      <ReportKpi label="B" value={formatNumber(counts.B)} />
      <ReportKpi label="C" value={formatNumber(counts.C)} tone="error" />
    </div>
  );

  return (
    <ReportShell
      title={t("sidebar.reportsAbc")}
      filterSummary={rangeLabel(range)}
      activeFilterCount={branchId ? 1 : 0}
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
      exportDisabled={loading || rows.length === 0}
    >
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">{t("reportsPage.abcHint")}</p>
      <div className="w-full overflow-x-auto -mx-4 sm:-mx-6 tabular-nums">
        <Table className="w-full min-w-[680px]">
          <TableHeader className="border-y border-gray-100 dark:border-gray-800">
            <TableRow>
              <TableCell isHeader className={`${th} text-start`}>{t("reportsPage.product")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.revenue")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.share")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.cumulative")}</TableCell>
              <TableCell isHeader className={`${th} text-center`}>{t("reportsPage.segment")}</TableCell>
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
              paged.map((r) => (
                <TableRow key={r.productId ?? r.name} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                  <TableCell className="py-3 px-4 sm:px-6 text-gray-800 font-medium dark:text-white/90">{r.name}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end font-medium text-gray-800 dark:text-white/90">{money(r.revenue)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-500 dark:text-gray-400">{r.share.toFixed(1)}%</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-500 dark:text-gray-400">{r.cumulative.toFixed(1)}%</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-center">
                    <Badge color={segColor(r.segment)}>{r.segment}</Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {!loading && !error && rows.length > PAGE && (
        <ReportPager page={page} totalItems={rows.length} pageSize={PAGE} onPage={setPage} />
      )}
    </ReportShell>
  );
}
