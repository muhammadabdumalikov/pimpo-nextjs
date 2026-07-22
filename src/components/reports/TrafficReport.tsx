"use client";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "@/hooks/useTranslations";
import SelectField from "../form/SelectField";
import ReportShell, { ReportKpi, ReportFilterField } from "./ReportShell";
import ReportDateRange from "./ReportDateRange";
import ReportBranchFilter from "./ReportBranchFilter";
import ReportCompareToggle from "./ReportCompareToggle";
import { getTrafficReport, type TrafficReport as TrafficData } from "@/lib/api";
import { currentMonthRange, formatMoney, formatNumber, rangeLabel, toISODate } from "@/lib/reportFormat";
import { useReportComparison } from "@/hooks/useReportComparison";
import { deltaPct, type CompareMode } from "@/lib/reportCompare";
import { exportAoaToExcel } from "@/lib/exportExcel";

type Metric = "orders" | "revenue";

// Rows are shown Monday-first; the API's dow is Postgres EXTRACT(DOW) where
// 0 = Sunday. This is the display order into that numbering.
const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DOW_KEYS = ["dowSun", "dowMon", "dowTue", "dowWed", "dowThu", "dowFri", "dowSat"];

// Compact money for tight heatmap cells: 1.2M / 850k / 500.
const compact = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return `${Math.round(n)}`;
};

