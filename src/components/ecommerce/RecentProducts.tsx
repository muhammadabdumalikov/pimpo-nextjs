"use client";
import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Image from "next/image";
import { useTranslations } from "@/hooks/useTranslations";
import { getProducts, type Product } from "@/lib/api";

const formatSum = (value: number) =>
  `${new Intl.NumberFormat("uz-UZ").format(Math.round(value))} so'm`;

export default function RecentProducts() {
  const { t } = useTranslations();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        // Most recently added products (API returns newest first).
        const res = await getProducts(1, 5);
        if (active) setProducts(res.products);
      } catch {
        if (active) setProducts([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("dashboard.recentProducts")}
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            {t("dashboard.recentProductsDescription")}
          </p>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <Table className="w-full">
          <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
            <TableRow>
              <TableCell
                isHeader
                className="py-3 px-4 sm:px-6 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                {t("products.products")}
              </TableCell>
              <TableCell
                isHeader
                className="py-3 px-4 sm:px-6 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                {t("products.priceIn")}
              </TableCell>
              <TableCell
                isHeader
                className="py-3 px-4 sm:px-6 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                {t("products.priceOut")}
              </TableCell>
              <TableCell
                isHeader
                className="py-3 px-4 sm:px-6 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                {t("products.profit")}
              </TableCell>
              <TableCell
                isHeader
                className="py-3 px-4 sm:px-6 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                {t("products.quantity")}
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <TableRow>
                <TableCell className="py-6 px-4 sm:px-6 text-center text-gray-400 text-theme-sm">
                  {t("common.loading")}
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell className="py-6 px-4 sm:px-6 text-center text-gray-400 text-theme-sm">
                  {t("products.noProducts")}
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => {
                const priceIn = Number(product.priceIn) || 0;
                const priceOut = Number(product.priceOut) || 0;
                // Total profit held in stock: unit margin × quantity on hand.
                const profit = (priceOut - priceIn) * product.quantity;
                return (
                  <TableRow
                    key={product.id}
                    className="transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                  >
                    <TableCell className="py-3 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-[40px] w-[40px] flex-none items-center justify-center overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800">
                          {product.image ? (
                            <Image
                              width={40}
                              height={40}
                              src={product.image}
                              className="h-[40px] w-[40px] object-cover"
                              alt={product.name}
                            />
                          ) : (
                            <span className="text-sm font-semibold text-gray-400">
                              {product.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                            {product.name}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-4 sm:px-6 text-gray-500 text-theme-sm dark:text-gray-400">
                      {formatSum(priceIn)}
                    </TableCell>
                    <TableCell className="py-3 px-4 sm:px-6 text-gray-500 text-theme-sm dark:text-gray-400">
                      {formatSum(priceOut)}
                    </TableCell>
                    <TableCell className="py-3 px-4 sm:px-6">
                      <span className="text-success-600 text-theme-sm font-medium dark:text-success-500">
                        {formatSum(profit)}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4 sm:px-6 text-gray-500 text-theme-sm dark:text-gray-400">
                      {product.quantity}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
