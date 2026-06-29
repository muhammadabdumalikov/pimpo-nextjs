"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import { formatPhone } from "@/lib/phone";
import {
  getProducts,
  createOrder,
  getReceiptSettings,
  searchCustomers,
  type Product,
  type Customer,
} from "@/lib/api";
import CameraScanner from "./CameraScanner";
import SelectField from "../form/SelectField";

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

  const [cart, setCart] = useState<CartLine[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [qty, setQty] = useState(1);
  // Picker dropdown is loaded lazily by its own query (on open / search) — the
  // catalog is no longer preloaded on page open.
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const [scanValue, setScanValue] = useState("");
  const [lastScanned, setLastScanned] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "split" | "debt">("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [splitCash, setSplitCash] = useState("");
  const [splitCard, setSplitCard] = useState("");
  const [phone, setPhone] = useState("");
  const [dueDate, setDueDate] = useState(""); // optional
  // Optional down payment on a debt sale: pay some now, owe the rest.
  const [paidNow, setPaidNow] = useState("");
  const [paidNowMethod, setPaidNowMethod] = useState<"cash" | "card">("cash");
  // Customer search (clients history) for debt sales. The Client field doubles
  // as the search box: typing searches history; picking a result locks it in.
  const [customerUserId, setCustomerUserId] = useState<string | null>(null);
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [customerFocused, setCustomerFocused] = useState(false);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [vatEnabled, setVatEnabled] = useState(false);
  const [vatRate, setVatRate] = useState(0);
  const scanRef = useRef<HTMLInputElement>(null);
  const scanDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currency = t("checkout.currency") || "so'm";

  // Picker dropdown query — runs on open (empty term → first page) and on each
  // debounced search keystroke. Separate from the scanner; nothing on page open.
  const handleProductSearch = useCallback(
    async (q: string) => {
      setProductSearchLoading(true);
      try {
        const res = await getProducts(1, 20, q.trim() || undefined);
        setProductResults(res.products.filter((p) => p.isActive));
      } catch (err: unknown) {
        showToast("error", (err as Error)?.message || "Failed to load products", "Error");
        setProductResults([]);
      } finally {
        setProductSearchLoading(false);
      }
    },
    [showToast],
  );

  // Clear any pending scan lookup on unmount.
  useEffect(() => () => {
    if (scanDebounceRef.current) clearTimeout(scanDebounceRef.current);
  }, []);

  // Load the business VAT (QQS) config so the summary can break out the tax.
  useEffect(() => {
    let active = true;
    getReceiptSettings()
      .then((s) => {
        if (!active) return;
        setVatEnabled(s.vatEnabled);
        setVatRate(Number(s.vatRate) || 0);
      })
      .catch(() => {
        /* non-fatal: just hide the VAT line */
      });
    return () => {
      active = false;
    };
  }, []);

  // Debounced client search (from clients history) for debt sales. The Client
  // name field is the query; skip once a client is locked in.
  useEffect(() => {
    const q = customerName.trim();
    if (paymentMethod !== "debt" || customerUserId !== null || q === "") {
      setCustomerResults([]);
      return;
    }
    let active = true;
    const id = setTimeout(() => {
      searchCustomers(q, 6)
        .then((r) => {
          if (active) setCustomerResults(r);
        })
        .catch(() => {
          /* non-fatal */
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(id);
    };
  }, [customerName, customerUserId, paymentMethod]);

  const selectCustomer = (c: Customer) => {
    setCustomerName(c.name);
    setPhone(formatPhone(c.phone));
    setCustomerUserId(c.id);
    setCustomerResults([]);
    setCustomerFocused(false);
  };

  const clearCustomer = () => {
    setCustomerName("");
    setPhone("");
    setCustomerUserId(null);
    setCustomerResults([]);
  };

  // Keep the scan box focused so a handheld scanner (keyboard-wedge) always
  // lands its keystrokes here.
  useEffect(() => {
    scanRef.current?.focus();
  }, []);

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

  // Cash quick-amount chips: the exact total plus the next round UZS amounts up.
  const cashChips = useMemo(() => {
    if (total <= 0) return [];
    const roundUp = (step: number) => Math.ceil(total / step) * step;
    const candidates = [total, roundUp(5000), roundUp(10000), roundUp(50000), roundUp(100000)];
    return Array.from(new Set(candidates))
      .filter((v) => v >= total)
      .slice(0, 4);
  }, [total]);

  // VAT (QQS) is inclusive — the tax portion of the total, shown for info.
  const vatAmount =
    vatEnabled && vatRate > 0 ? (total * vatRate) / (100 + vatRate) : 0;

  // Payment math derived from the chosen method.
  const cashNum = Number(cashReceived) || 0;
  const splitCashNum = Number(splitCash) || 0;
  const splitCardNum = Number(splitCard) || 0;
  const received = paymentMethod === "cash" && cashReceived !== "" ? cashNum : total;
  const change = paymentMethod === "cash" ? Math.max(0, received - total) : 0;
  const splitRemaining = total - (splitCashNum + splitCardNum);

  // Debt: optional down payment paid now, the rest is owed.
  const paidNowNum = Number(paidNow) || 0;
  const debtRemaining = total - paidNowNum;

  const paymentValid =
    paymentMethod === "card" ||
    (paymentMethod === "cash" && (cashReceived === "" || cashNum >= total)) ||
    (paymentMethod === "split" &&
      splitCashNum + splitCardNum > 0 &&
      Math.abs(splitRemaining) < 1) ||
    (paymentMethod === "debt" &&
      customerName.trim() !== "" &&
      phone.trim() !== "" &&
      paidNowNum >= 0 &&
      debtRemaining > 0);

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
    const product = productResults.find((p) => p.id === selectedId);
    if (!product) return;
    addProductToCart(product, Math.max(1, qty));
    setSelectedId("");
    setQty(1);
  };

  // Resolve + add a scanned/typed/camera code via the backend (exact barcode or
  // code match). Shared by the keyboard-wedge input and the camera scanner.
  // `silent` suppresses the not-found toast for debounced mid-typing lookups.
  // Stable identity (useCallback) so the camera effect doesn't restart on every
  // keystroke.
  const resolveCode = useCallback(
    async (raw: string, opts?: { silent?: boolean }) => {
      const term = raw.trim();
      if (!term) return;
      try {
        const res = await getProducts(1, 5, term);
        const lc = term.toLowerCase();
        const product = res.products.find(
          (p) =>
            (p.barcode ?? "").toLowerCase() === lc ||
            (p.code ?? "").toLowerCase() === lc,
        );

        if (!product) {
          if (!opts?.silent) {
            setLastScanned("");
            setScanValue("");
            showToast(
              "error",
              `${t("checkout.scanNotFound") || "No product for code"}: ${term}`,
            );
          }
          return;
        }
        if (product.quantity <= 0) {
          setLastScanned("");
          setScanValue("");
          showToast("warning", `${product.name} — ${t("checkout.outOfStock")}`);
          return;
        }
        addProductToCart(product, 1);
        setLastScanned(product.name);
        setScanValue("");
      } catch (err: unknown) {
        if (!opts?.silent) {
          showToast("error", (err as Error)?.message || "Failed to look up product", "Error");
        }
      }
    },
    [showToast, t],
  );

  // Debounce the request while the scanner streams characters (no Enter needed);
  // mid-typing misses stay silent so we don't toast on every partial code.
  const handleScanInput = (val: string) => {
    setScanValue(val);
    if (scanDebounceRef.current) clearTimeout(scanDebounceRef.current);
    if (!val.trim()) return;
    scanDebounceRef.current = setTimeout(() => resolveCode(val, { silent: true }), 300);
  };

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (scanDebounceRef.current) clearTimeout(scanDebounceRef.current);
    const raw = scanValue;
    scanRef.current?.focus();
    resolveCode(raw); // explicit submit — surface not-found
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
    if (cart.length === 0 || !paymentValid) return;
    setIsSubmitting(true);

    // Build the payment breakdown + cash tendered for the chosen method.
    let payments: { method: string; amount: number }[];
    let amountPaid: number;
    if (paymentMethod === "debt") {
      // A down payment (if any) is paid now; the remainder becomes the debt.
      payments = paidNowNum > 0 ? [{ method: paidNowMethod, amount: paidNowNum }] : [];
      amountPaid = paidNowMethod === "cash" ? paidNowNum : 0;
    } else if (paymentMethod === "split") {
      payments = [
        { method: "cash", amount: splitCashNum },
        { method: "card", amount: splitCardNum },
      ].filter((p) => p.amount > 0);
      amountPaid = splitCashNum;
    } else if (paymentMethod === "card") {
      payments = [{ method: "card", amount: total }];
      amountPaid = total;
    } else {
      payments = [{ method: "cash", amount: total }];
      amountPaid = received;
    }

    try {
      await createOrder({
        items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        customerName: customerName.trim() || undefined,
        userId: paymentMethod === "debt" ? customerUserId ?? undefined : undefined,
        paymentMethod,
        payments,
        amountPaid,
        phone: paymentMethod === "debt" ? phone.trim() : undefined,
        dueDate: paymentMethod === "debt" && dueDate ? dueDate : undefined,
        note: note.trim() || undefined,
        status: "Completed",
        source: "admin",
      });
      const successMsg =
        paymentMethod === "debt"
          ? `${t("checkout.debtSold") || "Sold on credit"} — ${
              t("checkout.debtRemaining") || "Debt"
            }: ${formatMoney(debtRemaining)}`
          : `${t("checkout.orderSuccess") || "Order completed"}${
              change > 0 ? ` — ${t("checkout.change") || "Change"}: ${formatMoney(change)}` : ""
            }`;
      showToast("success", successMsg, "Success");
      setCart([]);
      setCustomerName("");
      setNote("");
      setLastScanned("");
      setCashReceived("");
      setSplitCash("");
      setSplitCard("");
      setPhone("");
      setDueDate("");
      setPaidNow("");
      setPaidNowMethod("cash");
      setCustomerUserId(null);
      setCustomerResults([]);
      setCustomerFocused(false);
      setPaymentMethod("cash");
      scanRef.current?.focus();
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
          onDetected={resolveCode}
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
                onChange={(e) => handleScanInput(e.target.value)}
                autoComplete="off"
                placeholder={t("checkout.scanPlaceholder") || "Scan or type a barcode, then Enter"}
                className={`${inputClass} pl-11`}
              />
            </div>
            <button
              type="submit"
              disabled={!scanValue.trim()}
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
              <SelectField
                value={selectedId}
                onChange={setSelectedId}
                onSearch={handleProductSearch}
                loading={productSearchLoading}
                searchPlaceholder={t("checkout.searchProduct") || "Search product..."}
                placeholder={t("checkout.selectProduct")}
                options={productResults.map((p) => ({
                  value: p.id,
                  label: `${p.name} — ${formatMoney(Number(p.priceOut))} (${p.quantity} ${t("checkout.inStock")})`,
                  disabled: p.quantity <= 0,
                }))}
              />
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
          {/* For a debt sale the customer is captured in the payment panel. */}
          {paymentMethod !== "debt" && (
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
          )}
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
            {vatEnabled && vatRate > 0 && (
              <li className="flex justify-between gap-5">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {(t("checkout.vatIncluded") || "incl. VAT {percent}%").replace(
                    "{percent}",
                    String(vatRate),
                  )}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatMoney(vatAmount)}
                </span>
              </li>
            )}
          </ul>

          {/* Payment method selector */}
          <div className="mt-4">
            <label className="mb-1.5 inline-block text-sm font-semibold text-gray-700 dark:text-gray-400">
              {t("checkout.paymentMethod")}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["cash", "card", "split", "debt"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMethod(m)}
                  className={`h-10 rounded-lg border text-sm font-medium transition ${
                    paymentMethod === m
                      ? "border-brand-500 bg-brand-500 text-white"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                  }`}
                >
                  {t(`checkout.${m}`) || m}
                </button>
              ))}
            </div>
          </div>

          {/* Cash: amount received + change */}
          {paymentMethod === "cash" && (
            <div className="mt-4 space-y-2">
              <label className="inline-block text-sm font-semibold text-gray-700 dark:text-gray-400">
                {t("checkout.received") || "Cash received"}
              </label>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                placeholder={formatMoney(total)}
                className={inputClass}
              />
              {cashChips.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {cashChips.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCashReceived(String(c))}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                    >
                      {formatMoney(c)}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-400">
                  {t("checkout.change") || "Change"}
                </span>
                <span className="text-base font-semibold text-success-600 dark:text-success-500">
                  {formatMoney(change)}
                </span>
              </div>
              {cashReceived !== "" && cashNum < total && (
                <p className="text-xs text-error-500">
                  {t("checkout.underpaid") || "Amount is less than the total"}
                </p>
              )}
            </div>
          )}

          {/* Split: cash + card amounts that must sum to the total */}
          {paymentMethod === "split" && (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 inline-block text-xs font-semibold text-gray-700 dark:text-gray-400">
                    {t("checkout.cash")}
                  </label>
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={splitCash}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSplitCash(v);
                      // Auto-fill the card side with whatever is left on the total.
                      const left = total - (Number(v) || 0);
                      setSplitCard(left > 0 ? String(left) : "0");
                    }}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 inline-block text-xs font-semibold text-gray-700 dark:text-gray-400">
                    {t("checkout.card")}
                  </label>
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={splitCard}
                    onChange={(e) => setSplitCard(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-400">
                  {t("checkout.remaining") || "Remaining"}
                </span>
                <span
                  className={`text-base font-semibold ${
                    Math.abs(splitRemaining) < 1
                      ? "text-success-600 dark:text-success-500"
                      : "text-error-500"
                  }`}
                >
                  {formatMoney(splitRemaining)}
                </span>
              </div>
            </div>
          )}

          {/* Debt: sell on credit — pick a client from history or add a new one */}
          {paymentMethod === "debt" && (
            <div className="mt-4 space-y-3">
              {customerUserId ? (
                /* Locked-in client picked from history */
                <div className="flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2.5 dark:border-brand-500/30 dark:bg-brand-500/10">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-semibold text-white">
                    {customerName.trim().charAt(0).toUpperCase() || "?"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                      {customerName}
                    </p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">{phone}</p>
                  </div>
                  <button
                    type="button"
                    onClick={clearCustomer}
                    className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-gray-500 transition hover:bg-white hover:text-gray-700 dark:hover:bg-white/[0.06] dark:hover:text-gray-200"
                  >
                    {t("checkout.changeClient") || "Change"}
                  </button>
                </div>
              ) : (
                <>
                  {/* Client name doubles as the history search box */}
                  <div className="relative">
                    <label className="mb-1 inline-block text-xs font-semibold text-gray-700 dark:text-gray-400">
                      {t("checkout.client")}
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                          <path d="M9 3.5a5.5 5.5 0 1 0 3.5 9.74l3.38 3.38a.75.75 0 1 0 1.06-1.06l-3.38-3.38A5.5 5.5 0 0 0 9 3.5Zm-4 5.5a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z" fill="currentColor" />
                        </svg>
                      </span>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => {
                          setCustomerName(e.target.value);
                          setCustomerUserId(null);
                        }}
                        onFocus={() => setCustomerFocused(true)}
                        onBlur={() => setTimeout(() => setCustomerFocused(false), 150)}
                        placeholder={t("checkout.searchClientPlaceholder") || "Name or phone"}
                        className={`${inputClass} pl-10`}
                        autoComplete="off"
                      />
                    </div>
                    {customerFocused &&
                      customerName.trim() !== "" &&
                      customerResults.length > 0 && (
                        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-theme-lg dark:border-gray-700 dark:bg-gray-900">
                          {customerResults.map((c) => (
                            <li key={c.id}>
                              <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => selectCustomer(c)}
                                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                              >
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600 dark:bg-white/[0.06] dark:text-gray-300">
                                  {c.name.charAt(0).toUpperCase()}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-medium text-gray-800 dark:text-white/90">
                                    {c.name}
                                  </span>
                                  <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                                    {formatPhone(c.phone)}
                                  </span>
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                  </div>

                  {/* Phone — for a new client (or to confirm) */}
                  <div>
                    <label className="mb-1 inline-block text-xs font-semibold text-gray-700 dark:text-gray-400">
                      {t("checkout.phone") || "Phone"}
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      placeholder={t("checkout.phonePlaceholder") || "+998 ..."}
                      className={inputClass}
                    />
                  </div>
                </>
              )}

              {/* Optional down payment — pay part now, owe the rest */}
              <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900/40">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-400">
                    {t("checkout.paidNow") || "Paid now"}{" "}
                    <span className="font-normal text-gray-400">
                      ({t("checkout.optional") || "optional"})
                    </span>
                  </label>
                  <div className="flex gap-1">
                    {(["cash", "card"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPaidNowMethod(m)}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                          paidNowMethod === m
                            ? "bg-brand-500 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/[0.06] dark:text-gray-300 dark:hover:bg-white/[0.1]"
                        }`}
                      >
                        {t(`checkout.${m}`) || m}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="number"
                  min={0}
                  max={total}
                  inputMode="numeric"
                  value={paidNow}
                  onChange={(e) => setPaidNow(e.target.value)}
                  placeholder="0"
                  className={inputClass}
                />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-400">
                    {t("checkout.debtRemaining") || "Debt (remaining)"}
                  </span>
                  <span
                    className={`text-base font-semibold ${
                      debtRemaining > 0 && paidNowNum <= total
                        ? "text-warning-600 dark:text-warning-400"
                        : "text-error-500"
                    }`}
                  >
                    {formatMoney(Math.max(0, debtRemaining))}
                  </span>
                </div>
                {paidNowNum > total && (
                  <p className="mt-1 text-xs text-error-500">
                    {t("checkout.paidExceedsTotal") || "Paid amount exceeds the total"}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 inline-block text-xs font-semibold text-gray-700 dark:text-gray-400">
                  {t("checkout.dueDate") || "Due date"}{" "}
                  <span className="font-normal text-gray-400">
                    ({t("checkout.optional") || "optional"})
                  </span>
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={inputClass}
                />
              </div>

              <p className="flex items-start gap-2 rounded-lg bg-warning-50 px-3 py-2 text-xs text-warning-700 dark:bg-warning-500/10 dark:text-warning-400">
                <span className="text-sm leading-none">ⓘ</span>
                <span>
                  {t("checkout.debtHintPartial") ||
                    "The remaining amount will be recorded as the customer's debt for this order."}
                </span>
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={handleComplete}
            disabled={cart.length === 0 || isSubmitting || !paymentValid}
            className="mt-5 h-12 w-full rounded-lg bg-brand-500 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting
              ? t("checkout.completing")
              : paymentMethod === "debt"
                ? t("checkout.sellOnCredit") || "Sell on credit"
                : t("checkout.completeSale")}
          </button>
        </div>
      </div>
    </div>
  );
}
