"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Image from "next/image";
import { PlusIcon, DownloadIcon, ChevronLeftIcon } from "@/icons/index";
import { useTranslations } from "@/hooks/useTranslations";
import { useSubscription } from "@/context/SubscriptionContext";

// Define the TypeScript interface for the product
interface ProductV2 {
  id: number;
  name: string;
  priceIn: string;
  priceOut: string;
  quantity: number;
  image: string;
}

// Define the table data using the interface
const tableData: ProductV2[] = [
  {
    id: 1,
    name: "ASUS ROG Gaming Laptop",
    priceIn: "$1,800",
    priceOut: "$2,199",
    quantity: 0,
    image: "/images/product/product-01.jpg",
  },
  {
    id: 2,
    name: "Airpods Pro 2nd Gen",
    priceIn: "$650",
    priceOut: "$839",
    quantity: 45,
    image: "/images/product/product-02.jpg",
  },
  {
    id: 3,
    name: "Apple Watch Ultra",
    priceIn: "$1,200",
    priceOut: "$1,579",
    quantity: 0,
    image: "/images/product/product-03.jpg",
  },
  {
    id: 4,
    name: "Bose QuietComfort Earbuds",
    priceIn: "$200",
    priceOut: "$279",
    quantity: 120,
    image: "/images/product/product-04.jpg",
  },
  {
    id: 5,
    name: "Canon EOS R5 Camera",
    priceIn: "$3,200",
    priceOut: "$3,899",
    quantity: 8,
    image: "/images/product/product-05.jpg",
  },
  {
    id: 6,
    name: "Dell XPS 13 Laptop",
    priceIn: "$1,000",
    priceOut: "$1,299",
    quantity: 25,
    image: "/images/product/product-01.jpg",
  },
  {
    id: 7,
    name: "Google Pixel 8 Pro",
    priceIn: "$700",
    priceOut: "$899",
    quantity: 0,
    image: "/images/product/product-02.jpg",
  },
  {
    id: 8,
    name: "Sony WH-1000XM5 Headphones",
    priceIn: "$300",
    priceOut: "$399",
    quantity: 60,
    image: "/images/product/product-03.jpg",
  },
  {
    id: 9,
    name: "Samsung Galaxy S24 Ultra",
    priceIn: "$950",
    priceOut: "$1,199",
    quantity: 30,
    image: "/images/product/product-04.jpg",
  },
  {
    id: 10,
    name: "MacBook Air M3",
    priceIn: "$1,000",
    priceOut: "$1,299",
    quantity: 15,
    image: "/images/product/product-05.jpg",
  },
  {
    id: 11,
    name: "Nikon Z9 Camera",
    priceIn: "$4,500",
    priceOut: "$5,499",
    quantity: 0,
    image: "/images/product/product-01.jpg",
  },
  {
    id: 12,
    name: "Microsoft Surface Pro 9",
    priceIn: "$1,200",
    priceOut: "$1,499",
    quantity: 20,
    image: "/images/product/product-02.jpg",
  },
  {
    id: 13,
    name: "OnePlus 12 Pro",
    priceIn: "$600",
    priceOut: "$799",
    quantity: 50,
    image: "/images/product/product-03.jpg",
  },
  {
    id: 14,
    name: "JBL Flip 6 Speaker",
    priceIn: "$90",
    priceOut: "$129",
    quantity: 100,
    image: "/images/product/product-04.jpg",
  },
  {
    id: 15,
    name: "HP Spectre x360",
    priceIn: "$1,300",
    priceOut: "$1,599",
    quantity: 12,
    image: "/images/product/product-05.jpg",
  },
  {
    id: 16,
    name: "Fujifilm X-T5 Camera",
    priceIn: "$1,400",
    priceOut: "$1,699",
    quantity: 18,
    image: "/images/product/product-01.jpg",
  },
  {
    id: 17,
    name: "Xiaomi 14 Ultra",
    priceIn: "$800",
    priceOut: "$999",
    quantity: 0,
    image: "/images/product/product-02.jpg",
  },
  {
    id: 18,
    name: "Sennheiser Momentum 4",
    priceIn: "$280",
    priceOut: "$349",
    quantity: 40,
    image: "/images/product/product-03.jpg",
  },
  {
    id: 19,
    name: "Lenovo ThinkPad X1 Carbon",
    priceIn: "$1,400",
    priceOut: "$1,799",
    quantity: 22,
    image: "/images/product/product-04.jpg",
  },
  {
    id: 20,
    name: "Panasonic Lumix S5II",
    priceIn: "$1,600",
    priceOut: "$1,999",
    quantity: 10,
    image: "/images/product/product-05.jpg",
  },
];

