"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import {
  getProducts,
  createOrder,
  type Product,
} from "@/lib/api";
import CameraScanner from "./CameraScanner";

type CartLine = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
};

const DeleteIcon = () => (
  <svg
    className="cursor-pointer fill-gray-700 hover:fill-error-500 dark:fill-gray-400 dark:hover:fill-error-500"
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M6.54142 3.7915C6.54142 2.54886 7.54878 1.5415 8.79142 1.5415H11.2081C12.4507 1.5415 13.4581 2.54886 13.4581 3.7915V4.0415H15.6252H16.666C17.0802 4.0415 17.416 4.37729 17.416 4.7915C17.416 5.20572 17.0802 5.5415 16.666 5.5415H16.3752V8.24638V13.2464V16.2082C16.3752 17.4508 15.3678 18.4582 14.1252 18.4582H5.87516C4.63252 18.4582 3.62516 17.4508 3.62516 16.2082V13.2464V8.24638V5.5415H3.3335C2.91928 5.5415 2.5835 5.20572 2.5835 4.7915C2.5835 4.37729 2.91928 4.0415 3.3335 4.0415H4.37516H6.54142V3.7915ZM14.8752 13.2464V8.24638V5.5415H5.12516V8.24638V13.2464V16.2082C5.12516 16.6224 5.46095 16.9582 5.87516 16.9582H14.1252C14.5394 16.9582 14.8752 16.6224 14.8752 16.2082V13.2464ZM8.04142 4.0415H11.9581V3.7915C11.9581 3.37729 11.6223 3.0415 11.2081 3.0415H8.79142C8.37721 3.0415 8.04142 3.37729 8.04142 3.7915V4.0415Z"
      fill=""
    />
  </svg>
);

