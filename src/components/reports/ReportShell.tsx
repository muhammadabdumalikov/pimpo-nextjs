"use client";
import { ReactNode, useState } from "react";
import { RiFileExcel2Line } from "react-icons/ri";
import { LuListFilter } from "react-icons/lu";
import { useTranslations } from "@/hooks/useTranslations";

// Common chrome for every report: title + active-filter summary, a Filter
// toggle that reveals the report's applicable filters, an Excel export button,
// an optional KPI row, and the body.
export default function ReportShell({
  title,
  filters,
  filterSummary,
  activeFilterCount = 0,
  search,
  kpis,
  onExport,
  exportDisabled,
  children,
}: {
  title: string;
  /** The report's filter fields, revealed inside the collapsible panel. */
  filters?: ReactNode;
  /** Short read-only summary of the applied filters (e.g. the date range). */
  filterSummary?: ReactNode;
  /** How many non-default filters are active — shown as a badge on the button. */
  activeFilterCount?: number;
  /** Optional always-visible search input; the Filter button sits beside it. */
  search?: ReactNode;
  kpis?: ReactNode;
  onExport?: () => void;
  exportDisabled?: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslations();
  const [open, setOpen] = useState(false);
  // Overflow stays clipped while the panel animates open (so the reveal is
  // smooth); it flips to visible only once the transition ends, so select
  // dropdowns can escape the panel. Closing clips immediately.
  const [expanded, setExpanded] = useState(false);

  const toggleFilters = () => {
    // Reset overflow to clipped on every toggle; onTransitionEnd re-enables
    // overflow-visible once the open animation completes.
    setExpanded(false);
    setOpen((v) => !v);
  };

  const filterButton = filters ? (
    <button
      onClick={toggleFilters}
      aria-expanded={open}
      className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-4 py-2.5 text-theme-sm font-medium shadow-theme-xs transition-colors ${
        open
          ? "border-gray-300 bg-gray-100 text-gray-800 dark:border-gray-600 dark:bg-white/[0.08] dark:text-white/90"
          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
      }`}
    >
      <LuListFilter className="h-4.5 w-4.5" />
      {t("reportsPage.filter")}
      {activeFilterCount > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-700 px-1 text-xs font-medium tabular-nums text-white dark:bg-white/20">
          {activeFilterCount}
        </span>
      )}
    </button>
  ) : null;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
        {/* Header row */}
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {title}
            </h3>
            {filterSummary && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {filterSummary}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Without a search input the Filter button lives in the header. */}
            {!search && filterButton}
            {onExport && (
              <button
                onClick={onExport}
                disabled={exportDisabled}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
              >
                <RiFileExcel2Line className="h-5 w-5 text-success-600 dark:text-success-500" />
                {t("reportsPage.export")}
              </button>
            )}
          </div>
        </div>

        {/* Search row — search stays visible, Filter button opens the rest. */}
        {search && (
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1">{search}</div>
            {filterButton}
          </div>
        )}

        {/* Collapsible filter panel (smooth height via the grid-rows trick).
            overflow-hidden collapses it when closed; when open we switch to
            overflow-visible so select dropdowns aren't clipped by the panel. */}
        {filters && (
          <div
            onTransitionEnd={() => {
              if (open) setExpanded(true);
            }}
            className={`grid transition-all duration-200 ease-out ${
              open ? "mb-5 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className={open && expanded ? "overflow-visible" : "overflow-hidden"}>
              <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
                <div className="flex flex-wrap items-end gap-4">{filters}</div>
              </div>
            </div>
          </div>
        )}

        {kpis && <div className="mb-5">{kpis}</div>}

        {children}
      </div>
    </div>
  );
}

// Label-above-control wrapper for a single filter field inside the panel.
export function ReportFilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
        {label}
      </label>
      {children}
    </div>
  );
}

// Δ% badge vs the comparison period. `pct === null` means "was zero, now not" —
// an infinite jump we label "new" instead of a number. `inverse` flips the good
// direction for cost-like metrics (discounts, shortages, cancellations) where a
// drop is the win.
export function DeltaBadge({
  pct,
  inverse = false,
}: {
  pct: number | null;
  inverse?: boolean;
}) {
  const { t } = useTranslations();
  if (pct === null) {
    return (
      <span className="text-xs font-medium text-brand-500">{t("reportsPage.new")}</span>
    );
  }
  const rounded = Math.round(pct * 10) / 10;
  if (rounded === 0) {
    return <span className="text-xs font-medium text-gray-400">0%</span>;
  }
  const up = rounded > 0;
  const good = inverse ? !up : up;
  return (
    <span
      title={t("reportsPage.vsComparison")}
      className={`inline-flex items-center gap-0.5 text-xs font-medium tabular-nums ${
        good ? "text-success-600 dark:text-success-500" : "text-error-500"
      }`}
    >
      {up ? "↑" : "↓"} {Math.abs(rounded).toFixed(1)}%
    </span>
  );
}

// A small KPI stat card used in the KPI row of several reports. Hierarchy is
// carried by weight + color, per the dashboard craft rules: the label is a
// demoted tracked caption, the figure is the tabular-nums hero. When a `delta`
// is supplied a Δ% badge sits under the figure (period-over-period, R29).
export function ReportKpi({
  label,
  value,
  tone = "default",
  delta,
  deltaInverse = false,
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "error";
  /** Δ% vs comparison period. undefined = no comparison; null = "new". */
  delta?: number | null;
  /** True for cost-like metrics where a decrease is the good direction. */
  deltaInverse?: boolean;
}) {
  const toneClass =
    tone === "success"
      ? "text-success-600 dark:text-success-500"
      : tone === "error"
        ? "text-error-500"
        : "text-gray-800 dark:text-white/90";
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {label}
      </p>
      <div className="mt-1.5 flex items-baseline gap-2">
        <p className={`text-xl font-semibold tabular-nums ${toneClass}`}>
          {value}
        </p>
        {delta !== undefined && <DeltaBadge pct={delta} inverse={deltaInverse} />}
      </div>
    </div>
  );
}
