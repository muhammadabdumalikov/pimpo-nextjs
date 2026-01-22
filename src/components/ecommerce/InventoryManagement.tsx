"use client";
import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Image from "next/image";
import { PlusIcon, DownloadIcon, CheckCircleIcon, AlertIcon } from "@/icons/index";
import { useTranslations } from "@/hooks/useTranslations";
import Badge from "../ui/badge/Badge";

// Define the TypeScript interface for inventory item
interface InventoryItem {
  id: number;
  name: string;
  code: string;
  barcode: string;
  image: string;
  expectedQuantity: number;
  actualQuantity: number;
  difference: number;
  status: "match" | "shortage" | "overage";
}

// Sample inventory data
const inventoryData: InventoryItem[] = [
  {
    id: 1,
    name: "ASUS ROG Gaming Laptop",
    code: "ASUS-001",
    barcode: "1234567890123",
    image: "/images/product/product-01.jpg",
    expectedQuantity: 5,
    actualQuantity: 5,
    difference: 0,
    status: "match",
  },
  {
    id: 2,
    name: "Airpods Pro 2nd Gen",
    code: "APPLE-002",
    barcode: "1234567890124",
    image: "/images/product/product-02.jpg",
    expectedQuantity: 45,
    actualQuantity: 42,
    difference: -3,
    status: "shortage",
  },
  {
    id: 3,
    name: "Apple Watch Ultra",
    code: "APPLE-003",
    barcode: "1234567890125",
    image: "/images/product/product-03.jpg",
    expectedQuantity: 10,
    actualQuantity: 12,
    difference: 2,
    status: "overage",
  },
  {
    id: 4,
    name: "Bose QuietComfort Earbuds",
    code: "BOSE-004",
    barcode: "1234567890126",
    image: "/images/product/product-04.jpg",
    expectedQuantity: 120,
    actualQuantity: 120,
    difference: 0,
    status: "match",
  },
  {
    id: 5,
    name: "Canon EOS R5 Camera",
    code: "CANON-005",
    barcode: "1234567890127",
    image: "/images/product/product-05.jpg",
    expectedQuantity: 8,
    actualQuantity: 6,
    difference: -2,
    status: "shortage",
  },
  {
    id: 6,
    name: "Dell XPS 13 Laptop",
    code: "DELL-006",
    barcode: "1234567890128",
    image: "/images/product/product-01.jpg",
    expectedQuantity: 25,
    actualQuantity: 25,
    difference: 0,
    status: "match",
  },
  {
    id: 7,
    name: "Google Pixel 8 Pro",
    code: "GOOGLE-007",
    barcode: "1234567890129",
    image: "/images/product/product-02.jpg",
    expectedQuantity: 15,
    actualQuantity: 15,
    difference: 0,
    status: "match",
  },
  {
    id: 8,
    name: "Sony WH-1000XM5 Headphones",
    code: "SONY-008",
    barcode: "1234567890130",
    image: "/images/product/product-03.jpg",
    expectedQuantity: 60,
    actualQuantity: 58,
    difference: -2,
    status: "shortage",
  },
];

