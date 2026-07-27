"use client";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LuChartColumnBig, LuArrowRight, LuTrendingUp, LuTrendingDown } from "react-icons/lu";
import { useTranslations } from "@/hooks/useTranslations";
import { getMonthlySales } from "@/lib/api";
import {
  formatCompact,
  formatMoney,
  monthNames,
  type CompactUnits,
} from "@/lib/reportFormat";

// Dynamically import the ReactApexChart component
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

export default function MonthlySalesChart() {
  const { t, locale } = useTranslations();

  const som = t("reportsPage.som") || "so'm";
  // Short-scale units come from the catalogue so the axis reads natively in
  // every locale ("mln" / "млн" / "mln").
  const units: CompactUnits = useMemo(
    () => ({
      thousand: t("products.statsThousand"),
      million: t("products.statsMillion"),
      billion: t("products.statsBillion"),
    }),
    [t],
  );

  const [monthly, setMonthly] = useState<number[]>(new Array(12).fill(0));

  useEffect(() => {
    let active = true;
    getMonthlySales()
      .then((data) => {
        if (active && data.length === 12) setMonthly(data);
      })
      .catch(() => {
        /* leave the chart at zeros on failure */
      });
    return () => {
      active = false;
    };
  }, []);

  // Year-to-date total, plus this month against the previous one — the two
  // readings the axis alone can't give at a glance.
  const { total, deltaPct } = useMemo(() => {
    const sum = monthly.reduce((s, n) => s + n, 0);
    // "Current" is the last month that actually has sales, so a half-finished
    // year doesn't compare against a run of trailing zeros.
    const lastIdx = monthly.reduce((last, v, i) => (v > 0 ? i : last), -1);
    if (lastIdx < 1) return { total: sum, deltaPct: null as number | null };
    const prev = monthly[lastIdx - 1];
    const curr = monthly[lastIdx];
    return {
      total: sum,
      deltaPct: prev > 0 ? Math.round(((curr - prev) / prev) * 100) : null,
    };
  }, [monthly]);

  const options: ApexOptions = useMemo(
    () => ({
      colors: ["#465fff"],
      chart: {
        fontFamily: "var(--font-gilroy), sans-serif",
        type: "bar",
        height: 200,
        toolbar: {
          show: false,
        },
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: "39%",
          borderRadius: 5,
          borderRadiusApplication: "end",
        },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        show: true,
        width: 4,
        colors: ["transparent"],
      },
      xaxis: {
        categories: monthNames(locale),
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
      },
      legend: {
        show: false,
      },
      yaxis: {
        labels: {
          // Raw UZS on an axis ("12000000") is unreadable and pushes the plot
          // area over; the exact figure lives in the tooltip.
          formatter: (val: number) => formatCompact(val, units),
        },
        title: {
          text: undefined,
        },
      },
      grid: {
        yaxis: {
          lines: {
            show: true,
          },
        },
      },
      fill: {
        opacity: 1,
      },
      tooltip: {
        x: {
          show: true,
        },
        y: {
          formatter: (val: number) => formatMoney(val, som),
        },
      },
    }),
    [locale, units, som],
  );

  const series = [
    {
      name: t("dashboard.monthlySales"),
      data: monthly,
    },
  ];

  const rising = (deltaPct ?? 0) >= 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400">
            <LuChartColumnBig size={20} />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {t("dashboard.monthlySales")}
            </h3>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-theme-sm font-medium tabular-nums text-gray-700 dark:text-gray-300">
                {formatMoney(total, som)}
              </span>
              {deltaPct !== null && (
                <span
                  className={`inline-flex items-center gap-0.5 text-theme-xs font-medium tabular-nums ${
                    rising
                      ? "text-success-600 dark:text-success-400"
                      : "text-error-500"
                  }`}
                >
                  {rising ? (
                    <LuTrendingUp size={13} />
                  ) : (
                    <LuTrendingDown size={13} />
                  )}
                  {rising ? "+" : ""}
                  {deltaPct}%
                </span>
              )}
            </div>
          </div>
        </div>

        <Link
          href="/reports/sales"
          className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand-500 hover:text-brand-600"
        >
          {t("reportsPage.openReport")}
          <LuArrowRight
            size={15}
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </Link>
      </div>

      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="-ml-5 min-w-[650px] xl:min-w-full pl-2">
          <ReactApexChart
            options={options}
            series={series}
            type="bar"
            height={200}
          />
        </div>
      </div>
    </div>
  );
}
