"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import { RiFileExcel2Line } from "react-icons/ri";
import { LuArrowRight } from "react-icons/lu";
import { useTranslations } from "@/hooks/useTranslations";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReportKpi } from "@/components/reports/ReportShell";
import ReportPager from "@/components/reports/ReportPager";
import { REPORTS } from "@/lib/reportsCatalog";
import {
  formatCompact,
  formatDate,
  formatMoney,
  formatNumber,
  type CompactUnits,
} from "@/lib/reportFormat";
import { exportAoaToExcel } from "@/lib/exportExcel";
import type {
  AiArtifact,
  ChartArtifact,
  KpiArtifact,
  LinkArtifact,
  NumberFormat,
  TableArtifact,
} from "@/lib/aiStream";

// Same lazy client-only load as MonthlySalesChart — ApexCharts touches
// `window` at import time.
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

const PAGE = 10;
// Column-header class copied from the report tables so AI tables read native.
const th =
  "py-3 px-4 sm:px-6 font-medium text-gray-500 text-sm dark:text-gray-400";

/**
 * Renders one structured result from the assistant — KPI tiles, a table, a
 * chart or a report link — using the exact same components and formatting the
 * reports section uses, so an AI answer is indistinguishable from a report.
 */
export default function AiArtifactView({ artifact }: { artifact: AiArtifact }) {
  switch (artifact.kind) {
    case "kpi":
      return <KpiBlock artifact={artifact} />;
    case "table":
      return <TableBlock artifact={artifact} />;
    case "chart":
      return <ChartBlock artifact={artifact} />;
    case "link":
      return <LinkBlock artifact={artifact} />;
    default:
      return null;
  }
}

// Shared value formatting: the artifact declares WHAT a number is, this
// decides how it reads. Money always goes through formatMoney (R: never
// hand-roll currency), percent keeps one decimal like the report tables.
function useValueFormat() {
  const { t } = useTranslations();
  const som = t("reportsPage.som");
  const units: CompactUnits = useMemo(
    () => ({
      thousand: t("products.statsThousand"),
      million: t("products.statsMillion"),
      billion: t("products.statsBillion"),
    }),
    [t],
  );

  const formatValue = (
    value: string | number | null | undefined,
    format?: NumberFormat,
  ): string => {
    if (value == null || value === "") return "—";
    if (typeof value !== "number") {
      return format === "date" ? formatDate(value) : String(value);
    }
    switch (format) {
      case "money":
        return formatMoney(value, som);
      case "percent":
        return `${(Math.round(value * 10) / 10).toFixed(1)}%`;
      case "date":
        return formatDate(String(value));
      case "text":
        return String(value);
      default:
        return formatNumber(value);
    }
  };

  return { som, units, formatValue };
}

// ── KPI tiles ───────────────────────────────────────────────────────────────

// 1–4 headline numbers as the same ReportKpi tiles the report KPI rows use;
// the grid width follows the item count so two KPIs don't strand half-empty.
const KPI_COLS: Record<number, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
};