export default function InventoryManagement() {
  const { t } = useTranslations();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isInventoryActive, setIsInventoryActive] = useState(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const itemsPerPage = 7;

  // Filter inventory items based on search query
  const filteredItems = inventoryData.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.barcode.includes(searchQuery)
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  // Calculate statistics
  const totalItems = filteredItems.length;
  const matchedItems = filteredItems.filter((item) => item.status === "match").length;
  const shortageItems = filteredItems.filter((item) => item.status === "shortage").length;
  const overageItems = filteredItems.filter((item) => item.status === "overage").length;


  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleStartInventory = () => {
    setIsInventoryActive(true);
  };

  const handleStopInventory = () => {
    setIsInventoryActive(false);
  };

  const handleBarcodeScan = (barcode: string) => {
    if (!barcode) return;
    // In a real app, this would update the actual quantity
    setBarcodeInput("");
  };

  const handleSelectItem = (itemId: number, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, itemId]);
    } else {
      setSelectedItems(selectedItems.filter((id) => id !== itemId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const pageIds = paginatedItems.map((item) => item.id);
      setSelectedItems([...new Set([...selectedItems, ...pageIds])]);
    } else {
      const pageIds = paginatedItems.map((item) => item.id);
      setSelectedItems(selectedItems.filter((id) => !pageIds.includes(id)));
    }
  };

  const allSelected = paginatedItems.length > 0 && paginatedItems.every((item) => selectedItems.includes(item.id));

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-2">
            {t('inventory.title')}
          </h3>
          <p className="text-gray-500 text-theme-sm dark:text-gray-400">
            {t('inventory.description')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200">
            <DownloadIcon />
            {t('inventory.export')}
          </button>
          {!isInventoryActive ? (
            <button
              onClick={handleStartInventory}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-theme-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 dark:bg-brand-500 dark:hover:bg-brand-600"
            >
              <PlusIcon />
              {t('inventory.startInventory')}
            </button>
          ) : (
            <button
              onClick={handleStopInventory}
              className="inline-flex items-center gap-2 rounded-lg bg-error-500 px-4 py-2.5 text-theme-sm font-medium text-white shadow-theme-xs hover:bg-error-600"
            >
              {t('inventory.stopInventory')}
            </button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {t('inventory.totalItems')}
          </p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white/90">
            {totalItems}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {t('inventory.matched')}
          </p>
          <p className="text-2xl font-bold text-success-600 dark:text-success-500">
            {matchedItems}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {t('inventory.shortages')}
          </p>
          <p className="text-2xl font-bold text-error-600 dark:text-error-500">
            {shortageItems}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {t('inventory.overages')}
          </p>
          <p className="text-2xl font-bold text-warning-600 dark:text-warning-500">
            {overageItems}
          </p>
        </div>
      </div>

      {/* Barcode Scanner Input (when inventory is active) */}
      {isInventoryActive && (
        <div className="mb-4 p-4 rounded-lg bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/20">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('inventory.scanBarcode')}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleBarcodeScan(barcodeInput);
                }
              }}
              placeholder={t('inventory.barcodePlaceholder')}
              className="flex-1 h-11 rounded-lg border border-gray-200 bg-white py-2.5 px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              autoFocus
            />
            <button
              onClick={() => handleBarcodeScan(barcodeInput)}
              className="px-4 py-2.5 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600"
            >
              {t('inventory.scan')}
            </button>
          </div>
        </div>
      )}

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
            placeholder={t('inventory.search')}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="h-11 w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-12 pr-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
          />
        </div>

        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200">
            {t('inventory.filter')}
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200">
            {t('inventory.viewHistory')}
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="w-full overflow-x-auto -mx-4 sm:-mx-6" style={{ scrollbarGutter: 'stable' }}>
        <Table className="w-full [table-layout:fixed]">
          <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
            <TableRow>
              <TableCell
                isHeader
                className="py-3 px-4 sm:px-6 font-medium text-gray-500 text-start text-sm dark:text-gray-400 w-12"
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
                className="py-3 pr-4 sm:pl-2 sm:pr-6 font-medium text-gray-500 text-start text-sm dark:text-gray-400 w-[25%]"
              >
                {t('inventory.product')}
              </TableCell>
              <TableCell
                isHeader
                className="py-3 px-4 sm:px-6 font-medium text-gray-500 text-start text-sm dark:text-gray-400 w-[15%]"
              >
                {t('inventory.code')}
              </TableCell>
              <TableCell
                isHeader
                className="py-3 px-4 sm:px-6 font-medium text-gray-500 text-start text-sm dark:text-gray-400 w-[15%]"
              >
                {t('inventory.barcode')}
              </TableCell>
              <TableCell
                isHeader
                className="py-3 px-4 sm:px-6 font-medium text-gray-500 text-start text-sm dark:text-gray-400 w-[12%]"
              >
                {t('inventory.expected')}
              </TableCell>
              <TableCell
                isHeader
                className="py-3 px-4 sm:px-6 font-medium text-gray-500 text-start text-sm dark:text-gray-400 w-[12%]"
              >
                {t('inventory.actual')}
              </TableCell>
              <TableCell
                isHeader
                className="py-3 px-4 sm:px-6 font-medium text-gray-500 text-start text-sm dark:text-gray-400 w-[12%]"
              >
                {t('inventory.difference')}
              </TableCell>
              <TableCell
                isHeader
                className="py-3 px-4 sm:px-6 font-medium text-gray-500 text-start text-sm dark:text-gray-400 w-[12%]"
              >
                {t('inventory.status')}
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {paginatedItems.map((item) => (
              <TableRow key={item.id} className="transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                <TableCell className="py-3 px-4 sm:px-6 w-12">
                  <label className="cursor-pointer text-sm font-medium text-gray-700 select-none dark:text-gray-400">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                      className="sr-only"
                    />
                    <span className={`flex h-4 w-4 items-center justify-center rounded-sm border-[1.25px] ${selectedItems.includes(item.id) ? 'border-brand-500 bg-brand-500' : 'border-gray-300 dark:border-gray-700'}`}>
                      {selectedItems.includes(item.id) && (
                        <span>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="1.6666" strokeLinecap="round" strokeLinejoin="round"></path>
                          </svg>
                        </span>
                      )}
                    </span>
                  </label>
                </TableCell>
                <TableCell className="py-3 pr-4 sm:pl-2 sm:pr-6 w-[25%]">
                  <div className="flex items-center gap-3">
                    <div className="h-[50px] w-[50px] overflow-hidden rounded-md">
                      <Image
                        width={50}
                        height={50}
                        src={item.image}
                        className="h-[50px] w-[50px] object-cover"
                        alt={item.name}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 text-base dark:text-white/90">
                        {item.name}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-3 px-4 sm:px-6 w-[15%] text-gray-500 text-base dark:text-gray-400">
                  {item.code}
                </TableCell>
                <TableCell className="py-3 px-4 sm:px-6 w-[15%] text-gray-500 text-base dark:text-gray-400">
                  {item.barcode}
                </TableCell>
                <TableCell className="py-3 px-4 sm:px-6 w-[12%] text-gray-500 text-base dark:text-gray-400">
                  {item.expectedQuantity}
                </TableCell>
                <TableCell className="py-3 px-4 sm:px-6 w-[12%]">
                  {isInventoryActive ? (
                    <input
                      type="number"
                      defaultValue={item.actualQuantity}
                      className="w-20 h-8 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 text-base text-gray-800 dark:text-white/90"
                    />
                  ) : (
                    <span className="text-gray-500 text-base dark:text-gray-400">
                      {item.actualQuantity}
                    </span>
                  )}
                </TableCell>
                <TableCell className="py-3 px-4 sm:px-6 w-[12%]">
                  <span className={`text-base font-medium ${
                    item.difference === 0
                      ? 'text-success-600 dark:text-success-500'
                      : item.difference < 0
                      ? 'text-error-600 dark:text-error-500'
                      : 'text-warning-600 dark:text-warning-500'
                  }`}>
                    {item.difference > 0 ? '+' : ''}{item.difference}
                  </span>
                </TableCell>
                <TableCell className="py-3 px-4 sm:px-6 w-[12%]">
                  {item.status === 'match' ? (
                    <Badge color="success">
                      <CheckCircleIcon />
                      {t('inventory.match')}
                    </Badge>
                  ) : item.status === 'shortage' ? (
                    <Badge color="error">
                      <AlertIcon />
                      {t('inventory.shortage')}
                    </Badge>
                  ) : (
                    <Badge color="warning">
                      <AlertIcon />
                      {t('inventory.overage')}
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
          {t('inventory.showing')} {filteredItems.length > 0 ? startIndex + 1 : 0} {t('inventory.to')}{" "}
          {Math.min(endIndex, filteredItems.length)} {t('inventory.of')} {filteredItems.length} {t('inventory.results')}
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
