"use client";
// import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";

import dynamic from "next/dynamic";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { MoreDotIcon } from "@/icons";
import { useEffect, useState } from "react";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { useTranslations } from "@/hooks/useTranslations";
import { getMonthlySales } from "@/lib/api";
// Dynamically import the ReactApexChart component
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

export default function MonthlyTarget() {
  const { t } = useTranslations();

  // Real data: this month's revenue vs last month's, from completed orders.
  const [thisMonth, setThisMonth] = useState(0);
  const [growth, setGrowth] = useState(0);

  useEffect(() => {
    let active = true;
    getMonthlySales()
      .then((data) => {
        if (!active || data.length !== 12) return;
        const idx = new Date().getMonth();
        const current = data[idx] ?? 0;
        const previous = idx > 0 ? data[idx - 1] ?? 0 : 0;
        setThisMonth(current);
        if (previous > 0) {
          setGrowth(Math.round(((current - previous) / previous) * 100));
        } else {
          setGrowth(current > 0 ? 100 : 0);
        }
      })
      .catch(() => {
        /* leave at zero on failure */
      });
    return () => {
      active = false;
    };
  }, []);

  // Gauge shows growth vs last month, clamped to a readable 0–100 range.
  const progress = Math.max(0, Math.min(100, growth));
  const series = [progress];
  const options: ApexOptions = {
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
  };

  const [isOpen, setIsOpen] = useState(false);

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

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
          <div className="relative inline-block">
            <button onClick={toggleDropdown} className="dropdown-toggle">
              <MoreDotIcon className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300" />
            </button>
            <Dropdown
              isOpen={isOpen}
              onClose={closeDropdown}
              className="w-40 p-2"
            >
              <DropdownItem
                tag="a"
                onItemClick={closeDropdown}
                className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
              >
                {t('dashboardviewMore')}
              </DropdownItem>
              <DropdownItem
                tag="a"
                onItemClick={closeDropdown}
                className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
              >
                {t('dashboarddelete')}
              </DropdownItem>
            </Dropdown>
          </div>
        </div>
        <div className="relative ">
          <div className="max-h-[200px]">
            <ReactApexChart
              options={options}
              series={series}
              type="radialBar"
              height={235}
            />
          </div>

          <span
            className={`absolute left-1/2 top-full -translate-x-1/2 -translate-y-[90%] rounded-full px-3 py-1 text-xs font-medium ${
              growth >= 0
                ? "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500"
                : "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500"
            }`}
          >
            {growth >= 0 ? "+" : ""}
            {growth}%
          </span>
        </div>
        <p className="mx-auto mt-4 w-full max-w-[380px] text-center text-sm text-gray-500">
          {t('dashboard.earnMessage').replace(
            '{amount}',
            new Intl.NumberFormat('uz-UZ').format(Math.round(thisMonth)) + " so'm"
          )}
        </p>
      </div>

    </div>
  );
}
