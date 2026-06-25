"use client";
import React from "react";
import Image from "next/image";
import { useTranslations } from "@/hooks/useTranslations";
import { TrashBinIcon } from "@/icons/index";

interface CartItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  seller?: string;
}

interface CheckoutReceiptProps {
  items: CartItem[];
  subtotal: number;
  discount: number;
  discountAmount: number;
  total: number;
  onRemoveItem: (id: string) => void;
}

export default function CheckoutReceipt({
  items,
  subtotal,
  discount,
  discountAmount,
  total,
  onRemoveItem,
}: CheckoutReceiptProps) {
  const { t } = useTranslations();
  const currentDate = new Date().toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const formatPrice = (price: number): string => {
    return price.toLocaleString("ru-RU");
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm relative max-w-md mx-auto lg:mx-0">
      <div className="px-6 py-6">
        {/* Logo Placeholder */}
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
            <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
              <span className="text-xl font-bold text-gray-600 dark:text-gray-300">Z</span>
            </div>
          </div>
        </div>

        {/* Store Name - Centered */}
        <div className="mb-2 text-center">
          <h3 className="text-lg font-semibold text-black dark:text-white tracking-tight">
            {t("receipt.storeName") || "Достонхон"}
          </h3>
        </div>

        {/* Date - Centered */}
        <div className="mb-6 text-center text-sm text-black/70 dark:text-white/60 font-normal">
          {currentDate}
        </div>

        {/* Items */}
        {items.length > 0 ? (
          <div className="mb-6 space-y-4">
            {items.map((item) => (
              <div key={item.id} className="group">
                {/* Product Name */}
                <div className="mb-2">
                  <div className="flex items-start justify-between">
                    <h4 className="text-sm font-medium text-black dark:text-white/90 flex-1">
                      {item.name}
                    </h4>
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <TrashBinIcon className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>

                {/* Item with dashed line */}
                <div className="flex items-center mb-2">
                  <span className="text-sm text-black dark:text-white/90 font-medium whitespace-nowrap">
                    {item.quantity} {t("checkout.pieces")}
                  </span>
                  <div className="flex-1 border-t border-dashed border-black/30 dark:border-white/30 mx-3 h-px"></div>
                  <span className="text-sm text-black dark:text-white/90 font-medium whitespace-nowrap">
                    {formatPrice(item.price)} {t("checkout.currency")}
                  </span>
                </div>

                {/* Seller */}
                {item.seller && (
                  <div className="text-xs text-green-600 dark:text-green-400">
                    {item.seller}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="mb-6 text-center text-sm text-gray-500 dark:text-gray-400 py-8">
            {t("checkout.emptyCart")}
          </div>
        )}

        {/* Subtotal */}
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm text-black dark:text-white/90">
            {t("checkout.subtotal")}
          </span>
          <span className="text-sm text-black dark:text-white/90 font-medium">
            {formatPrice(subtotal)} {t("checkout.currency")}
          </span>
        </div>

        {/* Discount */}
        <div className="mb-6 flex items-center justify-between">
          <span className="text-sm text-black dark:text-white/90">
            {t("checkout.discount")}
          </span>
          <span className={`text-sm font-medium ${discount > 0 ? "text-blue-600 dark:text-blue-400" : "text-black dark:text-white/90"}`}>
            {formatPrice(discountAmount)} {t("checkout.currency")}
          </span>
        </div>

        {/* Pay Button */}
        {items.length > 0 && (
          <>
            <button className="w-full bg-brand-500 hover:bg-brand-600 dark:bg-brand-500 dark:hover:bg-brand-600 text-white font-semibold py-3 px-4 rounded-lg mb-2 flex items-center justify-between transition-colors">
              <span>{t("checkout.pay")}</span>
              <span>{formatPrice(total)} {t("checkout.currency")}</span>
            </button>

            {/* Postpone Link */}
            <div className="text-center">
              <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                {t("checkout.postpone")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

