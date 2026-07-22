"use client";
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "@/hooks/useTranslations";
import {
  getSalesReport,
  getDebtAgingReport,
  getReorderReport,
} from "@/lib/api";
import { toISODate, formatMoney, formatNumber, storeToday } from "@/lib/reportFormat";

// The four numbers a store owner opens the dashboard for: today's revenue and
// profit, products running low, and outstanding customer debt. Built entirely
// on existing report endpoints (reports/sales, reports/reorder, reports/debt-aging)
// — no new backend surface.
type State = {
  loading: boolean;
  error: boolean;
  revenue: number | null;
  profit: number | null;
  orders: number | null;
  lowStock: number | null;
  debtTotal: number | null;
  debtors: number | null;
};

const INITIAL: State = {
  loading: true,
  error: false,
  revenue: null,
  profit: null,
  orders: null,
  lowStock: null,
  debtTotal: null,
  debtors: null,
};

export default function TodayOverview() {
  const { t } = useTranslations();
  const [state, setState] = useState<State>(INITIAL);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: false }));
    const today = toISODate(storeToday());
    // Each block resolves independently; the card shows "—" for a failed one.
    const [sales, debt, reorder] = await Promise.allSettled([
      getSalesReport(today, today),
      getDebtAgingReport(),
      getReorderReport(),
    ]);
    const ok =
      sales.status === "fulfilled" ||
      debt.status === "fulfilled" ||
      reorder.status === "fulfilled";
    setState({
      loading: false,
      // Only flag a hard error when *nothing* loaded — that's a dead API, not
      // one flaky report.
      error: !ok,
      revenue: sales.status === "fulfilled" ? sales.value.totals.revenue : null,
      profit: sales.status === "fulfilled" ? sales.value.totals.profit : null,
      orders: sales.status === "fulfilled" ? sales.value.totals.orderCount : null,
      debtTotal: debt.status === "fulfilled" ? debt.value.totalOutstanding : null,
      debtors: debt.status === "fulfilled" ? debt.value.debtorCount : null,
      lowStock: reorder.status === "fulfilled" ? reorder.value.totals.products : null,
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const som = t("reportsPage.som") || "so'm";
  const money = (v: number | null) => (v == null ? "—" : formatMoney(v, som));
  const num = (v: number | null) => (v == null ? "—" : formatNumber(v));

  if (state.error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] sm:flex-row sm:justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("dashboard.loadError")}
        </p>
        <button
          type="button"
          onClick={load}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
        >
          {t("common.retry")}
        </button>
      </div>
    );
  }

  const cardClass =
    "rounded-2xl border border-gray-200 bg-white p-5 transition-colors dark:border-gray-800 dark:bg-white/[0.03] md:p-6";
  const linkCardClass = `${cardClass} block hover:border-brand-300 hover:bg-brand-50/40 dark:hover:border-brand-700 dark:hover:bg-brand-500/[0.06]`;

  const valueOrSkeleton = (content: React.ReactNode) =>
    state.loading ? (
      <span className="mt-2 block h-7 w-28 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
    ) : (
      <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
        {content}
      </h4>
    );

  const subOrSkeleton = (content: React.ReactNode) =>
    state.loading ? (
      <span className="mt-1.5 block h-4 w-20 animate-pulse rounded bg-gray-100 dark:bg-gray-800/60" />
    ) : (
      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{content}</p>
    );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-6">
      {/* Today's revenue (+ sales count) */}
      <div className={cardClass}>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {t("dashboard.todayRevenue")}
        </span>
        {valueOrSkeleton(money(state.revenue))}
        {subOrSkeleton(
          t("dashboard.salesCount").replace("{count}", num(state.orders)),
        )}
      </div>

      {/* Today's profit */}
      <div className={cardClass}>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {t("dashboard.todayProfit")}
        </span>
        {valueOrSkeleton(
          <span
            className={
              (state.profit ?? 0) < 0
                ? "text-error-600 dark:text-error-400"
                : undefined
            }
          >
            {money(state.profit)}
          </span>,
        )}
        {subOrSkeleton(<>&nbsp;</>)}
      </div>

      {/* Low stock → inventory */}
      <Link href="/inventory" className={linkCardClass}>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {t("dashboard.lowStockTitle")}
        </span>
        {valueOrSkeleton(
          <span
            className={
              (state.lowStock ?? 0) > 0
                ? "text-warning-600 dark:text-warning-400"
                : undefined
            }
          >
            {num(state.lowStock)}
          </span>,
        )}
        {subOrSkeleton(
          (state.lowStock ?? 0) > 0 ? t("dashboard.lowStockHint") : <>&nbsp;</>,
        )}
      </Link>

      {/* Outstanding debt → user-debt */}
      <Link href="/user-debt" className={linkCardClass}>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {t("dashboard.debtTitle")}
        </span>
        {valueOrSkeleton(money(state.debtTotal))}
        {subOrSkeleton(
          t("dashboard.debtors").replace("{count}", num(state.debtors)),
        )}
      </Link>
    </div>
  );
}
