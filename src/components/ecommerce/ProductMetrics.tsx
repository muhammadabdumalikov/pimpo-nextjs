"use client";
import React, { useEffect, useState } from "react";
import { BoxIconLine, DollarLineIcon } from "@/icons";
import { useTranslations } from "@/hooks/useTranslations";
import { getProductCount, getOrderCount, getOrderRevenue } from "@/lib/api";

type Metrics = {
  products: number | null;
  orders: number | null;
  revenue: number | null;
};

export const ProductMetrics = () => {
  const { t } = useTranslations();
  const [metrics, setMetrics] = useState<Metrics>({
    products: null,
    orders: null,
    revenue: null,
  });

  useEffect(() => {
    let active = true;
    (async () => {
      // Each metric resolves independently; a failure leaves that card at "—".
      const [products, orders, revenue] = await Promise.all([
        getProductCount().catch(() => null),
        getOrderCount().catch(() => null),
        getOrderRevenue().catch(() => null),
      ]);
      if (active) setMetrics({ products, orders, revenue });
    })();
    return () => {
      active = false;
    };
  }, []);

  const formatNumber = (value: number | null) =>
    value === null ? "—" : new Intl.NumberFormat("uz-UZ").format(value);

  const formatRevenue = (value: number | null) =>
    value === null
      ? "—"
      : `${new Intl.NumberFormat("uz-UZ").format(Math.round(value))} so'm`;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6">
      {/* Total Products */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <BoxIconLine className="text-gray-800 dark:text-white/90" />
        </div>
        <div className="mt-5">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t("dashboard.totalProducts")}
          </span>
          <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
            {formatNumber(metrics.products)}
          </h4>
        </div>
      </div>

      {/* Total Orders */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <BoxIconLine className="text-gray-800 dark:text-white/90" />
        </div>
        <div className="mt-5">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t("dashboard.totalOrders")}
          </span>
          <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
            {formatNumber(metrics.orders)}
          </h4>
        </div>
      </div>

      {/* Revenue */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <DollarLineIcon className="text-gray-800 dark:text-white/90" />
        </div>
        <div className="mt-5">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t("dashboard.revenue")}
          </span>
          <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
            {formatRevenue(metrics.revenue)}
          </h4>
        </div>
      </div>
    </div>
  );
};