function KpiBlock({ artifact }: { artifact: KpiArtifact }) {
  const { formatValue } = useValueFormat();
  const items = artifact.items.slice(0, 4);
  if (items.length === 0) return null;
  return (
    <div>
      {artifact.title && <ArtifactTitle>{artifact.title}</ArtifactTitle>}
      <div
        className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${KPI_COLS[items.length] ?? "lg:grid-cols-4"}`}
      >
        {items.map((item, i) => (
          <ReportKpi
            key={`${item.label}-${i}`}
            label={item.label}
            value={formatValue(item.value, item.format)}
            delta={item.delta}
            deltaInverse={item.invertDelta}
          />
        ))}
      </div>
    </div>
  );
}

function ArtifactTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mb-2 text-sm font-semibold text-gray-800 dark:text-white/90">
      {children}
    </h4>
  );
}

// ── Table ───────────────────────────────────────────────────────────────────

const isNumericFormat = (f?: NumberFormat) =>
  f === "money" || f === "number" || f === "percent";

function TableBlock({ artifact }: { artifact: TableArtifact }) {
  const { t } = useTranslations();
  const { formatValue } = useValueFormat();
  const [page, setPage] = useState(1);
  const { columns, rows } = artifact;
  if (columns.length === 0) return null;

  const paged = rows.slice((page - 1) * PAGE, page * PAGE);

  // Excel gets the raw-ish values: money/number stay numeric cells, percent is
  // rendered like the report exports ("12.3%"), everything else as shown.
  const handleExport = () => {
    const aoa: (string | number)[][] = [
      columns.map((c) => c.label),
      ...rows.map((row) =>
        columns.map((c) => {
          const v = row[c.key];
          if (v == null) return "";
          if (typeof v === "number") {
            if (c.format === "percent")
              return `${(Math.round(v * 10) / 10).toFixed(1)}%`;
            if (c.format === "money") return Math.round(v);
            return v;
          }
          return String(v);
        }),
      ),
    ];
    exportAoaToExcel("ai-result", aoa, "AI");
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
          {artifact.title ?? ""}
        </h4>
        <button
          onClick={handleExport}
          disabled={rows.length === 0}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-theme-xs font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
        >
          <RiFileExcel2Line className="h-4 w-4 text-success-600 dark:text-success-500" />
          {t("reportsPage.export")}
        </button>
      </div>

      <div className="-mx-4 w-auto overflow-x-auto tabular-nums sm:-mx-6">
        <Table className="w-full">
          <TableHeader className="border-y border-gray-100 dark:border-gray-800">
            <TableRow>
              {columns.map((c) => (
                <TableCell
                  key={c.key}
                  isHeader
                  className={`${th} ${isNumericFormat(c.format) ? "text-end" : "text-start"}`}
                >
                  {c.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  {t("reportsPage.noData")}
                </TableCell>
              </TableRow>
            ) : (
              paged.map((row, ri) => (
                <TableRow
                  key={ri}
                  className="hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                >
                  {columns.map((c, ci) => (
                    <TableCell
                      key={c.key}
                      className={`px-4 py-3 sm:px-6 ${
                        isNumericFormat(c.format)
                          ? "text-end text-gray-800 dark:text-white/90"
                          : ci === 0
                            ? "font-medium text-gray-800 dark:text-white/90"
                            : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {formatValue(row[c.key], c.format)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {rows.length > PAGE && (
        <ReportPager
          page={page}
          totalItems={rows.length}
          pageSize={PAGE}
          onPage={setPage}
        />
      )}
    </div>
  );
}

// ── Chart ───────────────────────────────────────────────────────────────────

// Options mirror MonthlySalesChart (the app's ApexCharts precedent): brand
// palette, Gilroy, no toolbar, compact axis labels, exact values in tooltip.
function ChartBlock({ artifact }: { artifact: ChartArtifact }) {
  const { som, units } = useValueFormat();
  const { chartType, categories, series, format } = artifact;
  const isLine = chartType === "line";

  const options: ApexOptions = useMemo(
    () => ({
      colors: ["#465fff", "#9cb9ff", "#667085"],
      chart: {
        fontFamily: "var(--font-gilroy), sans-serif",
        type: isLine ? "line" : "bar",
        height: 240,
        toolbar: { show: false },
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: "39%",
          borderRadius: 5,
          borderRadiusApplication: "end",
        },
      },
      dataLabels: { enabled: false },
      stroke: isLine
        ? { curve: "smooth", width: 2 }
        : { show: true, width: 4, colors: ["transparent"] },
      xaxis: {
        categories,
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      legend: {
        show: series.length > 1,
        labels: { colors: "#98a2b3" },
      },
      yaxis: {
        labels: {
          // Raw UZS on an axis is unreadable — compact form; the exact figure
          // lives in the tooltip (same rule as the dashboard chart).
          formatter: (val: number) =>
            format === "percent" ? `${val}%` : formatCompact(val, units),
        },
        title: { text: undefined },
      },
      grid: { yaxis: { lines: { show: true } } },
      fill: { opacity: 1 },
      tooltip: {
        x: { show: true },
        y: {
          formatter: (val: number) =>
            format === "money"
              ? formatMoney(val, som)
              : format === "percent"
                ? `${(Math.round(val * 10) / 10).toFixed(1)}%`
                : formatNumber(val),
        },
      },
    }),
    [isLine, categories, series.length, format, som, units],
  );

  if (categories.length === 0 || series.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pb-1 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      {artifact.title && (
        <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
          {artifact.title}
        </h4>
      )}
      <div className="custom-scrollbar max-w-full overflow-x-auto">
        <div className="-ml-4 min-w-[420px] pl-1">
          <ReactApexChart
            options={options}
            series={series}
            type={isLine ? "line" : "bar"}
            height={240}
          />
        </div>
      </div>
    </div>
  );
}

// ── Report link ─────────────────────────────────────────────────────────────

// Resolves the id against the reports catalogue: real path, translated name
// and the report's own icon. An id we don't know renders nothing rather than
// a dead link.
function LinkBlock({ artifact }: { artifact: LinkArtifact }) {
  const { t } = useTranslations();
  const meta = REPORTS.find((r) => r.id === artifact.reportId);
  if (!meta) return null;
  const qs = artifact.query
    ? `?${new URLSearchParams(artifact.query).toString()}`
    : "";
  const Icon = meta.icon;
  return (
    <Link
      href={`${meta.path}${qs}`}
      className="group inline-flex items-center gap-3 rounded-2xl border border-gray-200 bg-white py-3 pl-3 pr-4 transition hover:border-brand-300 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-500/40"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400">
        <Icon size={20} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-gray-800 dark:text-white/90">
          {artifact.label ?? t(meta.nameKey)}
        </span>
        <span className="block text-xs text-gray-500 dark:text-gray-400">
          {t("reportsPage.openReport")}
        </span>
      </span>
      <LuArrowRight
        size={16}
        className="shrink-0 text-brand-500 transition-transform duration-200 group-hover:translate-x-0.5"
      />
    </Link>
  );
}
