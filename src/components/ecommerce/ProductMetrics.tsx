"use client";
import React from "react";
import Badge from "../ui/badge/Badge";
import { ArrowUpIcon, BoxIconLine, DollarLineIcon } from "@/icons";
import { useTranslations } from "@/hooks/useTranslations";

export const ProductMetrics = () => {
  const { t } = useTranslations();
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6">
      {/* Total Products Metric */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <BoxIconLine className="text-gray-800 dark:text-white/90" />
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t('dashboardtotalProducts')}
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              1,245
            </h4>
          </div>
          <Badge color="success">
            <ArrowUpIcon />
            8.2%
          </Badge>
        </div>
      </div>

      {/* Total Quantity Metric */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <BoxIconLine className="text-gray-800 dark:text-white/90" />
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t('dashboardtotalQuantity')}
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              8,542
            </h4>
          </div>
          <Badge color="success">
            <ArrowUpIcon />
            5.3%
          </Badge>
        </div>
      </div>

      {/* Total Profit Metric */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <DollarLineIcon className="text-gray-800 dark:text-white/90" />
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t('dashboardtotalProfit')}
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              $125,430
            </h4>
          </div>
          <Badge color="success">
            <ArrowUpIcon />
            12.5%
          </Badge>
        </div>
      </div>
    </div>
  );
};
