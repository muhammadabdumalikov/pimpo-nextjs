"use client";
import React, { useEffect, useState } from "react";
import { useTranslations } from "@/hooks/useTranslations";
import { formatCompact } from "@/lib/reportFormat";
import type { ProductStats, StockStatusFilter } from "@/lib/api";

// Collapsed-state preference survives reloads (mirrors BiLLZ's
// "Statistikani yashirish", but stored per browser).
const STORAGE_KEY = "kpos-products-stats-hidden";

const nf = new Intl.NumberFormat("uz-UZ");
// Units on hand can be fractional (weighed goods) — show at most 1 decimal.
const nfUnits = new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 1 });

interface CatalogStatsProps {
  stats: ProductStats | null;
  /** Currently active stock-bucket filter ("" = none). */
  activeStock: StockStatusFilter | "";
  /** Toggle a stock bucket on/off (clicking the active chip clears it). */
  onToggleStock: (s: StockStatusFilter) => void;
}

/**
 * Catalog pulse panel — one composed band instead of four identical stat
 * boxes. Three zones: catalogue size (hero), the value rail
 * (supply → retail → expected profit) and a stock-health bar whose
 * in/low/out chips double as table filters.
 */
export default function CatalogStats({
  stats,
  activeStock,
  onToggleStock,
}: CatalogStatsProps) {
  const { t } = useTranslations();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  };

  // The API sums can arrive as strings (numeric driver) or, if a field is
  // missing, undefined — either would poison the money math into "NaN". Coerce
  // every value to a finite number before it's used or rendered.
  const num = (v: unknown): number => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const supplyValue = num(stats?.supplyValue);
  const retailValue = num(stats?.retailValue);
  const units = num(stats?.units);

  // Money values in the band are compact ("2.1 mlrd so'm"); the exact grouped
  // sum lives in the title tooltip.
  const compactSum = (v: number): string =>
    formatCompact(v, {
      thousand: t("products.statsThousand"),
      million: t("products.statsMillion"),
      billion: t("products.statsBillion"),
    });
  const fullSum = (v: number) => `${nf.format(Math.round(v))} so'm`;

  const profit = retailValue - supplyValue;
  const profitPct =
    supplyValue > 0 ? Math.round((profit / supplyValue) * 100) : null;
  // Rail: the supply share of the retail value in gray, the margin in green.
  // A negative margin (selling below cost) collapses the green segment and
  // recolors the delta line as a warning.
  const supplyShare =
    retailValue > 0
      ? Math.min(100, (supplyValue / retailValue) * 100)
      : 100;

  // Health bar segments; non-empty buckets keep a minimum sliver so a handful
  // of "out" products stays visible next to thousands in stock.
  const healthSegments = (() => {
    if (!stats || stats.total === 0) return [];
    const raw = [
      { key: "in" as const, count: stats.inStock, cls: "bg-success-500" },
      { key: "low" as const, count: stats.lowStock, cls: "bg-warning-500" },
      { key: "out" as const, count: stats.outOfStock, cls: "bg-error-500" },
    ].filter((s) => s.count > 0);
    const total = raw.reduce((acc, s) => acc + s.count, 0);
    return raw.map((s) => ({
      ...s,
      pct: Math.max(2, (s.count / total) * 100),
    }));
  })();

  // Legend rows double as the stock filter — ledger style (label left, count
  // right), so three buckets never wrap the way pill-chips did.
  const buckets: {
    key: StockStatusFilter;
    label: string;
    count: number | undefined;
    dot: string;
    active: string;
  }[] = [
    {
      key: "in",
      label: t("products.statsInStock"),
      count: stats?.inStock,
      dot: "bg-success-500",
      active:
        "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400",
    },
    {
      key: "low",
      label: t("products.statsLowStock"),
      count: stats?.lowStock,
      dot: "bg-warning-500",
      active:
        "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400",
    },
    {
      key: "out",
      label: t("products.statsOutOfStock"),
      count: stats?.outOfStock,
      dot: "bg-error-500",
      active:
        "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400",
    },
  ];

  const label = (text: string) => (
    <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500">
      {text}
    </p>
  );

  return (
    <div className="mb-4">
      <div className="mb-1.5 flex justify-end">
        <button
          type="button"
          onClick={toggleCollapsed}
          className="inline-flex items-center gap-1 text-theme-sm font-medium text-brand-500 hover:text-brand-600 dark:hover:text-brand-400"
        >
          <svg
            className={`h-4 w-4 transition-transform duration-200 ${collapsed ? "" : "rotate-180"}`}
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 8l5 5 5-5" />
          </svg>
          {collapsed ? t("products.showStats") : t("products.hideStats")}
        </button>
      </div>

      {!collapsed && (
        <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-white/[0.05] dark:bg-white/[0.03] sm:p-5 lg:grid-cols-12 lg:gap-0 lg:divide-x lg:divide-gray-200/70 dark:lg:divide-white/[0.06]">
          {/* Zone 1 — catalogue size */}
          <div className="lg:col-span-3 lg:pr-6">
            {label(t("products.statsCatalog"))}
            {stats ? (
              <>
                <p className="mt-2 text-2xl font-bold tabular-nums text-gray-800 dark:text-white/90">
                  {nf.format(stats.total)}{" "}
                  <span className="text-sm font-medium text-gray-400 dark:text-gray-500">
                    {t("products.statsNames")}
                  </span>
                </p>
                <p
                  className="mt-1 text-sm tabular-nums text-gray-500 dark:text-gray-400"
                  title={`${nfUnits.format(units)} ${t("products.statsUnitsSuffix")}`}
                >
                  {nf.format(Math.round(units))} {t("products.statsUnitsSuffix")}
                </p>
              </>
            ) : (
              <div className="mt-2 space-y-2">
                <div className="h-8 w-28 animate-pulse rounded-md bg-gray-200 dark:bg-white/[0.06]" />
                <div className="h-4 w-36 animate-pulse rounded-md bg-gray-200 dark:bg-white/[0.06]" />
              </div>
            )}
          </div>

          {/* Zone 2 — value rail: supply → retail → expected profit */}
          <div className="lg:col-span-5 lg:px-6">
            {label(t("products.statsValue"))}
            {stats ? (
              <>
                {/* Money grows left → right; the type size follows it, so the
                    retail figure (the bigger story) leads. */}
                <div className="mt-2 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {t("products.statsSupply")}
                    </p>
                    <p
                      className="text-base font-medium tabular-nums text-gray-600 dark:text-gray-300"
                      title={fullSum(supplyValue)}
                    >
                      {compactSum(supplyValue)}{" "}
                      <span className="text-xs font-normal text-gray-400">
                        so'm
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {t("products.statsRetail")}
                    </p>
                    <p
                      className="text-xl font-semibold tabular-nums text-gray-800 dark:text-white/90"
                      title={fullSum(retailValue)}
                    >
                      {compactSum(retailValue)}{" "}
                      <span className="text-xs font-normal text-gray-400">
                        so'm
                      </span>
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex h-1.5 gap-px overflow-hidden rounded-full bg-gray-200 dark:bg-white/[0.08]">
                  <div
                    className="rounded-full bg-gray-300 dark:bg-gray-600"
                    style={{ width: `${supplyShare}%` }}
                  />
                  {profit > 0 && (
                    <div
                      className="rounded-full bg-success-500"
                      style={{ width: `${100 - supplyShare}%` }}
                    />
                  )}
                </div>
                {/* The delta sits under the green (margin) end of the rail, so
                    label, color and geometry point at the same thing. */}
                <p
                  className={`mt-1.5 text-right text-xs font-medium tabular-nums ${
                    profit >= 0
                      ? "text-success-600 dark:text-success-500"
                      : "text-warning-600 dark:text-warning-500"
                  }`}
                  title={fullSum(Math.abs(profit))}
                >
                  {profit >= 0 ? "+" : "−"}
                  {compactSum(Math.abs(profit))} so'm{" "}
                  {t("products.statsProfit")}
                  {profitPct !== null && (
                    <span className="ml-1 opacity-80">
                      · {profit >= 0 ? "+" : "−"}
                      {Math.abs(profitPct)}%
                    </span>
                  )}
                </p>
              </>
            ) : (
              <div className="mt-2 space-y-2">
                <div className="h-6 w-full animate-pulse rounded-md bg-gray-200 dark:bg-white/[0.06]" />
                <div className="h-1.5 w-full animate-pulse rounded-full bg-gray-200 dark:bg-white/[0.06]" />
                <div className="h-4 w-40 animate-pulse rounded-md bg-gray-200 dark:bg-white/[0.06]" />
              </div>
            )}
          </div>

          {/* Zone 3 — stock health; chips filter the table */}
          <div className="lg:col-span-4 lg:pl-6">
            {label(t("products.statsHealth"))}
            {stats ? (
              <>
                <div className="mt-2 flex h-1.5 gap-px overflow-hidden rounded-full bg-gray-200 dark:bg-white/[0.08]">
                  {healthSegments.map((s) => (
                    <div
                      key={s.key}
                      className={s.cls}
                      style={{ width: `${s.pct}%` }}
                    />
                  ))}
                </div>
                <div className="mt-2 -mx-1.5 space-y-0.5">
                  {buckets.map((b) => {
                    const isActive = activeStock === b.key;
                    return (
                      <button
                        key={b.key}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => onToggleStock(b.key)}
                        className={`flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-theme-sm transition-colors ${
                          isActive
                            ? b.active
                            : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.04]"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${b.dot}`}
                        />
                        {b.label}
                        <span
                          className={`ml-auto tabular-nums font-medium ${
                            isActive
                              ? ""
                              : "text-gray-800 dark:text-white/90"
                          }`}
                        >
                          {b.count != null ? nf.format(b.count) : "—"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="mt-2 space-y-2">
                <div className="h-1.5 w-full animate-pulse rounded-full bg-gray-200 dark:bg-white/[0.06]" />
                <div className="h-5 w-full animate-pulse rounded-md bg-gray-200 dark:bg-white/[0.06]" />
                <div className="h-5 w-4/5 animate-pulse rounded-md bg-gray-200 dark:bg-white/[0.06]" />
                <div className="h-5 w-3/5 animate-pulse rounded-md bg-gray-200 dark:bg-white/[0.06]" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