export default function ProductsListV2() {
  const { t } = useTranslations();
  const { getLimit, isLimitReached } = useSubscription();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const itemsPerPage = 7;

  // Check product limit
  const productLimit = getLimit('products');
  const productLimitReached = productLimit !== null && isLimitReached('products', tableData.length);

  // Helper function to calculate profit
  const calculateProfit = (priceOut: string, priceIn: string): string => {
    const out = parseFloat(priceOut.replace(/[$,]/g, ""));
    const inPrice = parseFloat(priceIn.replace(/[$,]/g, ""));
    const profit = out - inPrice;
    return `$${profit.toLocaleString()}`;
  };

  // Filter products based on search query
  const filteredProducts = tableData.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Check if all current page products are selected
  const allSelected = paginatedProducts.length > 0 && paginatedProducts.every(product => selectedProducts.includes(product.id));

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const pageIds = paginatedProducts.map(p => p.id);
      setSelectedProducts([...new Set([...selectedProducts, ...pageIds])]);
    } else {
      const pageIds = paginatedProducts.map(p => p.id);
      setSelectedProducts(selectedProducts.filter(id => !pageIds.includes(id)));
    }
  };

  const handleSelectProduct = (productId: number, checked: boolean) => {
    if (checked) {
      setSelectedProducts([...selectedProducts, productId]);
    } else {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-2">
            {t('productsV2.title')}
          </h3>
          <p className="text-gray-500 text-theme-sm dark:text-gray-400">
            {t('productsV2.description')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200">
            <DownloadIcon />
            {t('productsV2.export')}
          </button>
          {productLimitReached ? (
            <div className="flex items-center gap-2 text-sm text-warning-600 dark:text-warning-500">
              <span>{t('productsV2.limitReached').replace('{limit}', String(productLimit))}</span>
            </div>
          ) : (
            <Link
              href="/add-product-v2"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-theme-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 dark:bg-brand-500 dark:hover:bg-brand-600"
            >
              <PlusIcon />
              {t('productsV2.addProduct')}
            </Link>
          )}
          {productLimit !== null && !productLimitReached && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {t('productsV2.limitInfo').replace('{current}', String(tableData.length)).replace('{limit}', String(productLimit))}
            </span>
          )}
        </div>
      </div>

      {/* Search and Filter Bar */}
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
            placeholder={t('productsV2.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-12 pr-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
          />
        </div>

        <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200">
          <svg
            className="stroke-current fill-white dark:fill-gray-800 w-4 h-4"
            width="16"
            height="16"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2.29004 5.90393H17.7067"
              stroke=""
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M17.7075 14.0961H2.29085"
              stroke=""
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M12.0826 3.33331C13.5024 3.33331 14.6534 4.48431 14.6534 5.90414C14.6534 7.32398 13.5024 8.47498 12.0826 8.47498C10.6627 8.47498 9.51172 7.32398 9.51172 5.90415C9.51172 4.48432 10.6627 3.33331 12.0826 3.33331Z"
              fill=""
              stroke=""
              strokeWidth="1.5"
            />
            <path
              d="M7.91745 11.525C6.49762 11.525 5.34662 12.676 5.34662 14.0959C5.34661 15.5157 6.49762 16.6667 7.91745 16.6667C9.33728 16.6667 10.4883 15.5157 10.4883 14.0959C10.4883 12.676 9.33728 11.525 7.91745 11.525Z"
              fill=""
              stroke=""
              strokeWidth="1.5"
            />
          </svg>
          {t('productsV2.filter')}
        </button>
      </div>

      {/* Products Table */}
      <div className="w-full overflow-x-auto -mx-4 sm:-mx-6" style={{ scrollbarGutter: 'stable' }}>
        <Table className="w-full [table-layout:fixed]">
          {/* Table Header */}
          <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
            <TableRow>
              <TableCell
                isHeader
                className="py-3 px-4 sm:px-6 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 w-12"
              >
                <label className="cursor-pointer text-sm font-medium text-gray-700 select-none dark:text-gray-400">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="sr-only"
                  />
                  <span className={`flex h-4 w-4 items-center justify-center rounded-sm border-[1.25px] ${allSelected ? 'border-brand-500 bg-brand-500' : 'border-gray-300 dark:border-gray-700'}`}>
                    {allSelected && (
                      <span>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="1.6666" strokeLinecap="round" strokeLinejoin="round"></path>
                        </svg>
                      </span>
                    )}
                  </span>
                </label>
              </TableCell>
              <TableCell
                isHeader
                className="py-3 pr-4 sm:pl-2 sm:pr-6 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 w-[30%]"
              >
                <div className="flex items-center gap-2">
                  {t('productsV2.products')}
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                    />
                  </svg>
                </div>
              </TableCell>
              <TableCell
                isHeader
                className="py-3 px-4 sm:px-6 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 w-[15%]"
              >
                <div className="flex items-center gap-2">
                  {t('productsV2.priceIn')}
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                    />
                  </svg>
                </div>
              </TableCell>
              <TableCell
                isHeader
                className="py-3 px-4 sm:px-6 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 w-[15%]"
              >
                <div className="flex items-center gap-2">
                  {t('productsV2.priceOut')}
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                    />
                  </svg>
                </div>
              </TableCell>
              <TableCell
                isHeader
                className="py-3 px-4 sm:px-6 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 w-[15%]"
              >
                <div className="flex items-center gap-2">
                  {t('productsV2.profit')}
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                    />
                  </svg>
                </div>
              </TableCell>
              <TableCell
                isHeader
                className="py-3 px-4 sm:px-6 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 w-[15%]"
              >
                <div className="flex items-center gap-2">
                  {t('productsV2.quantity')}
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                    />
                  </svg>
                </div>
              </TableCell>
            </TableRow>
          </TableHeader>

          {/* Table Body */}
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {paginatedProducts.map((product) => (
              <TableRow key={product.id} className="transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-white/[0.02] cursor-pointer">
                <TableCell className="py-3 px-4 sm:px-6 w-12">
                  <label className="cursor-pointer text-sm font-medium text-gray-700 select-none dark:text-gray-400">
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={(e) => handleSelectProduct(product.id, e.target.checked)}
                      className="sr-only"
                    />
                    <span className={`flex h-4 w-4 items-center justify-center rounded-sm border-[1.25px] ${selectedProducts.includes(product.id) ? 'border-brand-500 bg-brand-500' : 'border-gray-300 dark:border-gray-700'}`}>
                      {selectedProducts.includes(product.id) && (
                        <span>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="1.6666" strokeLinecap="round" strokeLinejoin="round"></path>
                          </svg>
                        </span>
                      )}
                    </span>
                  </label>
                </TableCell>
                <TableCell className="py-3 pr-4 sm:pl-2 sm:pr-6 w-[30%]">
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
                      <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                        {product.name}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-3 px-4 sm:px-6 w-[15%] text-gray-500 text-theme-sm dark:text-gray-400">
                  {product.priceIn}
                </TableCell>
                <TableCell className="py-3 px-4 sm:px-6 w-[15%] text-gray-500 text-theme-sm dark:text-gray-400">
                  {product.priceOut}
                </TableCell>
                <TableCell className="py-3 px-4 sm:px-6 w-[15%]">
                  <span className="text-success-600 text-theme-sm font-medium dark:text-success-500">
                    {calculateProfit(product.priceOut, product.priceIn)}
                  </span>
                </TableCell>
                <TableCell className="py-3 px-4 sm:px-6 w-[15%] text-gray-500 text-theme-sm dark:text-gray-400">
                  {product.quantity}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-4 pt-4 mt-4 -mx-4 sm:-mx-6 px-4 sm:px-6 border-t border-gray-100 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {t('productsV2.showing')} {filteredProducts.length > 0 ? startIndex + 1 : 0} {t('productsV2.to')}{" "}
          {Math.min(endIndex, filteredProducts.length)} {t('productsV2.of')} {filteredProducts.length} {t('productsV2.results')}
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
                  className={`flex w-10 h-10 items-center justify-center rounded-lg text-sm font-medium ${
                    currentPage === page
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
  );
}
