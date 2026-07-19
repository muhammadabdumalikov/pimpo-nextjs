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
import { PlusIcon, ChevronLeftIcon, PencilIcon, TrashBinIcon } from "@/icons/index";
import { RiFileExcel2Line } from "react-icons/ri";
import { useTranslations } from "@/hooks/useTranslations";
import { useSubscription } from "@/context/SubscriptionContext";
import { getProducts, getProductCount, deleteProduct, type Product } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { useRouter } from "next/navigation";
import Pagination from "@/components/ui/pagination/Pagination";

// Format a UZS price string as grouped so'm (matches the rest of the dashboard).
// Returns "—" for empty/unset optional tiers (wholesale, bundle).
const formatPrice = (price: string | null | undefined): string => {
  if (price == null || price === '') return '—';
  const numPrice = parseFloat(price);
  if (Number.isNaN(numPrice)) return '—';
  return `${new Intl.NumberFormat('uz-UZ').format(Math.round(numPrice))} so'm`;
};

export default function ProductsList() {
  const { t } = useTranslations();
  const { getLimit, isLimitReached } = useSubscription();
  const { showToast } = useToast();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const itemsPerPage = 7;

  // Check product limit
  const productLimit = getLimit('products');
  const productLimitReached = productLimit !== null && isLimitReached('products', totalProducts);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const response = await getProducts(currentPage, itemsPerPage, searchQuery || undefined);
      setProducts(response.products);
      setTotalProducts(response.total);
    } catch (error: any) {
      console.error('Failed to load products:', error);
      showToast('error', error.message || 'Failed to load products', 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch products from API when page changes
  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Debounce search and reset to page 1
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage === 1) {
        loadProducts();
      } else {
        setCurrentPage(1);
      }
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Calculate pagination
  const totalPages = Math.ceil(totalProducts / itemsPerPage);

  // Check if all current page products are selected
  const allSelected = products.length > 0 && products.every(product => selectedProducts.includes(product.id));

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const pageIds = products.map((p: Product) => p.id);
      setSelectedProducts([...new Set([...selectedProducts, ...pageIds])]);
    } else {
      const pageIds = products.map((p: Product) => p.id);
      setSelectedProducts(selectedProducts.filter(id => !pageIds.includes(id)));
    }
  };

  const handleSelectProduct = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts([...selectedProducts, productId]);
    } else {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    }
  };

  const handleEdit = (productId: string) => {
    router.push(`/edit-product?id=${productId}`);
  };

  const handleDelete = async (productId: string) => {
    if (!confirm(t('products.confirmDelete') || 'Are you sure you want to delete this product?')) {
      return;
    }

    try {
      setDeletingProductId(productId);
      await deleteProduct(productId);
      showToast('success', t('products.deleteSuccess') || 'Product deleted successfully', 'Success');
      // Reload products
      await loadProducts();
    } catch (error: any) {
      console.error('Failed to delete product:', error);
      showToast('error', error.message || t('products.deleteError') || 'Failed to delete product', 'Error');
    } finally {
      setDeletingProductId(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-2">
            {t('products.title')}
          </h3>
          <p className="text-gray-500 text-theme-sm dark:text-gray-400">
            {t('products.description')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button disabled className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200">
            <RiFileExcel2Line className="h-5 w-5 text-success-600 dark:text-success-500" />
            {t('products.export')}
          </button>
          <Link
            href="/import-products"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16V4m0 0-4 4m4-4 4 4" />
              <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            </svg>
            {t('products.import')}
          </Link>
          {productLimitReached ? (
            <div className="flex items-center gap-2 text-sm text-warning-600 dark:text-warning-500">
              <span>{t('products.limitReached').replace('{limit}', String(productLimit))}</span>
            </div>
          ) : (
            <Link
              href="/add-product"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-theme-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 dark:bg-brand-500 dark:hover:bg-brand-600"
            >
              <PlusIcon />
              {t('products.addProduct')}
            </Link>
          )}
          {productLimit !== null && !productLimitReached && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {t('products.limitInfo').replace('{current}', String(totalProducts)).replace('{limit}', String(productLimit))}
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
            placeholder={t('products.search')}
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
          {t('products.filter')}
        </button>
      </div>

      {/* Products Table */}
      <div className="w-full overflow-x-auto -mx-4 sm:-mx-6" style={{ scrollbarGutter: 'stable' }}>
        <Table className="w-full min-w-[1140px]! whitespace-nowrap">
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
                className="py-3 pr-4 sm:pl-2 sm:pr-6 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 w-[20%]"
              >
                <div className="flex items-center gap-2">
                  {t('products.products')}
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
                  {t('products.priceIn')}
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
                  {t('products.priceOut')}
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
                  {t('products.priceBundle')}
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
                  {t('products.priceWholesale')}
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
                  {t('products.code')}
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
                  {t('products.barcode')}
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
                  {t('products.quantity')}
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
                className="py-3 px-4 sm:px-6 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 w-[10%]"
              >
                {t('products.actions') || 'Actions'}
              </TableCell>
            </TableRow>
          </TableHeader>

          {/* Table Body */}
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-3 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400"></div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {t('products.loading') || 'Loading products...'}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-8 text-center text-gray-500 dark:text-gray-400">
                  {t('products.noProducts') || 'No products found'}
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
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
                      <div className="h-[50px] w-[50px] overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        {product.image ? (
                          <Image
                            width={50}
                            height={50}
                            src={product.image}
                            className="h-[50px] w-[50px] object-cover"
                            alt={product.name}
                          />
                        ) : (
                          <svg
                            className="h-6 w-6 text-gray-400 dark:text-gray-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                          {product.name}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 w-[15%] text-gray-500 text-theme-sm dark:text-gray-400">
                    {formatPrice(product.priceIn)}
                  </TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 w-[15%] text-gray-500 text-theme-sm dark:text-gray-400">
                    {formatPrice(product.priceOut)}
                  </TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 w-[15%] text-gray-500 text-theme-sm dark:text-gray-400">
                    {formatPrice(product.priceBundle)}
                  </TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 w-[15%] text-gray-500 text-theme-sm dark:text-gray-400">
                    {formatPrice(product.priceWholesale)}
                  </TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 w-[15%] text-gray-500 text-theme-sm dark:text-gray-400">
                    {product.code || '-'}
                  </TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 w-[15%] text-gray-500 text-theme-sm dark:text-gray-400">
                    {product.barcode || '-'}
                  </TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 w-[15%] text-gray-500 text-theme-sm dark:text-gray-400">
                    <span className="inline-flex items-center gap-1.5">
                      {product.quantity}
                      {product.lowStockThreshold != null &&
                        product.quantity <= product.lowStockThreshold && (
                          <span
                            className="inline-flex items-center rounded-full bg-warning-50 px-2 py-0.5 text-xs font-medium text-warning-600 dark:bg-warning-500/15 dark:text-warning-400"
                            title={t('products.lowStock') || 'Low stock'}
                          >
                            ⚠ {t('products.lowStock') || 'Low stock'}
                          </span>
                        )}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 w-[10%]">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(product.id);
                        }}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-gray-300 bg-white text-gray-700 text-xs font-medium hover:bg-yellow-50 hover:border-yellow-300 hover:text-yellow-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-yellow-900/20 dark:hover:border-yellow-700 dark:hover:text-yellow-400"
                        title={t('products.edit') || 'Edit product'}
                      >
                        <PencilIcon />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(product.id);
                        }}
                        disabled={deletingProductId === product.id}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-gray-300 bg-white text-gray-700 text-xs font-medium hover:bg-red-50 hover:border-red-300 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:border-red-700 dark:hover:text-red-400"
                        title={t('products.delete') || 'Delete product'}
                      >
                        {deletingProductId === product.id ? (
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                        ) : (
                          <TrashBinIcon />
                        )}
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalProducts}
        itemsPerPage={itemsPerPage}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
