"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import { formatPhone } from "@/lib/phone";
import {
  getProducts,
  createOrder,
  searchCustomers,
  type Product,
  type Customer,
} from "@/lib/api";
import CameraScanner from "./CameraScanner";

// Static VAT (QQS) config for now. Flip VAT_ENABLED to false to hide the line.
// TODO: wire back to the business's receipt settings API.
const VAT_ENABLED = true;
const VAT_RATE = 12;

type CartLine = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
  image: string | null;
};

const DeleteIcon = () => (
  <svg
    className="fill-gray-400 transition group-hover:fill-error-500"
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

/** Product thumbnail with a graceful placeholder when there's no image. */
function ProductThumb({
  src,
  alt,
  size = 44,
}: {
  src: string | null;
  alt: string;
  size?: number;
}) {
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800"
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image
          width={size}
          height={size}
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
        />
      ) : (
        <svg
          className="h-1/2 w-1/2 text-gray-400 dark:text-gray-500"
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
  );
}

export default function Checkout() {
  const { t } = useTranslations();
  const { showToast } = useToast();

  const [cart, setCart] = useState<CartLine[]>([]);

  // Unified product entry: one box that searches by name/barcode/SKU, doubles as
  // the hardware-scanner target (auto-focused), and shows a click-to-add result
  // list. Exact barcode/code matches auto-add (so keyboard-wedge scanners that
  // don't send Enter still work). The camera is a secondary entry point.
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [lastScanned, setLastScanned] = useState("");
  // Keyboard-driven selection: the highlighted cart row that ↑/↓ moves and
  // ←/→ adjusts the quantity of. Tracked by productId so it survives reordering.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Cmd+Enter (Mac) vs Ctrl+Enter (others) — resolved after mount to avoid a
  // hydration mismatch.
  const [isMac, setIsMac] = useState(false);

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
  // Advanced options (Split/Credit, client, note) stay tucked away so the common
  // cash sale is one tap. Selecting Credit forces them open.
  const [showMore, setShowMore] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const vatEnabled = VAT_ENABLED;
  const vatRate = VAT_RATE;
  const searchRef = useRef<HTMLInputElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currency = t("checkout.currency") || "so'm";

  // Clear any pending search lookup on unmount.
  useEffect(() => () => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
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

  // Keep the search box focused so a handheld scanner (keyboard-wedge) always
  // lands its keystrokes here.
  useEffect(() => {
    searchRef.current?.focus();
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
    // Newly added (or topped-up) line becomes the keyboard selection, so ←/→
    // adjust the item you just added without reaching for the mouse.
    setSelectedId(product.id);
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
          image: product.image,
        },
      ];
    });
  };

  // Add a product from the search result list (click) and reset the box for the
  // next item, keeping focus so scanning/searching can continue uninterrupted.
  const addFromSearch = (product: Product) => {
    if (product.quantity <= 0) {
      showToast("warning", `${product.name} — ${t("checkout.outOfStock")}`);
      return;
    }
    addProductToCart(product, 1);
    setLastScanned(product.name);
    setSearchTerm("");
    setSearchResults([]);
    searchRef.current?.focus();
  };

  // Resolve + add a scanned/camera code via the backend (exact barcode or code
  // match). Used by the camera scanner. `silent` suppresses the not-found toast.
  // Stable identity (useCallback) so the camera effect doesn't restart.
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
            showToast(
              "error",
              `${t("checkout.scanNotFound") || "No product for code"}: ${term}`,
            );
          }
          return;
        }
        if (product.quantity <= 0) {
          showToast("warning", `${product.name} — ${t("checkout.outOfStock")}`);
          return;
        }
        addProductToCart(product, 1);
        setLastScanned(product.name);
      } catch (err: unknown) {
        if (!opts?.silent) {
          showToast("error", (err as Error)?.message || "Failed to look up product", "Error");
        }
      }
    },
    [showToast, t],
  );

  // Debounced search as the user types/scans. Populates the click-to-add result
  // list; an exact barcode/code hit auto-adds (so wedge scanners work without
  // Enter) and clears the box.
  const handleSearchInput = (val: string) => {
    setSearchTerm(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    const term = val.trim();
    if (!term) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await getProducts(1, 8, term);
        const lc = term.toLowerCase();
        const exact = res.products.find(
          (p) =>
            (p.barcode ?? "").toLowerCase() === lc ||
            (p.code ?? "").toLowerCase() === lc,
        );
        if (exact && exact.quantity > 0) {
          // Scanned/typed an exact code → add it straight away.
          addProductToCart(exact, 1);
          setLastScanned(exact.name);
          setSearchTerm("");
          setSearchResults([]);
        } else {
          setSearchResults(res.products.filter((p) => p.isActive));
        }
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  };

  // Enter on the search box: add the first matching result, else surface a
  // not-found toast for the exact code.
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = searchTerm.trim();
    if (!term) return;
    const first = searchResults.find((p) => p.quantity > 0);
    if (first) {
      addFromSearch(first);
    } else {
      resolveCode(term);
    }
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

  // ── Keyboard selection helpers ──────────────────────────────────────────
  // Move the highlight up/down the cart (clamped to the ends).
  const selectRelative = (dir: 1 | -1) => {
    if (cart.length === 0) return;
    const idx = cart.findIndex((l) => l.productId === selectedId);
    const base = idx === -1 ? (dir > 0 ? -1 : 0) : idx;
    const next = Math.max(0, Math.min(cart.length - 1, base + dir));
    setSelectedId(cart[next].productId);
  };

  // Bump the selected line's quantity by ±1 (changeQty clamps to 1..stock).
  const changeSelectedQty = (delta: number) => {
    const line = cart.find((l) => l.productId === selectedId);
    if (!line) return;
    changeQty(line.productId, line.quantity + delta);
  };

  // Remove the selected line and move the highlight to a neighbour.
  const removeSelected = () => {
    if (!selectedId) return;
    const idx = cart.findIndex((l) => l.productId === selectedId);
    if (idx === -1) return;
    const neighbour = cart[idx + 1] ?? cart[idx - 1];
    removeLine(selectedId);
    setSelectedId(neighbour ? neighbour.productId : null);
  };

  // Keep the selection valid as the cart changes (default to the last line).
  useEffect(() => {
    if (cart.length === 0) {
      if (selectedId !== null) setSelectedId(null);
    } else if (!cart.some((l) => l.productId === selectedId)) {
      setSelectedId(cart[cart.length - 1].productId);
    }
  }, [cart, selectedId]);

  // Keep the highlighted row in view when moved by keyboard.
  useEffect(() => {
    if (!selectedId) return;
    document
      .querySelector(`[data-cart-row="${selectedId}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  const clearCart = () => {
    setCart([]);
    setLastScanned("");
    searchRef.current?.focus();
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
      setShowMore(false);
      searchRef.current?.focus();
    } catch (err: unknown) {
      showToast("error", (err as Error)?.message || t("checkout.orderError") || "Failed", "Error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Detect the platform once (client-only) for the right Pay shortcut label.
  useEffect(() => {
    const ua = `${navigator.platform || ""} ${navigator.userAgent || ""}`;
    setIsMac(/Mac|iPhone|iPad|iPod/.test(ua));
  }, []);

  // Latest state/actions for the global key handler, so it can attach once and
  // never re-bind (avoids stale closures without re-subscribing every render).
  const kbdRef = useRef({
    cartLen: 0,
    selectRelative,
    changeSelectedQty,
    removeSelected,
    handleComplete,
  });
  kbdRef.current = {
    cartLen: cart.length,
    selectRelative,
    changeSelectedQty,
    removeSelected,
    handleComplete,
  };

  // Global checkout shortcuts. Letters stay free for typing/scanning; the
  // cart-control keys only fire in "command mode" — when nothing is being
  // typed, or the (always-focused) search box is currently empty/idle.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = kbdRef.current;
      const ae = document.activeElement as HTMLElement | null;
      const tag = ae?.tagName;
      const isField =
        tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || ae?.isContentEditable;
      const inSearch = ae === searchRef.current;
      const searchEmpty = (searchRef.current?.value ?? "") === "";
      const commandMode = !isField || (inSearch && searchEmpty);

      // Pay with Ctrl/Cmd+Enter — works even mid-typing.
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        k.handleComplete();
        return;
      }

      if (!commandMode || k.cartLen === 0) return;
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          k.selectRelative(1);
          break;
        case "ArrowUp":
          e.preventDefault();
          k.selectRelative(-1);
          break;
        case "ArrowRight":
          e.preventDefault();
          k.changeSelectedQty(1);
          break;
        case "ArrowLeft":
          e.preventDefault();
          k.changeSelectedQty(-1);
          break;
        case "Delete":
          e.preventDefault();
          k.removeSelected();
          break;
        case "Backspace":
          // Mac's main delete key sends Backspace — allow it for removal, but
          // never while the search box is focused (it'd surprise mid-typing).
          if (inSearch) break;
          e.preventDefault();
          k.removeSelected();
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const inputClass =
    "h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 shadow-theme-xs focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

  // Show the result dropdown only when the box is focused and we have something.
  const showResults =
    searchFocused && searchTerm.trim() !== "" && (searchLoading || searchResults.length > 0);

  return (
    <div className="space-y-5">
      {/* ── Top toolbar: one search box (scan + search) + camera ───────────── */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M3.04 9.374a6.333 6.333 0 1 1 11.318 3.92l2.82 2.82a.75.75 0 1 1-1.06 1.06l-2.82-2.82A6.333 6.333 0 0 1 3.04 9.374Zm6.333-4.832a4.833 4.833 0 1 0 0 9.666 4.833 4.833 0 0 0 0-9.666Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <input
            ref={searchRef}
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearchInput(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            autoComplete="off"
            placeholder={t("checkout.searchAddPlaceholder") || "Search by name, barcode or SKU"}
            className="h-14 w-full rounded-xl border border-gray-300 bg-white pl-12 pr-4 text-base text-gray-800 placeholder:text-gray-400 shadow-theme-xs focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />

          {/* Click-to-add results */}
          {showResults && (
            <ul className="absolute left-0 right-0 z-30 mt-1.5 max-h-80 overflow-auto rounded-xl border border-gray-200 bg-white p-1.5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark">
              {searchLoading && searchResults.length === 0 ? (
                <li className="flex items-center justify-center gap-2 py-6 text-sm text-gray-400">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
                  {t("common.searching") || "Searching..."}
                </li>
              ) : (
                searchResults.map((p) => {
                  const out = p.quantity <= 0;
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        disabled={out}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => addFromSearch(p)}
                        className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition ${
                          out
                            ? "cursor-not-allowed opacity-50"
                            : "hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                        }`}
                      >
                        <ProductThumb src={p.image} alt={p.name} size={40} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-gray-800 dark:text-white/90">
                            {p.name}
                          </span>
                          <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                            {out
                              ? t("checkout.outOfStock")
                              : `${p.quantity} ${t("checkout.inStock")}`}
                          </span>
                        </span>
                        <span className="shrink-0 text-sm font-semibold text-gray-800 dark:text-white/90">
                          {formatMoney(Number(p.priceOut))}
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          )}
        </form>

        <button
          type="button"
          onClick={() => setCameraOpen((o) => !o)}
          className={`flex h-14 shrink-0 items-center justify-center gap-2.5 rounded-xl px-6 text-base font-semibold shadow-theme-xs transition active:scale-[0.99] ${
            cameraOpen
              ? "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              : "bg-brand-500 text-white hover:bg-brand-600"
          }`}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 0 1 2-2h1l1.5-2h9L18 7h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
          {cameraOpen ? t("checkout.cameraStop") || "Stop camera" : t("checkout.scanShort") || "Scan"}
        </button>
      </div>

      <CameraScanner
        isOpen={cameraOpen}
        onClose={() => {
          setCameraOpen(false);
          searchRef.current?.focus();
        }}
        onDetected={resolveCode}
        lastScanned={lastScanned}
      />

      {/* ── Two columns: cart on the left, invoice/payment on the right ─────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Cart */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
                {t("checkout.orderDetails") || "Order details"}
              </h2>
              {cart.length > 0 && (
                <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                  {itemCount} {t("checkout.pieces")}
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-error-500 transition hover:bg-error-50 dark:hover:bg-error-500/10"
              >
                {t("checkout.clearAll") || "Clear all"}
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
              <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-800">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h2l2.4 12.3a1 1 0 0 0 1 .8h8.7a1 1 0 0 0 1-.78L21 8H6" />
                  <circle cx="9" cy="20" r="1.4" />
                  <circle cx="18" cy="20" r="1.4" />
                </svg>
              </span>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t("checkout.emptyCart")}
              </p>
              <p className="mt-1 max-w-xs text-xs text-gray-400">
                {t("checkout.searchHint") || "Scan a barcode or type to search, then press Enter"}
              </p>
            </div>
          ) : (
            <ul className="flex-1 divide-y divide-gray-100 dark:divide-gray-800">
              {cart.map((line) => (
                <li
                  key={line.productId}
                  data-cart-row={line.productId}
                  onClick={() => setSelectedId(line.productId)}
                  className={`flex items-center gap-3 px-4 py-3 transition sm:px-5 ${
                    line.productId === selectedId
                      ? "bg-brand-50/70 ring-1 ring-inset ring-brand-300 dark:bg-brand-500/10 dark:ring-brand-500/40"
                      : "hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                  }`}
                >
                  <ProductThumb src={line.image} alt={line.name} size={48} />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-800 dark:text-white/90">
                      {line.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatMoney(line.price)}
                    </p>
                  </div>

                  {/* Quantity stepper — large touch targets for fast use */}
                  <div className="flex shrink-0 items-center overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      aria-label="-"
                      onClick={() => changeQty(line.productId, line.quantity - 1)}
                      className="flex h-10 w-10 items-center justify-center text-lg text-gray-600 transition hover:bg-gray-50 disabled:opacity-40 dark:text-gray-300 dark:hover:bg-white/[0.05]"
                      disabled={line.quantity <= 1}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={line.stock || undefined}
                      value={line.quantity}
                      onChange={(e) => changeQty(line.productId, Number(e.target.value))}
                      className="h-10 w-12 border-x border-gray-200 bg-white text-center text-sm font-medium text-gray-800 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      aria-label="+"
                      onClick={() => changeQty(line.productId, line.quantity + 1)}
                      className="flex h-10 w-10 items-center justify-center text-lg text-gray-600 transition hover:bg-gray-50 disabled:opacity-40 dark:text-gray-300 dark:hover:bg-white/[0.05]"
                      disabled={!!line.stock && line.quantity >= line.stock}
                    >
                      +
                    </button>
                  </div>

                  <div className="w-24 shrink-0 text-right text-sm font-semibold text-gray-800 dark:text-white/90">
                    {formatMoney(line.price * line.quantity)}
                  </div>

                  <button
                    type="button"
                    aria-label={t("checkout.removeItem") || "Remove"}
                    onClick={() => removeLine(line.productId)}
                    className="group flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition hover:bg-error-50 dark:hover:bg-error-500/10"
                  >
                    <DeleteIcon />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Keyboard shortcuts legend — always shown (desktop; no keyboard on touch POS) */}
          <div className="hidden border-t border-gray-200 px-4 py-4 sm:block dark:border-gray-800">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm text-gray-600 dark:text-gray-300">
              <span className="flex items-center gap-2">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd> {t("checkout.shortcuts.move") || "Move"}
              </span>
              <span className="flex items-center gap-2">
                <Kbd>←</Kbd>
                <Kbd>→</Kbd> {t("checkout.shortcuts.qty") || "Quantity"}
              </span>
              <span className="flex items-center gap-2">
                <Kbd>Del</Kbd> {t("checkout.shortcuts.remove") || "Remove"}
              </span>
              <span className="flex items-center gap-2">
                <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
                <span className="text-base font-semibold text-gray-600 dark:text-gray-300">+</span>
                <Kbd>↵</Kbd> {t("checkout.shortcuts.completeSale") || "Complete sale"}
              </span>
            </div>
          </div>
        </div>

        {/* Invoice + payment (sticky on desktop) */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.02]">
            <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">
              {t("checkout.invoice") || t("checkout.summary.title")}
            </h2>

            {/* Summary */}
            <ul className="space-y-2.5">
              <li className="flex justify-between gap-5 text-sm">
                <span className="text-gray-500 dark:text-gray-400">{t("checkout.subtotal")}</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {formatMoney(total)}
                </span>
              </li>
              {vatEnabled && vatRate > 0 && (
                <li className="flex justify-between gap-5 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    {(t("checkout.vatIncluded") || "incl. VAT {percent}%").replace(
                      "{percent}",
                      String(vatRate),
                    )}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">{formatMoney(vatAmount)}</span>
                </li>
              )}
              <li className="flex items-center justify-between gap-5 border-t border-gray-200 pt-3 dark:border-gray-800">
                <span className="font-semibold text-gray-800 dark:text-white/90">
                  {t("checkout.totalPayable") || t("checkout.total")}
                </span>
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatMoney(total)}
                </span>
              </li>
            </ul>

            {/* Payment method — Cash/Card up front, Split/Credit behind More */}
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {t("checkout.paymentMethod")}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowMore((v) => {
                      const next = !v;
                      // Collapsing while on a tucked-away method falls back to cash.
                      if (!next && (paymentMethod === "split" || paymentMethod === "debt")) {
                        setPaymentMethod("cash");
                      }
                      return next;
                    });
                  }}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                >
                  {showMore
                    ? t("checkout.fewerOptions") || "Fewer options"
                    : t("checkout.moreOptions") || "More options"}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(["cash", "card"] as const).map((m) => (
                  <PayTile
                    key={m}
                    active={paymentMethod === m}
                    label={t(`checkout.${m}`) || m}
                    onClick={() => setPaymentMethod(m)}
                  />
                ))}
              </div>

              {showMore && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(["split", "debt"] as const).map((m) => (
                    <PayTile
                      key={m}
                      active={paymentMethod === m}
                      label={t(`checkout.${m}`) || m}
                      onClick={() => setPaymentMethod(m)}
                    />
                  ))}
                </div>
              )}
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
                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
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

            {/* Split: cash + card that must sum to the total */}
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
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/40">
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

            {/* Optional client + note (non-debt) — kept out of the way under More */}
            {showMore && paymentMethod !== "debt" && (
              <div className="mt-4 space-y-3 border-t border-gray-100 pt-4 dark:border-gray-800">
                <div>
                  <label className="mb-1 inline-block text-xs font-semibold text-gray-700 dark:text-gray-400">
                    {t("checkout.client")}{" "}
                    <span className="font-normal text-gray-400">
                      ({t("checkout.optional") || "optional"})
                    </span>
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
                  <label className="mb-1 inline-block text-xs font-semibold text-gray-700 dark:text-gray-400">
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
            )}

            {/* Primary action */}
            <button
              type="button"
              onClick={handleComplete}
              disabled={cart.length === 0 || isSubmitting || !paymentValid}
              className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-brand-500 text-base font-semibold text-white shadow-theme-md transition hover:bg-brand-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>
                {isSubmitting
                  ? t("checkout.completing")
                  : paymentMethod === "debt"
                    ? t("checkout.sellOnCredit") || "Sell on credit"
                    : `${t("checkout.completeSale")}${total > 0 ? ` · ${formatMoney(total)}` : ""}`}
              </span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

/** Small keyboard-key chip used in the shortcuts legend. */
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-8 min-w-[2rem] items-center justify-center rounded-lg border border-gray-200 bg-gray-50 px-2 text-sm font-semibold text-gray-700 shadow-theme-xs dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
      {children}
    </kbd>
  );
}

/** A large, finger-friendly payment-method tile. */
function PayTile({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-12 rounded-xl border text-sm font-semibold transition active:scale-[0.98] ${
        active
          ? "border-brand-500 bg-brand-500 text-white shadow-theme-xs"
          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
      }`}
    >
      {label}
    </button>
  );
}
