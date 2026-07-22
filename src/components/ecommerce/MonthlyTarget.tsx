"use client";
// import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "@/hooks/useTranslations";
import { getTargetProgress } from "@/lib/api";
// Dynamically import the ReactApexChart component
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

export default function MonthlyTarget() {
  const { t } = useTranslations();

  // Real data: this month's revenue vs the monthly target (R31 Reja/fakt).
  const [actual, setActual] = useState(0);
  const [target, setTarget] = useState(0);
  const [achievedPct, setAchievedPct] = useState(0);
  const [onTrack, setOnTrack] = useState(true);

  useEffect(() => {
    let active = true;
    getTargetProgress()
      .then((d) => {
        if (!active) return;
        setActual(d.actual);
        setTarget(d.revenueTarget);
        setAchievedPct(d.achievedPct);
        setOnTrack(d.onTrack);
      })
      .catch(() => {
        /* leave at zero on failure */
      });
    return () => {
      active = false;
    };
  }, []);

  // Gauge shows achievement of the monthly target, clamped to a 0–100 range.
  const progress = Math.max(0, Math.min(100, Math.round(achievedPct)));
  const series = [progress];
  // Memoized so its identity is stable: react-apexcharts only calls updateSeries
  // (which the radialBar gauge actually reflects) when `options` doesn't change.
  const options: ApexOptions = useMemo<ApexOptions>(() => ({
    colors: ["#465FFF"],
    chart: {
      fontFamily: "var(--font-gilroy), sans-serif",
      type: "radialBar",
      height: 200,
      sparkline: {
        enabled: true,
      },
    },
    plotOptions: {
      radialBar: {
        startAngle: -85,
        endAngle: 85,
        hollow: {
          size: "80%",
        },
        track: {
          background: "#E4E7EC",
          strokeWidth: "100%",
          margin: 5, // margin is in pixels
        },
        dataLabels: {
          name: {
            show: false,
          },
          value: {
            fontSize: "28px",
            fontWeight: "600",
            offsetY: -30,
            color: "#1D2939",
            formatter: function (val) {
              return val + "%";
            },
          },
        },
      },
    },
    fill: {
      type: "solid",
      colors: ["#465FFF"],
    },
    stroke: {
      lineCap: "round",
    },
    labels: ["Progress"],
  }), []);

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="px-5 pt-5 bg-white shadow-default rounded-2xl pb-6 dark:bg-gray-900 sm:px-6 sm:pt-6">
        <div className="flex justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {t('dashboard.monthlyTarget')}
            </h3>
            <p className="mt-1 font-normal text-gray-500 text-theme-sm dark:text-gray-400">
              {t('dashboard.targetDescription')}
            </p>
          </div>
          {/* Shortcut to the Reja/fakt report, where the target is set. */}
          <Link
            href="/reports/target"
            className="text-sm font-medium text-brand-500 hover:text-brand-600"
          >
            {t('reportsPage.openReport')}
          </Link>
        </div>
        <div className="relative ">
          <div className="max-h-[200px]">
            <ReactApexChart
              key={progress}
              options={options}
              series={series}
              type="radialBar"
              height={235}
            />
          </div>

          <span
            className={`absolute left-1/2 top-full -translate-x-1/2 -translate-y-[90%] rounded-full px-3 py-1 text-xs font-medium ${
              target <= 0
                ? "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400"
                : onTrack
                  ? "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500"
                  : "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500"
            }`}
          >
            {target > 0 ? `${Math.round(achievedPct)}%` : "—"}
          </span>
        </div>
        <p className="mx-auto mt-4 w-full max-w-[380px] text-center text-sm text-gray-500">
          {t('reportsPage.fact')}:{" "}
          {new Intl.NumberFormat('uz-UZ').format(Math.round(actual))} {t('reportsPage.som')}
          {target > 0 && (
            <>
              {" · "}
              {t('reportsPage.plan')}:{" "}
              {new Intl.NumberFormat('uz-UZ').format(Math.round(target))} {t('reportsPage.som')}
            </>
          )}
        </p>
      </div>

    </div>
  );
}
