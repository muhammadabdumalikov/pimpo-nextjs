"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Image from "next/image";
import { useTranslations } from "@/hooks/useTranslations";

// Define the TypeScript interface for the table rows
interface ProductV2 {
  id: number;
  name: string;
  priceIn: string;
  priceOut: string;
  profit: string;
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
    profit: "$399",
    quantity: 0,
    image: "/images/product/product-01.jpg",
  },
  {
    id: 2,
    name: "Airpods Pro 2nd Gen",
    priceIn: "$650",
    priceOut: "$839",
    profit: "$189",
    quantity: 45,
    image: "/images/product/product-02.jpg",
  },
  {
    id: 3,
    name: "Apple Watch Ultra",
    priceIn: "$1,200",
    priceOut: "$1,579",
    profit: "$379",
    quantity: 0,
    image: "/images/product/product-03.jpg",
  },
  {
    id: 4,
    name: "Bose QuietComfort Earbuds",
    priceIn: "$200",
    priceOut: "$279",
    profit: "$79",
    quantity: 120,
    image: "/images/product/product-04.jpg",
  },
  {
    id: 5,
    name: "Canon EOS R5 Camera",
    priceIn: "$3,200",
    priceOut: "$3,899",
    profit: "$699",
    quantity: 8,
    image: "/images/product/product-05.jpg",
  },
];

export default function RecentProductsV2() {
  const { t } = useTranslations();
  // Sort products by quantity in descending order
  const sortedProducts = [...tableData].sort((a, b) => a.quantity - b.quantity);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {t('dashboardV2.recentProducts')}
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            {t('dashboardV2.recentProductsDescription')}
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
                {t('productsV2.products')}
              </TableCell>
              <TableCell
                isHeader
                className="py-3 px-4 sm:px-6 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                {t('productsV2.priceIn')}
              </TableCell>
              <TableCell
                isHeader
                className="py-3 px-4 sm:px-6 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                {t('productsV2.priceOut')}
              </TableCell>
              <TableCell
                isHeader
                className="py-3 px-4 sm:px-6 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                {t('productsV2.profit')}
              </TableCell>
              <TableCell
                isHeader
                className="py-3 px-4 sm:px-6 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                {t('productsV2.quantity')}
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {sortedProducts.map((product) => (
              <TableRow
                key={product.id}
                className="transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-white/[0.02]"
              >
                <TableCell className="py-3 px-4 sm:px-6">
                  <div className="flex items-center gap-3">
                    <div className="h-[40px] w-[40px] overflow-hidden rounded-md">
                      <Image
                        width={40}
                        height={40}
                        src={product.image}
                        className="h-[40px] w-[40px] object-cover"
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
                <TableCell className="py-3 px-4 sm:px-6 text-gray-500 text-theme-sm dark:text-gray-400">
                  {product.priceIn}
                </TableCell>
                <TableCell className="py-3 px-4 sm:px-6 text-gray-500 text-theme-sm dark:text-gray-400">
                  {product.priceOut}
                </TableCell>
                <TableCell className="py-3 px-4 sm:px-6">
                  <span className="text-success-600 text-theme-sm font-medium dark:text-success-500">
                    {product.profit}
                  </span>
                </TableCell>
                <TableCell className="py-3 px-4 sm:px-6 text-gray-500 text-theme-sm dark:text-gray-400">
                  {product.quantity}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