export default function Checkout() {
  const { t } = useTranslations();
  const { showToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [qty, setQty] = useState(1);
  const [scanValue, setScanValue] = useState("");
  const [lastScanned, setLastScanned] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const scanRef = useRef<HTMLInputElement>(null);

  const currency = t("checkout.currency") || "so'm";

  const loadProducts = async () => {
    try {
      setIsLoadingProducts(true);
      const res = await getProducts(1, 1000);
      setProducts(res.products.filter((p) => p.isActive));
    } catch (err: unknown) {
      showToast("error", (err as Error)?.message || "Failed to load products", "Error");
    } finally {
      setIsLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Keep the scan box focused so a handheld scanner (keyboard-wedge) always
  // lands its keystrokes here, even after products finish loading.
  useEffect(() => {
    if (!isLoadingProducts) scanRef.current?.focus();
  }, [isLoadingProducts]);

  const formatMoney = (value: number) =>
    `${new Intl.NumberFormat("uz-UZ").format(Math.round(value))} ${currency}`;

  const total = useMemo(
    () => cart.reduce((sum, line) => sum + line.price * line.quantity, 0),
    [cart],
  );
  const itemCount = useMemo(
    () => cart.reduce((sum, line) => sum + line.quantity, 0),
    [cart],
  );

  const addProductToCart = (product: Product, addQty: number) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        const capped = Math.min(existing.quantity + addQty, product.quantity);
        return prev.map((l) =>
          l.productId === product.id ? { ...l, quantity: Math.max(1, capped) } : l,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: Number(product.priceOut),
          quantity: Math.min(addQty, product.quantity || addQty),
          stock: product.quantity,
        },
      ];
    });
  };

  const addToCart = () => {
    const product = products.find((p) => p.id === selectedId);
    if (!product) return;
    addProductToCart(product, Math.max(1, qty));
    setSelectedId("");
    setQty(1);
  };

  // Resolve + add a scanned/typed/camera code. Matches barcode first, then the
  // internal code. Shared by the keyboard-wedge input and the camera scanner.
  // Stable identity (useCallback) so the camera effect doesn't restart on every
  // keystroke.
  const processCode = useCallback(
    (raw: string) => {
      const q = raw.trim().toLowerCase();
      if (!q) return;
      const product =
        products.find((p) => (p.barcode ?? "").toLowerCase() === q) ??
        products.find((p) => (p.code ?? "").toLowerCase() === q);

      if (!product) {
        setLastScanned("");
        showToast(
          "error",
          `${t("checkout.scanNotFound") || "No product for code"}: ${raw.trim()}`,
        );
        return;
      }
      if (product.quantity <= 0) {
        setLastScanned("");
        showToast("warning", `${product.name} — ${t("checkout.outOfStock")}`);
        return;
      }
      addProductToCart(product, 1);
      setLastScanned(product.name);
    },
    [products, showToast, t],
  );

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = scanValue;
    setScanValue("");
    scanRef.current?.focus();
    processCode(raw);
  };

  const changeQty = (productId: string, next: number) => {
    setCart((prev) =>
      prev.map((l) =>
        l.productId === productId
          ? { ...l, quantity: Math.max(1, Math.min(next, l.stock || next)) }
          : l,
      ),
    );
  };

  const removeLine = (productId: string) => {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  };

  const handleComplete = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    try {
      await createOrder({
        items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        customerName: customerName.trim() || undefined,
        paymentMethod,
        note: note.trim() || undefined,
        status: "Completed",
        source: "admin",
      });
      showToast("success", t("checkout.orderSuccess") || "Order completed", "Success");
      setCart([]);
      setCustomerName("");
      setNote("");
      setLastScanned("");
      scanRef.current?.focus();
      // Refresh stock numbers after the sale.
      loadProducts();
    } catch (err: unknown) {
      showToast("error", (err as Error)?.message || t("checkout.orderError") || "Failed", "Error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 shadow-theme-xs focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

  return (
    <div className="border-b border-gray-200 p-4 sm:p-8 dark:border-gray-800">
      {/* Scan area — camera is the primary, most-used action; the manual /
          hardware-scanner input sits underneath as a secondary entry point. */}
      <div className="mb-5 space-y-3">
        <button
          type="button"
          onClick={() => setCameraOpen((o) => !o)}
          disabled={isLoadingProducts}
          className={`flex h-16 w-full items-center justify-center gap-3 rounded-2xl text-base font-semibold shadow-theme-md transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${
            cameraOpen
              ? "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-white/[0.03]"
              : "bg-brand-500 text-white hover:bg-brand-600"
          }`}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 0 1 2-2h1l1.5-2h9L18 7h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
          {cameraOpen
            ? t("checkout.cameraStop") || "Stop camera"
            : t("checkout.cameraTitle") || "Scan with camera"}
        </button>

        <CameraScanner
          isOpen={cameraOpen}
          onClose={() => {
            setCameraOpen(false);
            scanRef.current?.focus();
          }}
          onDetected={processCode}
          lastScanned={lastScanned}
        />

        <form onSubmit={handleScan}>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" d="M3 5v14M7 5v14M11 5v14M15 5v14M19 5v14M21 5v14" />
                </svg>
              </span>
              <input
                ref={scanRef}
                type="text"
                value={scanValue}
                onChange={(e) => setScanValue(e.target.value)}
                disabled={isLoadingProducts}
                autoComplete="off"
                placeholder={
                  isLoadingProducts
                    ? "..."
                    : t("checkout.scanPlaceholder") || "Scan or type a barcode, then Enter"
                }
                className={`${inputClass} pl-11`}
              />
            </div>
            <button
              type="submit"
              disabled={isLoadingProducts || !scanValue.trim()}
              className="h-11 shrink-0 rounded-lg border border-gray-300 bg-white px-5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              {t("checkout.add")}
            </button>
          </div>
        </form>

        {lastScanned && !cameraOpen && (
          <p className="text-sm text-success-600 dark:text-success-500">
            ✓ {t("checkout.scanAdded") || "Added"}: {lastScanned}
          </p>
        )}
      </div>

      {/* Cart table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
        <div className="custom-scrollbar overflow-x-auto">
          <table className="min-w-full text-left text-sm text-gray-700 dark:border-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr className="border-b border-gray-100 whitespace-nowrap dark:border-gray-800">
                <th className="px-5 py-4 text-sm font-medium text-gray-700 dark:text-gray-400">{t("checkout.table.serial")}</th>
                <th className="px-5 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">{t("checkout.table.products")}</th>
                <th className="px-5 py-4 text-sm font-medium text-gray-700 dark:text-gray-400">{t("checkout.table.quantity")}</th>
                <th className="px-5 py-4 text-sm font-medium text-gray-700 dark:text-gray-400">{t("checkout.table.unitCost")}</th>
                <th className="px-5 py-4 text-sm font-medium text-gray-700 dark:text-gray-400">{t("checkout.table.total")}</th>
                <th className="relative px-5 py-4 text-sm font-medium text-gray-700 dark:text-gray-400">
                  <span className="sr-only">{t("checkout.table.actions")}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-white/[0.03]">
              {cart.map((line, idx) => (
                <tr key={line.productId}>
                  <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{idx + 1}</td>
                  <td className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-white/90">{line.name}</td>
                  <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                    <input
                      type="number"
                      min={1}
                      max={line.stock || undefined}
                      value={line.quantity}
                      onChange={(e) => changeQty(line.productId, Number(e.target.value))}
                      className="h-9 w-20 rounded-lg border border-gray-300 bg-white px-2 text-center text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                    />
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{formatMoney(line.price)}</td>
                  <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{formatMoney(line.price * line.quantity)}</td>
                  <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                    <div
                      className="flex items-center justify-center"
                      role="button"
                      tabIndex={0}
                      onClick={() => removeLine(line.productId)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") removeLine(line.productId);
                      }}
                    >
                      <DeleteIcon />
                    </div>
                  </td>
                </tr>
              ))}
              {cart.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                    {t("checkout.emptyCart")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add product row */}
      <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-4 sm:p-6 dark:border-gray-800 dark:bg-gray-900">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addToCart();
          }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
            <div className="w-full lg:col-span-7">
              <label className="mb-1 inline-block text-sm font-semibold text-gray-700 dark:text-gray-400">
                {t("checkout.table.products")}
              </label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                disabled={isLoadingProducts}
                className={`${inputClass} appearance-none`}
                required
              >
                <option value="" disabled>
                  {isLoadingProducts ? "..." : t("checkout.selectProduct")}
                </option>
                {products.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.quantity <= 0}>
                    {p.name} — {formatMoney(Number(p.priceOut))} ({p.quantity} {t("checkout.inStock")})
                  </option>
                ))}
              </select>
            </div>
            <div className="w-full lg:col-span-3">
              <label className="mb-1 inline-block text-sm font-semibold text-gray-700 dark:text-gray-400">
                {t("checkout.form.quantityLabel")}
              </label>
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                className={inputClass}
              />
            </div>
            <div className="flex w-full items-end lg:col-span-2">
              <button
                type="submit"
                disabled={!selectedId}
                className="h-11 w-full rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("checkout.add")}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Customer + payment + summary */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="mb-1 inline-block text-sm font-semibold text-gray-700 dark:text-gray-400">
              {t("checkout.client")}
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={t("checkout.clientPlaceholder")}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 inline-block text-sm font-semibold text-gray-700 dark:text-gray-400">
              {t("checkout.paymentMethod")}
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className={`${inputClass} appearance-none`}
            >
              <option value="cash">{t("checkout.cash")}</option>
              <option value="card">{t("checkout.card")}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 inline-block text-sm font-semibold text-gray-700 dark:text-gray-400">
              {t("checkout.note")}
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("checkout.notePlaceholder")}
              className={inputClass}
            />
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900">
          <p className="mb-4 text-sm font-medium text-gray-800 dark:text-white/90">
            {t("checkout.summary.title")}
          </p>
          <ul className="space-y-2">
            <li className="flex justify-between gap-5">
              <span className="text-sm text-gray-500 dark:text-gray-400">{t("checkout.table.quantity")}</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-400">
                {itemCount} {t("checkout.pieces")}
              </span>
            </li>
            <li className="flex items-center justify-between border-t border-gray-200 pt-2 dark:border-gray-800">
              <span className="font-medium text-gray-700 dark:text-gray-400">{t("checkout.total")}</span>
              <span className="text-lg font-semibold text-gray-800 dark:text-white/90">{formatMoney(total)}</span>
            </li>
          </ul>
          <button
            type="button"
            onClick={handleComplete}
            disabled={cart.length === 0 || isSubmitting}
            className="mt-5 h-12 w-full rounded-lg bg-brand-500 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? t("checkout.completing") : t("checkout.completeSale")}
          </button>
        </div>
      </div>
    </div>
  );
}