export default function TrafficReport() {
  const { t } = useTranslations();
  const [range, setRange] = useState<[Date | null, Date | null]>(currentMonthRange());
  const [branchId, setBranchId] = useState("");
  const [metric, setMetric] = useState<Metric>("orders");
  const [data, setData] = useState<TrafficData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [compare, setCompare] = useState<CompareMode>("off");
  const som = t("reportsPage.som");

  const { prev } = useReportComparison(compare, range, [branchId], (f, tt) =>
    getTrafficReport(f, tt, branchId || undefined),
  );
  const delta = (k: keyof TrafficData["totals"]) =>
    prev && data ? deltaPct(data.totals[k], prev.totals[k]) : undefined;

  useEffect(() => {
    let active = true;
    const [from, to] = range;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const d = await getTrafficReport(
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

  const grid = useMemo(() => {
    const cells = data?.cells ?? [];
    // key "dow-hour" → { orders, revenue }
    const map = new Map(cells.map((c) => [`${c.dow}-${c.hour}`, c]));
    // Only render the hour span that actually has traffic (fallback 8–22).
    const hoursWith = cells.map((c) => c.hour);
    const minH = hoursWith.length ? Math.min(...hoursWith) : 8;
    const maxH = hoursWith.length ? Math.max(...hoursWith) : 22;
    const hours = Array.from({ length: maxH - minH + 1 }, (_, i) => minH + i);
    const max = cells.reduce((m, c) => Math.max(m, c[metric]), 0);

    // Busiest cell + busiest day, for the KPIs.
    let peak = { dow: -1, hour: -1, value: 0 };
    const dayTotals = new Map<number, number>();
    for (const c of cells) {
      if (c[metric] > peak.value) peak = { dow: c.dow, hour: c.hour, value: c[metric] };
      dayTotals.set(c.dow, (dayTotals.get(c.dow) ?? 0) + c[metric]);
    }
    let peakDow = -1;
    let peakDowVal = 0;
    dayTotals.forEach((v, k) => { if (v > peakDowVal) { peakDowVal = v; peakDow = k; } });

    return { map, hours, max, peak, peakDow };
  }, [data, metric]);

  const cellStyle = (value: number): React.CSSProperties => {
    if (!value || grid.max <= 0) return {};
    // brand-500 (#465fff) wash, intensity by share of the max.
    const alpha = 0.08 + 0.82 * (value / grid.max);
    return { backgroundColor: `rgba(70, 95, 255, ${alpha})`, color: alpha > 0.55 ? "#fff" : undefined };
  };

  const cellText = (value: number) =>
    metric === "revenue" ? compact(value) : formatNumber(value);

  const handleExport = () => {
    if (!data) return;
    const header = [t("reportsPage.dayHour"), ...grid.hours.map((h) => `${h}:00`)];
    const rows = DOW_ORDER.map((dow) => [
      t(`reportsPage.${DOW_KEYS[dow]}`),
      ...grid.hours.map((h) => {
        const c = grid.map.get(`${dow}-${h}`);
        return c ? Math.round(c[metric]) : 0;
      }),
    ]);
    exportAoaToExcel("traffic-report", [header, ...rows], "Traffic");
  };

  const totals = data?.totals;
  const peakLabel =
    grid.peak.dow >= 0
      ? `${t(`reportsPage.${DOW_KEYS[grid.peak.dow]}`)}, ${grid.peak.hour}:00`
      : "—";
  const kpis = totals ? (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <ReportKpi label={t("reportsPage.orders")} value={formatNumber(totals.orders)} delta={delta("orders")} />
      <ReportKpi label={t("reportsPage.revenue")} value={formatMoney(totals.revenue, som)} tone="success" delta={delta("revenue")} />
      <ReportKpi label={t("reportsPage.peakTime")} value={peakLabel} />
      <ReportKpi label={t("reportsPage.peakDay")} value={grid.peakDow >= 0 ? t(`reportsPage.${DOW_KEYS[grid.peakDow]}`) : "—"} />
    </div>
  ) : null;

  return (
    <ReportShell
      title={t("sidebar.reportsTraffic")}
      filterSummary={rangeLabel(range)}
      activeFilterCount={(branchId ? 1 : 0) + (metric !== "orders" ? 1 : 0) + (compare !== "off" ? 1 : 0)}
      filters={
        <>
          <ReportFilterField label={t("reportsPage.period")}>
            <ReportDateRange value={range} onChange={setRange} />
          </ReportFilterField>
          <ReportCompareToggle value={compare} onChange={setCompare} />
          <ReportFilterField label={t("reportsPage.metric")}>
            <SelectField
              className="min-w-[160px]"
              value={metric}
              onChange={(v) => setMetric(v as Metric)}
              options={[
                { value: "orders", label: t("reportsPage.orders") },
                { value: "revenue", label: t("reportsPage.revenue") },
              ]}
            />
          </ReportFilterField>
          <ReportBranchFilter value={branchId} onChange={setBranchId} />
        </>
      }
      kpis={kpis}
      onExport={handleExport}
      exportDisabled={!data || loading || (data?.cells.length ?? 0) === 0}
    >
      {loading ? (
        <div className="py-10 text-center text-gray-500 dark:text-gray-400">{t("reportsPage.loading")}</div>
      ) : error ? (
        <div className="py-10 text-center text-error-500">{error}</div>
      ) : (data?.cells.length ?? 0) === 0 ? (
        <div className="py-10 text-center text-gray-500 dark:text-gray-400">{t("reportsPage.noData")}</div>
      ) : (
        <div className="w-full overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
          <div className="min-w-max">
            {/* Hour header */}
            <div className="flex">
              <div className="w-12 shrink-0" />
              {grid.hours.map((h) => (
                <div key={h} className="w-10 shrink-0 pb-2 text-center text-[11px] tabular-nums text-gray-400 dark:text-gray-500">
                  {h}
                </div>
              ))}
            </div>
            {/* Day rows */}
            {DOW_ORDER.map((dow) => (
              <div key={dow} className="flex items-center">
                <div className="w-12 shrink-0 pr-2 text-end text-xs font-medium text-gray-500 dark:text-gray-400">
                  {t(`reportsPage.${DOW_KEYS[dow]}`)}
                </div>
                {grid.hours.map((h) => {
                  const c = grid.map.get(`${dow}-${h}`);
                  const value = c ? c[metric] : 0;
                  return (
                    <div key={h} className="p-0.5">
                      <div
                        title={c ? `${t(`reportsPage.${DOW_KEYS[dow]}`)} ${h}:00 — ${formatNumber(c.orders)} ${t("reportsPage.orders").toLowerCase()}, ${formatMoney(c.revenue, som)}` : undefined}
                        className="flex h-9 w-9 items-center justify-center rounded-md text-[11px] tabular-nums text-gray-600 dark:text-gray-300"
                        style={cellStyle(value)}
                      >
                        {value ? cellText(value) : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </ReportShell>
  );
}
