"use client";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "@/hooks/useTranslations";
import { getMonthlySales } from "@/lib/api";

// Dynamically import the ReactApexChart component
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

export default function MonthlySalesChart() {
  const { t } = useTranslations();
  const options: ApexOptions = {
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
      categories: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ],
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
      fontFamily: "var(--font-gilroy), sans-serif",
    },
    yaxis: {
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
        show: false,
      },
      y: {
        formatter: (val: number) =>
          `${new Intl.NumberFormat("uz-UZ").format(Math.round(val))} so'm`,
      },
    },
  };

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

  const series = [
    {
      name: t("dashboard.monthlySales"),
      data: monthly,
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          {t('dashboard.monthlySales')}
        </h3>
        <Link
          href="/reports/sales"
          className="text-sm font-medium text-brand-500 hover:text-brand-600"
        >
          {t('reportsPage.openReport')}
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
