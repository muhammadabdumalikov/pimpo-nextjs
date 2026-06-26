"use client";
import { useState, useEffect, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Image from "next/image";
import { DownloadIcon, ArrowUpIcon, ArrowDownIcon, CalenderIcon } from "@/icons/index";
import { useTranslations } from "@/hooks/useTranslations";
import Badge from "../ui/badge/Badge";
import flatpickr from "flatpickr";

// Define the TypeScript interface for product performance
interface ProductPerformance {
  id: number;
  name: string;
  code: string;
  image: string;
  category: string;
  sales: number;
  revenue: number;
  profit: number;
  unitsSold: number;
  profitMargin: number;
  growth: number;
  status: "increasing" | "decreasing" | "stable";
  date: string; // Date in YYYY-MM-DD format
}

// Sample performance data
const performanceData: ProductPerformance[] = [
  {
    id: 1,
    name: "ASUS ROG Gaming Laptop",
    code: "ASUS-001",
    image: "/images/product/product-01.jpg",
    category: "Laptops",
    sales: 125,
    revenue: 274875,
    profit: 49975,
    unitsSold: 125,
    profitMargin: 18.2,
    growth: 12.5,
    status: "increasing",
    date: "2024-01-15",
  },
  {
    id: 2,
    name: "Airpods Pro 2nd Gen",
    code: "APPLE-002",
    image: "/images/product/product-02.jpg",
    category: "Accessories",
    sales: 342,
    revenue: 286938,
    profit: 64638,
    unitsSold: 342,
    profitMargin: 22.5,
    growth: 8.3,
    status: "increasing",
    date: "2024-02-20",
  },
  {
    id: 3,
    name: "Apple Watch Ultra",
    code: "APPLE-003",
    image: "/images/product/product-03.jpg",
    category: "Watches",
    sales: 89,
    revenue: 140531,
    profit: 33731,
    unitsSold: 89,
    profitMargin: 24.0,
    growth: -5.2,
    status: "decreasing",
    date: "2024-03-10",
  },
  {
    id: 4,
    name: "Bose QuietComfort Earbuds",
    code: "BOSE-004",
    image: "/images/product/product-04.jpg",
    category: "Audio",
    sales: 256,
    revenue: 71424,
    profit: 20224,
    unitsSold: 256,
    profitMargin: 28.3,
    growth: 15.7,
    status: "increasing",
    date: "2024-04-05",
  },
  {
    id: 5,
    name: "Canon EOS R5 Camera",
    code: "CANON-005",
    image: "/images/product/product-05.jpg",
    category: "Cameras",
    sales: 45,
    revenue: 175455,
    profit: 31455,
    unitsSold: 45,
    profitMargin: 17.9,
    growth: -2.1,
    status: "decreasing",
    date: "2024-05-12",
  },
  {
    id: 6,
    name: "Dell XPS 13 Laptop",
    code: "DELL-006",
    image: "/images/product/product-01.jpg",
    category: "Laptops",
    sales: 98,
    revenue: 127302,
    profit: 29202,
    unitsSold: 98,
    profitMargin: 22.9,
    growth: 6.8,
    status: "increasing",
    date: "2024-06-18",
  },
  {
    id: 7,
    name: "Google Pixel 8 Pro",
    code: "GOOGLE-007",
    image: "/images/product/product-02.jpg",
    category: "Phones",
    sales: 167,
    revenue: 150133,
    profit: 33233,
    unitsSold: 167,
    profitMargin: 22.1,
    growth: 0.5,
    status: "stable",
    date: "2024-07-22",
  },
  {
    id: 8,
    name: "Sony WH-1000XM5 Headphones",
    code: "SONY-008",
    image: "/images/product/product-03.jpg",
    category: "Audio",
    sales: 203,
    revenue: 80997,
    profit: 20097,
    unitsSold: 203,
    profitMargin: 24.8,
    growth: 9.4,
    status: "increasing",
    date: "2024-08-30",
  },
];

export default function ProductPerformance() {
  const { t } = useTranslations();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<"revenue" | "profit" | "sales" | "growth">("revenue");
  const datePickerRef = useRef<HTMLInputElement>(null);
  const itemsPerPage = 7;

  // Calculate current month start and end dates for initial state
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([firstDayOfMonth, lastDayOfMonth]);

  // Initialize date picker
  useEffect(() => {
    if (!datePickerRef.current) return;

    // Calculate current month dates inside useEffect
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const fp = flatpickr(datePickerRef.current, {
      mode: "range",
      static: false,
      monthSelectorType: "static",
      dateFormat: "d.m.y",
      defaultDate: [firstDay, lastDay],
      clickOpens: true,
      onChange: (selectedDates, dateStr, instance) => {
        if (selectedDates.length === 2) {
          setDateRange([selectedDates[0], selectedDates[1]]);
          setCurrentPage(1);
        } else if (selectedDates.length === 0) {
          setDateRange([null, null]);
          setCurrentPage(1);
        }
        (instance.element as HTMLInputElement).value = dateStr.replace('to', ' - ');
      },
      onReady: (_, dateStr, instance) => {
        (instance.element as HTMLInputElement).value = dateStr.replace('to', ' - ');
      },
    });

    return () => {
      if (!Array.isArray(fp)) {
        fp.destroy();
      }
    };
  }, []);

  // Filter and sort products
  const filteredProducts = performanceData
    .filter((product) => {
      // Text search filter
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase());

      // Date range filter
      let matchesDate = true;
      if (dateRange[0] && dateRange[1]) {
        const productDate = new Date(product.date);
        matchesDate =
          productDate >= dateRange[0] && productDate <= dateRange[1];
      }

      return matchesSearch && matchesDate;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "revenue":
          return b.revenue - a.revenue;
        case "profit":
          return b.profit - a.profit;
        case "sales":
          return b.sales - a.sales;
        case "growth":
          return b.growth - a.growth;
        default:
          return 0;
      }
    });

  // Calculate pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const formatCurrency = (amount: number) => {
    return "$" + amount.toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Main Performance Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-2">
              {t('productPerformance.topTenProducts')}
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200">
              <DownloadIcon />
              {t('productPerformance.export')}
            </button>
          </div>
        </div>

        {/* Search and Sort */}
        <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <span className="absolute -translate-y-1/2 left-4 top-1/2 pointer-events-none">
              <svg
                className="fill-gray-500 dark:fill-gray-400"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z"
                  fill=""
                />
              </svg>
            </span>
            <input
              type="text"
              placeholder={t('productPerformance.search')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="h-11 w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-12 pr-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>

          <div className="relative">
            <input
              ref={datePickerRef}
              type="text"
              placeholder={t('productPerformance.selectDateRange')}
              className="h-11 w-full sm:w-auto min-w-[200px] rounded-lg border border-gray-200 bg-white px-4 py-2.5 pl-12 pr-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
            <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none left-4 top-1/2 dark:text-gray-400">
              <CalenderIcon />
            </span>
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-11 rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90"
          >
            <option value="revenue">{t('productPerformance.sortByRevenue')}</option>
            <option value="profit">{t('productPerformance.sortByProfit')}</option>
            <option value="sales">{t('productPerformance.sortBySales')}</option>
            <option value="growth">{t('productPerformance.sortByGrowth')}</option>
          </select>
        </div>

        {/* Table */}
        <div className="w-full overflow-x-auto -mx-4 sm:-mx-6" style={{ scrollbarGutter: 'stable' }}>
          <Table className="w-full min-w-[760px]! [table-layout:fixed]">
            <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
              <TableRow>
                <TableCell
                  isHeader
                  className="py-3 pr-4 sm:pl-12 sm:pr-6 font-medium text-gray-500 text-start text-sm dark:text-gray-400 w-[30%]"
                >
                  {t('productPerformance.product')}
                </TableCell>
                <TableCell
                  isHeader
                  className="py-3 px-4 sm:px-6 font-medium text-gray-500 text-start text-sm dark:text-gray-400 w-[14%]"
                >
                  {t('productPerformance.sales')}
                </TableCell>
                <TableCell
                  isHeader
                  className="py-3 px-4 sm:px-6 font-medium text-gray-500 text-start text-sm dark:text-gray-400 w-[14%]"
                >
                  {t('productPerformance.revenue')}
                </TableCell>
                <TableCell
                  isHeader
                  className="py-3 px-4 sm:px-6 font-medium text-gray-500 text-start text-sm dark:text-gray-400 w-[18%]"
                >
                  {t('productPerformance.profit')}
                </TableCell>
                <TableCell
                  isHeader
                  className="py-3 px-4 sm:px-6 font-medium text-gray-500 text-start text-sm dark:text-gray-400 w-[18%]"
                >
                  {t('productPerformance.growth')}
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {paginatedProducts.map((product) => (
                <TableRow key={product.id} className="transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                  <TableCell className="py-3 pr-4 sm:pl-12 sm:pr-6 w-[30%]">
                    <div className="flex items-center gap-3">
                      <div className="h-[50px] w-[50px] overflow-hidden rounded-md">
                        <Image
                          width={50}
                          height={50}
                          src={product.image}
                          className="h-[50px] w-[50px] object-cover"
                          alt={product.name}
                        />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 text-base dark:text-white/90">
                          {product.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {product.code}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 w-[14%] text-gray-500 text-base dark:text-gray-400">
                    {product.unitsSold}
                  </TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 w-[14%] text-gray-800 text-base font-medium dark:text-white/90">
                    {formatCurrency(product.revenue)}
                  </TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 w-[18%] text-success-600 text-base font-medium dark:text-success-500">
                    {formatCurrency(product.profit)}
                  </TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 w-[18%]">
                    {product.status === "increasing" ? (
                      <Badge color="success">
                        <ArrowUpIcon />
                        +{product.growth}%
                      </Badge>
                    ) : product.status === "decreasing" ? (
                      <Badge color="error">
                        <ArrowDownIcon />
                        {product.growth}%
                      </Badge>
                    ) : (
                      <Badge color="warning">
                        {product.growth}%
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-4 pt-4 mt-4 -mx-4 sm:-mx-6 px-4 sm:px-6 border-t border-gray-100 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {t('productPerformance.showing')} {filteredProducts.length > 0 ? startIndex + 1 : 0} {t('productPerformance.to')}{" "}
            {Math.min(endIndex, filteredProducts.length)} {t('productPerformance.of')} {filteredProducts.length} {t('productPerformance.results')}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center justify-center h-10 w-10 rounded-lg border border-gray-300 bg-white text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                let page;
                if (totalPages <= 3) {
                  page = i + 1;
                } else if (currentPage === 1) {
                  page = i + 1;
                } else if (currentPage === totalPages) {
                  page = totalPages - 2 + i;
                } else {
                  page = currentPage - 1 + i;
                }
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`flex w-10 h-10 items-center justify-center rounded-lg text-sm font-medium ${currentPage === page
                        ? "bg-brand-500 text-white"
                        : "text-gray-700 hover:bg-blue-500/[0.08] hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-500"
                      }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex items-center justify-center h-10 w-10 rounded-lg border border-gray-300 bg-white text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

