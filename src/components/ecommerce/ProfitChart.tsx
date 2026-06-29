"use client";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { MoreDotIcon } from "@/icons";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";

// Dynamically import the ReactApexChart component
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

export default function ProfitChart() {
  const options: ApexOptions = {
    colors: ["#10b981"],
    chart: {
      fontFamily: "var(--font-gilroy), sans-serif",
      type: "bar",
      height: 180,
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
      labels: {
        style: {
          fontSize: "12px",
          colors: ["#6B7280"],
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          fontSize: "12px",
          colors: ["#6B7280"],
        },
        formatter: function (val: number) {
          return "$" + val.toLocaleString();
        },
      },
    },
    fill: {
      opacity: 1,
    },
    tooltip: {
      y: {
        formatter: function (val: number) {
          return "$" + val.toLocaleString();
        },
      },
    },
    grid: {
      borderColor: "#E5E7EB",
      strokeDashArray: 5,
    },
  };

  const series = [
    {
      name: "Profit",
      data: [12500, 13200, 11800, 14500, 15200, 16800, 17500, 18900, 20100, 21500, 22800, 24200],
    },
  ];

  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex flex-col gap-2 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Monthly Profit
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            Profit trends over the last 12 months
          </p>
        </div>
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
          >
            <MoreDotIcon className="w-5 h-5" />
          </button>
          {isOpen && (
            <Dropdown onClose={() => setIsOpen(false)} isOpen={isOpen}>
              <DropdownItem>View Report</DropdownItem>
              <DropdownItem>Export Data</DropdownItem>
            </Dropdown>
          )}
        </div>
      </div>

      <div className="w-full">
        <ReactApexChart
          options={options}
          series={series}
          type="bar"
          height={180}
        />
      </div>
    </div>
  );
}
