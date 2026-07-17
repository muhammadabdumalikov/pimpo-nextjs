"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import { useSidebar } from "@/context/SidebarContext";
import { formatPhone } from "@/lib/phone";
import { formatNumberInput, digitsOnly } from "@/lib/number";
import {
  getProducts,
  getProduct,
  createOrder,
  holdOrder,
  deleteOrder,
  getOrders,
  getOrder,
  searchCustomers,
  getOpenShifts,
  getRegisters,
  getShifts,
  openShift,
  type Product,
  type Customer,
  type Shift,
  type Order,
  type CashRegister,
} from "@/lib/api";
import SelectField from "@/components/form/SelectField";

// Static VAT (QQS) config for now. Flip VAT_ENABLED to false to hide the line.
// TODO: wire back to the business's receipt settings API.
const VAT_ENABLED = false;
const VAT_RATE = 12;

type CartLine = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
  image: string | null;
};

// One line of the payment drawer: a method plus the amount applied via it.
// A sale is paid by composing these (cash 30k + card 10k = split, etc.).
type PayMethod = "cash" | "card" | "debt";
type PayEntry = { method: PayMethod; amount: string };

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
  const { headerOpen } = useSidebar();

  const [cart, setCart] = useState<CartLine[]>([]);

  // Unified product entry: one box that searches by name/barcode/SKU, doubles as
  // the hardware-scanner target (auto-focused), and shows a click-to-add result
  // list. Exact barcode/code matches auto-add (so keyboard-wedge scanners that
  // don't send Enter still work).
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [lastScanned, setLastScanned] = useState("");
  // Keyboard-driven selection: the highlighted cart row that ↑/↓ moves and
  // ←/→ adjusts the quantity of. Tracked by productId so it survives reordering.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Raw text of the quantity input while it's being edited, so the field can be
  // cleared (empty) before typing a new number instead of snapping back to 1.
  const [qtyDraft, setQtyDraft] = useState<{ id: string; value: string } | null>(
    null,
  );
  // Cmd+Enter (Mac) vs Ctrl+Enter (others) — resolved after mount to avoid a
  // hydration mismatch.
  const [isMac, setIsMac] = useState(false);

  const [customerName, setCustomerName] = useState("");
  // BiLLZ-style payment drawer: "To'lash" opens a full-screen screen where the
  // cashier composes the payment from method entries. Clicking a method tile
  // auto-fills whatever is still left to pay.
  const [showPayment, setShowPayment] = useState(false);
  const [payEntries, setPayEntries] = useState<PayEntry[]>([]);
  const [phone, setPhone] = useState("");
  const [dueDate, setDueDate] = useState(""); // optional
  // Customer search (clients history) for debt sales. The Client field doubles
  // as the search box: typing searches history; picking a result locks it in.
  const [customerUserId, setCustomerUserId] = useState<string | null>(null);
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [customerFocused, setCustomerFocused] = useState(false);
  const [note, setNote] = useState("");
  // Manual whole-receipt discount: a fixed soʻm amount or a percent of subtotal.
  // Hidden behind a toggle so the common no-discount sale stays uncluttered.
  const [discountType, setDiscountType] = useState<"amount" | "percent">("percent");
  const [discountInput, setDiscountInput] = useState("");
  // Preset-first design: one-tap % buttons cover the common cases; the manual
  // input (any % or fixed soʻm) hides behind a "Custom" button.
  const [discountCustom, setDiscountCustom] = useState(false);
  const DISCOUNT_PRESETS = [5, 10, 15, 20];
  // Advanced options (Split/Credit, client, note) stay tucked away so the common
  // cash sale is one tap. Selecting Credit forces them open.
  const [showMore, setShowMore] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Active cash shift (a sale must be rung up against an open shift). We use the
  // first open shift for a single-register business; multi-register selection
  // lives on the Kassa page.
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  // True once the open-shift lookup has settled — before that we show a
  // spinner instead of flashing the "open a register" screen.
  const [shiftChecked, setShiftChecked] = useState(false);
  // BiLLZ-style "open a register" screen state (shown when no shift is open).
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [recentShifts, setRecentShifts] = useState<Shift[]>([]);
  const [openRegisterId, setOpenRegisterId] = useState("");
  const [openFloat, setOpenFloat] = useState("");
  const [openNote, setOpenNote] = useState("");
  const [openingShift, setOpeningShift] = useState(false);
  // Held ("kechiktirilgan") sales: the cashier parks the current cart to serve
  // someone else and resumes it later. Stock is untouched while a sale is held.
  const [heldOrders, setHeldOrders] = useState<Order[]>([]);
  const [showHeld, setShowHeld] = useState(false);
  const [heldSearch, setHeldSearch] = useState("");
  // The shortcuts legend collapses to a one-line bar (BiLLZ-style) by default.
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [resumingId, setResumingId] = useState<string | null>(null);
  // The held order the current cart was resumed from. Completing the sale sends
  // it as `heldOrderId` so the backend retires it in the same transaction.
  const [resumedHoldId, setResumedHoldId] = useState<string | null>(null);
  const vatEnabled = VAT_ENABLED;
  const vatRate = VAT_RATE;
  const searchRef = useRef<HTMLInputElement>(null);
  const customerRef = useRef<HTMLInputElement>(null);
  const discountRef = useRef<HTMLInputElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cartRef = useRef<HTMLDivElement>(null);
  // Measured cart height: exactly from the card's top edge to the bottom of
  // the viewport. Re-measured when anything above it (e.g. the collapsible
  // app header) changes the layout, so the cart is always full-height.
  const [cartHeight, setCartHeight] = useState<number | null>(null);

  useEffect(() => {
    const el = cartRef.current;
    if (!el) return;
    const update = () => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      setCartHeight(Math.max(480, window.innerHeight - top - 24));
    };
    const raf = requestAnimationFrame(update);
    window.addEventListener("resize", update);
    const ro = new ResizeObserver(update);
    ro.observe(document.body);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      ro.disconnect();
    };
  }, []);

  const currency = t("checkout.currency") || "so'm";

  // Clear any pending search lookup on unmount.
  useEffect(() => () => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
  }, []);

  // Load the active cash shift so the till knows whether selling is allowed.
  const refreshShift = useCallback(async () => {
    try {
      const open = await getOpenShifts();
      setActiveShift(open[0] ?? null);
    } catch {
      setActiveShift(null);
    } finally {
      setShiftChecked(true);
    }
  }, []);
  useEffect(() => {
    refreshShift();
  }, [refreshShift]);

  // With no shift open, load the registers + recent shifts that power the
  // "open a register" screen (the balance cards read the last closed shift).
  useEffect(() => {
    if (!shiftChecked || activeShift) return;
    (async () => {
      try {
        const [regs, res] = await Promise.all([
          getRegisters(),
          getShifts({ limit: 50 }),
        ]);
        setRegisters(regs);
        setRecentShifts(res.shifts);
        setOpenRegisterId((cur) => cur || regs[0]?.id || "");
      } catch {
        /* non-fatal — the screen still lets the cashier open a shift */
      }
    })();
  }, [shiftChecked, activeShift]);

  // What the selected register held when its last shift was closed — shown on
  // the "open a register" screen like BiLLZ's "Sizning kassangizda mavjud".
  const lastClosedShift = useMemo(() => {
    return (
      [...recentShifts]
        .filter((s) => s.registerId === openRegisterId && s.status === "closed")
        .sort((a, b) => ((a.closedAt ?? "") < (b.closedAt ?? "") ? 1 : -1))[0] ??
      null
    );
  }, [recentShifts, openRegisterId]);

  const registerBalance = (method: "cash" | "card", currency: "UZS" | "USD") => {
    const row = lastClosedShift?.reconciliation?.find(
      (r) => r.method === method && r.currency === currency,
    );
    const value = row ? (row.counted ?? row.expected) : 0;
    return new Intl.NumberFormat("uz-UZ").format(value);
  };

  const handleOpenShift = async () => {
    if (!openRegisterId || openingShift) return;
    setOpeningShift(true);
    try {
      const shift = await openShift({
        registerId: openRegisterId,
        openingFloat: Number(openFloat || "0"),
        note: openNote.trim() || undefined,
      });
      setActiveShift(shift);
      setOpenFloat("");
      setOpenNote("");
      showToast("success", t("kassa.openShift"), "Success");
      setTimeout(() => searchRef.current?.focus(), 0);
    } catch (err: unknown) {
      showToast("error", (err as Error)?.message || "Failed", "Error");
    } finally {
      setOpeningShift(false);
    }
  };

  // Load the parked (held) sales so the toolbar badge and list stay current.
  const refreshHeld = useCallback(async () => {
    try {
      const res = await getOrders(1, 50, undefined, "Held");
      setHeldOrders(res.orders);
    } catch {
      /* non-fatal */
    }
  }, []);
  useEffect(() => {
    refreshHeld();
  }, [refreshHeld]);

  // The held drawer, shortcuts sheet and payment drawer close on Escape.
  useEffect(() => {
    if (!showHeld && !showShortcuts && !showPayment) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setShowHeld(false);
      setShowShortcuts(false);
      setShowPayment(false);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [showHeld, showShortcuts, showPayment]);

  // Drawers start below the app header so its (higher z-index) bar never covers
  // the drawer's top controls. The header is collapsible, so we re-measure its
  // bottom edge on layout changes; when it's hidden the drawer fills the screen.
  const [headerBottom, setHeaderBottom] = useState(0);
  useEffect(() => {
    // The header is always mounted (collapsed via animation), so its own rect
    // still reports full height when hidden — gate on `headerOpen`.
    const measure = () => {
      if (!headerOpen) {
        setHeaderBottom(0);
        return;
      }
      const header = document.querySelector("header");
      const bottom = header ? header.getBoundingClientRect().bottom : 0;
      setHeaderBottom(Math.max(0, Math.round(bottom)));
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      ro.disconnect();
    };
  }, [headerOpen]);

  // Client-side filter over the parked sales: order id, customer or note.
  const filteredHeld = useMemo(() => {
    const q = heldSearch.trim().toLowerCase();
    if (!q) return heldOrders;
    return heldOrders.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        (o.customerName ?? "").toLowerCase().includes(q) ||
        (o.cashierName ?? "").toLowerCase().includes(q) ||
        (o.note ?? "").toLowerCase().includes(q),
    );
  }, [heldOrders, heldSearch]);

  // Debounced client search (from clients history) — any payment method may
  // attach a customer. The Client name field is the query; skip once a client
  // is locked in.
  useEffect(() => {
    const q = customerName.trim();
    if (customerUserId !== null || q === "") {
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
  }, [customerName, customerUserId]);

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

  // Gross total before the manual discount.
  const subtotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.price * line.quantity, 0),
    [cart],
  );
  // Resolve the discount (clamped to [0, subtotal]) and the net payable total.
  const discountValueNum = Number(discountInput) || 0;
  const discountAmount = useMemo(() => {
    if (discountValueNum <= 0 || subtotal <= 0) return 0;
    const raw =
      discountType === "percent"
        ? (subtotal * Math.min(discountValueNum, 100)) / 100
        : discountValueNum;
    return Math.max(0, Math.min(raw, subtotal));
  }, [discountType, discountValueNum, subtotal]);
  const total = Math.max(0, subtotal - discountAmount);
  const itemCount = useMemo(
    () => cart.reduce((sum, line) => sum + line.quantity, 0),
    [cart],
  );
  // True if any line would sell more than the product has in stock. Blocks the
  // sale (defense in depth — the quantity input already clamps to stock).
  const hasOversell = useMemo(
    () => cart.some((line) => line.stock > 0 && line.quantity > line.stock),
    [cart],
  );

  // VAT (QQS) is inclusive — the tax portion of the total, shown for info.
  const vatAmount =
    vatEnabled && vatRate > 0 ? (total * vatRate) / (100 + vatRate) : 0;

  // ── Payment drawer math (derived from the method entries) ───────────────
  const entrySum = (m: PayMethod) =>
    payEntries
      .filter((e) => e.method === m)
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const cashEntered = entrySum("cash");
  const cardEntered = entrySum("card");
  const debtEntered = entrySum("debt");
  const totalEntered = cashEntered + cardEntered + debtEntered;
  const payRemaining = Math.max(0, total - totalEntered);
  const hasDebt = payEntries.some((e) => e.method === "debt");
  // Change is only ever given from the cash the customer handed over.
  const cashNeeded = Math.max(0, total - cardEntered - debtEntered);
  const change = Math.max(0, cashEntered - cashNeeded);

  const paymentValid =
    payEntries.length > 0 &&
    payEntries.every((e) => (Number(e.amount) || 0) > 0) &&
    totalEntered >= total - 0.5 &&
    cardEntered + debtEntered <= total + 0.5 &&
    (!hasDebt ||
      (customerName.trim() !== "" && phone.trim() !== "" && change < 1));

  // Cash quick-amount chips: the exact cash still needed plus round UZS
  // amounts up from it (the customer usually hands over a round note).
  const cashChips = useMemo(() => {
    if (cashNeeded <= 0) return [];
    const roundUp = (step: number) => Math.ceil(cashNeeded / step) * step;
    const candidates = [
      cashNeeded,
      roundUp(5000),
      roundUp(10000),
      roundUp(50000),
      roundUp(100000),
    ];
    return Array.from(new Set(candidates))
      .filter((v) => v >= cashNeeded)
      .slice(0, 4);
  }, [cashNeeded]);

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

  // Resolve + add a scanned/typed code via the backend (exact barcode or code
  // match). `silent` suppresses the not-found toast.
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
        const res = await getProducts(1, 10, term);
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

  const clearDiscount = () => {
    setDiscountInput("");
    setDiscountType("percent");
    setDiscountCustom(false);
  };

  // One-tap preset: apply a percentage, or toggle it off if it's already set.
  const applyPreset = (percent: number) => {
    if (discountType === "percent" && discountValueNum === percent) {
      clearDiscount();
      return;
    }
    setDiscountType("percent");
    setDiscountInput(String(percent));
  };

  // ── Payment drawer actions ───────────────────────────────────────────────
  // "To'lash" opens the drawer. `prefillCash` (Ctrl/Cmd+Enter fast path) seeds
  // a cash entry covering the whole total so a second Ctrl+Enter completes.
  const openPayment = (prefillCash = false) => {
    if (cart.length === 0 || hasOversell) return;
    if (!activeShift) {
      showToast(
        "error",
        t("kassa.noOpenShift") || "Open a cash shift first",
        "Kassa",
      );
      return;
    }
    if (prefillCash && payEntries.length === 0 && total > 0) {
      setPayEntries([{ method: "cash", amount: String(Math.round(total)) }]);
    }
    setShowPayment(true);
  };

  const closePayment = () => setShowPayment(false);

  // Add a method entry, auto-filling whatever is still left to pay (the BiLLZ
  // convenience: enter 30k cash, tap Card — it fills the remaining 70k).
  // Tapping an existing method tops it up by the remainder instead.
  const addPayEntry = (method: PayMethod) => {
    setPayEntries((prev) => {
      const entered = prev.reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const left = Math.max(0, Math.round(total - entered));
      const existing = prev.find((e) => e.method === method);
      if (existing) {
        if (left <= 0) return prev;
        return prev.map((e) =>
          e.method === method
            ? { ...e, amount: String((Number(e.amount) || 0) + left) }
            : e,
        );
      }
      return [...prev, { method, amount: left > 0 ? String(left) : "" }];
    });
  };

  const updatePayEntry = (method: PayMethod, amount: string) =>
    setPayEntries((prev) =>
      prev.map((e) => (e.method === method ? { ...e, amount } : e)),
    );

  const removePayEntry = (method: PayMethod) =>
    setPayEntries((prev) => prev.filter((e) => e.method !== method));

  // Reset the till to a fresh sale (cart, customer, payment, discount).
  const resetSale = () => {
    setCart([]);
    setCustomerName("");
    setNote("");
    clearDiscount();
    setLastScanned("");
    setShowPayment(false);
    setPayEntries([]);
    setPhone("");
    setDueDate("");
    setCustomerUserId(null);
    setCustomerResults([]);
    setCustomerFocused(false);
    setShowMore(false);
    setResumedHoldId(null);
    searchRef.current?.focus();
  };

  // Park the current cart as a held sale and free the till for the next
  // customer. Stock stays untouched until the sale is resumed and completed.
  const handleHold = async () => {
    if (cart.length === 0 || isHolding || isSubmitting) return;
    setIsHolding(true);
    try {
      await holdOrder({
        items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        customerName: customerName.trim() || undefined,
        userId: customerUserId ?? undefined,
        note: note.trim() || undefined,
        discountType: discountAmount > 0 ? discountType : undefined,
        discountValue: discountAmount > 0 ? discountValueNum : undefined,
      });
      // Re-holding a resumed sale: retire the old parked copy (best-effort —
      // a leftover just stays visible in the list and can be deleted there).
      if (resumedHoldId) {
        await deleteOrder(resumedHoldId).catch(() => {});
      }
      showToast("success", t("checkout.holdSuccess") || "Sale parked");
      resetSale();
      refreshHeld();
    } catch (err: unknown) {
      showToast(
        "error",
        (err as Error)?.message || t("checkout.orderError") || "Failed",
        "Error",
      );
    } finally {
      setIsHolding(false);
    }
  };

  // Bring a parked sale back into the cart. Lines are re-read from the live
  // products so price/stock are current; missing products are reported.
  const resumeHeld = async (id: string) => {
    if (resumingId) return;
    if (
      cart.length > 0 &&
      !window.confirm(
        t("checkout.resumeReplaceConfirm") ||
          "Replace the current cart with the held sale?",
      )
    ) {
      return;
    }
    setResumingId(id);
    try {
      const order = await getOrder(id);
      const lines: CartLine[] = [];
      const missing: string[] = [];
      for (const item of order.items ?? []) {
        if (!item.productId) {
          missing.push(item.productName);
          continue;
        }
        try {
          const p = await getProduct(item.productId);
          lines.push({
            productId: p.id,
            name: p.name,
            price: Number(p.priceOut),
            quantity: Math.max(
              1,
              Math.min(item.quantity, p.quantity || item.quantity),
            ),
            stock: p.quantity,
            image: p.image,
          });
        } catch {
          missing.push(item.productName);
        }
      }
      if (missing.length > 0) {
        showToast(
          "warning",
          `${t("checkout.resumeMissing") || "Not restored"}: ${missing.join(", ")}`,
        );
      }
      if (lines.length === 0) return;
      setCart(lines);
      setCustomerName(order.customerName ?? "");
      setCustomerUserId(order.userId);
      setNote(order.note ?? "");
      if (order.discountType && Number(order.discountValue) > 0) {
        setDiscountType(order.discountType as "amount" | "percent");
        setDiscountInput(String(Number(order.discountValue)));
      } else {
        clearDiscount();
      }
      setResumedHoldId(order.id);
      setShowHeld(false);
      searchRef.current?.focus();
    } catch (err: unknown) {
      showToast(
        "error",
        (err as Error)?.message || t("checkout.orderError") || "Failed",
        "Error",
      );
    } finally {
      setResumingId(null);
    }
  };

  const deleteHeld = async (id: string) => {
    try {
      await deleteOrder(id);
      if (resumedHoldId === id) setResumedHoldId(null);
      refreshHeld();
    } catch (err: unknown) {
      showToast(
        "error",
        (err as Error)?.message || t("checkout.orderError") || "Failed",
        "Error",
      );
    }
  };

  const handleComplete = async () => {
    if (cart.length === 0 || !paymentValid) return;
    // A sale must be rung up against an open cash shift.
    if (!activeShift) {
      showToast(
        "error",
        t("kassa.noOpenShift") || "Open a cash shift first",
        "Kassa",
      );
      return;
    }
    setIsSubmitting(true);

    // Build the payment breakdown from the drawer entries. `payments` carries
    // what was APPLIED to the sale (cash capped at what was needed); the full
    // tendered cash goes to amountPaid so the backend can compute the change.
    // A debt entry is not a payment — the backend records the unpaid remainder
    // (total - paid now) as the customer's debt.
    const payments = [
      { method: "cash", amount: Math.min(cashEntered, cashNeeded) },
      { method: "card", amount: cardEntered },
    ].filter((p) => p.amount > 0);
    const paymentMethod = hasDebt
      ? "debt"
      : payments.length > 1
        ? "split"
        : (payments[0]?.method ?? "cash");

    try {
      await createOrder({
        items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        customerName: customerName.trim() || undefined,
        userId: customerUserId ?? undefined,
        paymentMethod,
        payments,
        amountPaid: cashEntered,
        phone: hasDebt ? phone.trim() : undefined,
        dueDate: hasDebt && dueDate ? dueDate : undefined,
        note: note.trim() || undefined,
        status: "Completed",
        source: "admin",
        registerId: activeShift.registerId,
        shiftId: activeShift.id,
        discountType: discountAmount > 0 ? discountType : undefined,
        discountValue: discountAmount > 0 ? discountValueNum : undefined,
        heldOrderId: resumedHoldId ?? undefined,
      });
      const successMsg = hasDebt
        ? `${t("checkout.debtSold") || "Sold on credit"} — ${
            t("checkout.debtRemaining") || "Debt"
          }: ${formatMoney(debtEntered)}`
        : `${t("checkout.orderSuccess") || "Order completed"}${
            change > 0 ? ` — ${t("checkout.change") || "Change"}: ${formatMoney(change)}` : ""
          }`;
      showToast("success", successMsg, "Success");
      const resumed = resumedHoldId !== null;
      resetSale();
      if (resumed) refreshHeld();
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

  // J: reveal + focus the customer field (its section may be collapsed).
  const openCustomer = () => {
    setShowMore(true);
    setTimeout(() => customerRef.current?.focus(), 0);
  };

  // K: open the manual discount input (the section itself is always shown).
  const openDiscount = () => {
    setDiscountCustom(true);
    setTimeout(() => discountRef.current?.focus(), 0);
  };

  // Latest state/actions for the global key handler, so it can attach once and
  // never re-bind (avoids stale closures without re-subscribing every render).
  const kbdRef = useRef({
    cartLen: 0,
    paymentOpen: false,
    selectRelative,
    changeSelectedQty,
    removeSelected,
    handleComplete,
    handleHold,
    openCustomer,
    openDiscount,
    openPayment,
    closePayment,
    addPayEntry,
  });
  kbdRef.current = {
    cartLen: cart.length,
    paymentOpen: showPayment,
    selectRelative,
    changeSelectedQty,
    removeSelected,
    handleComplete,
    handleHold,
    openCustomer,
    openDiscount,
    openPayment,
    closePayment,
    addPayEntry,
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

      // While the payment drawer is open its own keys take over: F1/F2/F3 add
      // method entries, B goes back, L (or Ctrl/Cmd+Enter) confirms the sale.
      if (k.paymentOpen) {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          k.handleComplete();
          return;
        }
        if (e.key === "F1" || e.key === "F2" || e.key === "F3") {
          e.preventDefault();
          k.addPayEntry(
            e.key === "F1" ? "cash" : e.key === "F2" ? "card" : "debt",
          );
          return;
        }
        if (!isField && !e.metaKey && !e.ctrlKey && !e.altKey) {
          const key = e.key.toLowerCase();
          if (key === "l") {
            e.preventDefault();
            k.handleComplete();
          } else if (key === "b") {
            e.preventDefault();
            k.closePayment();
          }
        }
        return;
      }

      // Ctrl/Cmd+Enter — jump straight into payment with cash prefilled, so
      // the plain cash sale stays two keystrokes (open → confirm).
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        k.openPayment(true);
        return;
      }

      // BiLLZ-style letter hotkeys — only when nothing at all is being typed,
      // so they can never swallow the first letter of a search query.
      if (!isField && !e.metaKey && !e.ctrlKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case "/":
            e.preventDefault();
            searchRef.current?.focus();
            return;
          case "j":
            e.preventDefault();
            k.openCustomer();
            return;
          case "k":
            e.preventDefault();
            k.openDiscount();
            return;
          case "l":
            e.preventDefault();
            k.openPayment();
            return;
          case "o":
            e.preventDefault();
            k.handleHold();
            return;
        }
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

  // Still figuring out whether a shift is open — don't flash either screen.
  if (!shiftChecked) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
      </div>
    );
  }

  // ── No open shift: BiLLZ-style "open a register" screen instead of the till ──
  if (!activeShift) {
    return (
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 sm:p-10 dark:border-gray-800 dark:bg-white/[0.02]">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:divide-x lg:divide-dashed lg:divide-gray-200 dark:lg:divide-gray-800">
          {/* Left: what the register held when it was last closed */}
          <div className="lg:pr-10">
            <h2 className="text-2xl font-bold text-gray-400 dark:text-gray-500">
              {t("kassa.selectRegister") || "Choose a register"}
            </h2>
            <p className="mt-8 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("kassa.registerContains") || "Currently in your register:"}
            </p>
            <div className="mt-4 space-y-4">
              {(
                [
                  ["cash", t("checkout.cash") || "Cash"],
                  ["card", t("kassa.cashless") || "Cashless"],
                ] as const
              ).map(([method, label]) => (
                <div
                  key={method}
                  className="rounded-2xl border border-gray-200 p-5 dark:border-gray-800"
                >
                  <div className="flex items-center justify-between border-b border-dashed border-gray-300 pb-3 dark:border-gray-700">
                    <span className="text-lg font-bold text-gray-800 dark:text-white/90">
                      {label}
                    </span>
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-white/[0.06] dark:text-gray-300">
                      {method === "cash" ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <rect x="2.5" y="6.5" width="19" height="11" rx="2" />
                          <circle cx="12" cy="12" r="2.75" />
                          <path d="M6 10v4M18 10v4" strokeLinecap="round" />
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <rect x="2.5" y="5.5" width="19" height="13" rx="2" />
                          <path d="M2.5 9.5h19" />
                          <path d="M6 14.5h5" strokeLinecap="round" />
                        </svg>
                      )}
                    </span>
                  </div>
                  <p className="pt-3 text-lg font-bold text-gray-800 dark:text-white/90">
                    <span className="text-brand-500 dark:text-brand-400">
                      {registerBalance(method, "UZS")}
                    </span>{" "}
                    UZS /{" "}
                    <span className="text-brand-500 dark:text-brand-400">
                      {registerBalance(method, "USD")}
                    </span>{" "}
                    USD
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: pick the register and open the shift */}
          <div className="flex flex-col gap-5">
            <div>
              <label className="mb-1.5 inline-block text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t("kassa.register") || "Register"}
              </label>
              <SelectField
                value={openRegisterId}
                onChange={setOpenRegisterId}
                placeholder={t("kassa.selectRegister") || "Choose a register"}
                options={registers.map((r) => ({ value: r.id, label: r.name }))}
              />
            </div>
            <div>
              <label className="mb-1.5 inline-block text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t("kassa.openingFloat") || "Opening amount"}
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatNumberInput(openFloat)}
                  onChange={(e) => setOpenFloat(digitsOnly(e.target.value))}
                  placeholder={t("kassa.enterAmount") || "Enter the amount"}
                  className={`${inputClass} pr-16`}
                />
                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md bg-gray-100 px-2.5 py-1.5 text-xs font-semibold text-gray-600 dark:bg-white/[0.08] dark:text-gray-300">
                  UZS
                </span>
              </div>
            </div>
            <div>
              <label className="mb-1.5 inline-block text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t("kassa.note") || "Note"}
              </label>
              <input
                type="text"
                value={openNote}
                onChange={(e) => setOpenNote(e.target.value)}
                placeholder={t("kassa.enterNote") || "Enter a note"}
                className={inputClass}
              />
            </div>
            <button
              type="button"
              onClick={handleOpenShift}
              disabled={!openRegisterId || openingShift}
              className="mt-auto flex h-14 w-full items-center justify-center gap-2.5 rounded-xl bg-brand-500 text-base font-semibold text-white shadow-theme-md transition hover:bg-brand-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {openingShift
                ? t("kassa.opening") || "..."
                : t("kassa.openRegister") || "Open the register"}
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 10h13m0 0-5-5m5 5-5 5" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Top toolbar: one search box (scan + search) + held sales ───────── */}
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
            className="h-14 w-full rounded-xl border border-gray-300 bg-white pl-12 pr-4 text-base text-gray-800 placeholder:text-gray-400 shadow-theme-xs focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden sm:pr-28 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />

          {/* "/" hotkey hint inside the box (BiLLZ-style), while it's empty */}
          {searchTerm === "" && (
            <span className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 items-center gap-1.5 text-sm text-gray-400 sm:flex">
              {t("checkout.pressKey") || "Press"}
              <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-semibold text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                /
              </span>
            </span>
          )}

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
          onClick={() => setShowHeld((v) => !v)}
          className={`relative flex h-14 shrink-0 items-center justify-center gap-2.5 rounded-xl border px-5 text-base font-semibold shadow-theme-xs transition active:scale-[0.99] ${
            showHeld
              ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          }`}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="8.5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5V12l3 2" />
          </svg>
          {t("checkout.held") || "Held"}
          {heldOrders.length > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1 text-xs font-semibold text-white">
              {heldOrders.length}
            </span>
          )}
        </button>

      </div>

      {/* ── Held (parked) sales — BiLLZ-style slide-over drawer from the right ── */}
      <div
        className={`fixed inset-0 z-40 bg-gray-900/50 transition-opacity duration-300 ${
          showHeld ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setShowHeld(false)}
        aria-hidden="true"
      />
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-theme-lg transition-transform duration-300 dark:bg-gray-900 ${
          showHeld ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={t("checkout.heldTitle") || "Held sales"}
      >
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("checkout.heldTitle") || "Held sales"}
            {heldOrders.length > 0 && (
              <span className="ml-2 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                {heldOrders.length}
              </span>
            )}
          </h2>
          <button
            type="button"
            onClick={() => setShowHeld(false)}
            aria-label={t("common.close") || "Close"}
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-gray-200"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Search: order id, customer, cashier or note */}
        <div className="border-b border-gray-200 px-5 py-3 dark:border-gray-800">
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M3.04 9.374a6.333 6.333 0 1 1 11.318 3.92l2.82 2.82a.75.75 0 1 1-1.06 1.06l-2.82-2.82A6.333 6.333 0 0 1 3.04 9.374Zm6.333-4.832a4.833 4.833 0 1 0 0 9.666 4.833 4.833 0 0 0 0-9.666Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <input
              type="text"
              value={heldSearch}
              onChange={(e) => setHeldSearch(e.target.value)}
              placeholder={t("checkout.heldSearchPlaceholder") || "ID, client"}
              autoComplete="off"
              className={`${inputClass} pl-10`}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {filteredHeld.length === 0 ? (
            <p className="px-2 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
              {heldOrders.length === 0
                ? t("checkout.heldEmpty") || "No held sales"
                : t("checkout.heldNoMatch") || "Nothing found"}
            </p>
          ) : (
            <ul className="space-y-2.5">
              {filteredHeld.map((o) => (
                <li key={o.id} className="relative">
                  <button
                    type="button"
                    onClick={() => resumeHeld(o.id)}
                    disabled={resumingId !== null}
                    className="flex w-full items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3.5 pr-12 text-left transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                  >
                    <span className="shrink-0 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-brand-600 shadow-theme-xs dark:bg-white/[0.06] dark:text-brand-400">
                      {o.itemCount} {t("checkout.pieces")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-gray-800 dark:text-white/90">
                        #{o.id.slice(0, 8).toUpperCase()}
                        {o.customerName ? ` · ${o.customerName}` : ""}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">
                        {new Date(o.createdAt).toLocaleDateString("uz-UZ")} |{" "}
                        {new Date(o.createdAt).toLocaleTimeString("uz-UZ", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {o.cashierName ? ` · ${o.cashierName}` : ""}
                        {o.note ? ` · ${o.note}` : ""}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-sm font-semibold text-brand-600 dark:text-brand-400">
                        {formatMoney(Number(o.totalAmount))}
                      </span>
                      {resumingId === o.id ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="text-gray-400">
                          <path d="M7.5 5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={t("checkout.removeItem") || "Remove"}
                    onClick={() => deleteHeld(o.id)}
                    className="group absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg transition hover:bg-error-50 dark:hover:bg-error-500/10"
                  >
                    <DeleteIcon />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* ── Two columns: cart on the left, invoice/payment on the right ─────── */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Cart — a fixed, viewport-based height on desktop so it never
            shrinks/grows with the invoice panel; the item list scrolls inside. */}
        <div
          ref={cartRef}
          style={
            cartHeight
              ? ({ "--cart-h": `${cartHeight}px` } as React.CSSProperties)
              : undefined
          }
          className="relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 lg:h-[var(--cart-h,calc(100vh-290px))] lg:min-h-[480px] dark:border-gray-800"
        >
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
              {resumedHoldId && (
                <span className="rounded-full bg-warning-50 px-2.5 py-0.5 text-xs font-semibold text-warning-600 dark:bg-warning-500/10 dark:text-warning-400">
                  {t("checkout.resumedBadge") || "Resumed"}
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
            <ul className="flex-1 divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
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
                      {line.stock > 0 && (
                        <span className="text-gray-400 dark:text-gray-500">
                          {" · "}
                          {line.stock} {t("checkout.inStock")}
                        </span>
                      )}
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
                      value={
                        qtyDraft?.id === line.productId
                          ? qtyDraft.value
                          : line.quantity
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        // Leave the field empty while the cashier is mid-edit
                        // instead of forcing it to 1.
                        if (v === "") {
                          setQtyDraft({ id: line.productId, value: "" });
                          return;
                        }
                        let n = Number(v);
                        if (Number.isNaN(n)) return;
                        // Hard cap at the remaining stock — can't sell more than
                        // is on hand. Warn when the entry is trimmed.
                        if (line.stock > 0 && n > line.stock) {
                          n = line.stock;
                          showToast(
                            "warning",
                            `${line.name} — ${t("checkout.onlyInStock") || "в наличии"}: ${line.stock}`,
                          );
                        }
                        setQtyDraft({ id: line.productId, value: String(n) });
                        changeQty(line.productId, n);
                      }}
                      onBlur={() => {
                        if (qtyDraft?.id === line.productId) {
                          const n = Number(qtyDraft.value);
                          changeQty(
                            line.productId,
                            qtyDraft.value === "" || Number.isNaN(n) ? 1 : n,
                          );
                        }
                        setQtyDraft(null);
                      }}
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

          {/* Keyboard shortcuts — a one-line bar at the card bottom; expanding
              slides a BiLLZ-style sheet up OVER the cart (no layout shift). */}
          <div className="hidden items-center justify-between gap-4 border-t border-gray-200 px-5 py-3 sm:flex dark:border-gray-800">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600 dark:text-gray-300">
              <span className="flex items-center gap-2">
                {t("checkout.shortcuts.move") || "Move"} <Kbd>↑</Kbd>
                <Kbd>↓</Kbd>
              </span>
              <span className="flex items-center gap-2">
                {t("checkout.shortcuts.qty") || "Quantity"} <Kbd>→</Kbd>
                <Kbd>←</Kbd>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowShortcuts(true)}
              aria-label={t("checkout.shortcuts.title") || "Shortcuts"}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200 hover:text-gray-700 dark:bg-white/[0.06] dark:text-gray-400 dark:hover:bg-white/[0.1]"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="m6 12 4-4 4 4" />
              </svg>
            </button>
          </div>

          {/* Expanded sheet — anchored to the cart card, slides up from the bar */}
          <div
            className={`absolute inset-x-0 bottom-0 z-20 hidden max-h-full flex-col overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-lg transition-all duration-300 sm:flex dark:border-gray-800 dark:bg-gray-900 ${
              showShortcuts
                ? "translate-y-0 opacity-100"
                : "pointer-events-none translate-y-6 opacity-0"
            }`}
            role="dialog"
            aria-label={t("checkout.shortcuts.title") || "Shortcuts"}
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                {t("checkout.shortcuts.title") || "Shortcuts"}
              </h3>
              <button
                type="button"
                onClick={() => setShowShortcuts(false)}
                aria-label={t("checkout.fewerOptions") || "Collapse"}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200 hover:text-gray-700 dark:bg-white/[0.06] dark:text-gray-400 dark:hover:bg-white/[0.1]"
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m6 8 4 4 4-4" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-2">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-brand-500 dark:text-brand-400">
                  {t("checkout.shortcuts.groupSearch") || "Search & add products"}
                </p>
                <ShortcutItem
                  label={t("checkout.shortcuts.search") || "Search"}
                  keys={["/"]}
                />
                <ShortcutItem
                  label={t("checkout.shortcuts.addProduct") || "Add product"}
                  keys={["Enter"]}
                />
              </div>
              <div className="space-y-3">
                <p className="text-sm font-semibold text-brand-500 dark:text-brand-400">
                  {t("checkout.shortcuts.groupCart") || "Cart"}
                </p>
                <ShortcutItem
                  label={t("checkout.shortcuts.move") || "Move"}
                  keys={["↑", "↓"]}
                />
                <ShortcutItem
                  label={t("checkout.shortcuts.qty") || "Quantity"}
                  keys={["→", "←"]}
                />
                <ShortcutItem
                  label={t("checkout.shortcuts.remove") || "Remove"}
                  keys={["Del"]}
                />
              </div>
              <div className="space-y-3">
                <p className="text-sm font-semibold text-brand-500 dark:text-brand-400">
                  {t("checkout.shortcuts.groupClient") || "Customer & discount"}
                </p>
                <ShortcutItem
                  label={t("checkout.shortcuts.customer") || "Customer"}
                  keys={["J"]}
                />
                <ShortcutItem
                  label={t("checkout.shortcuts.discount") || "Discount"}
                  keys={["K"]}
                />
              </div>
              <div className="space-y-3">
                <p className="text-sm font-semibold text-brand-500 dark:text-brand-400">
                  {t("checkout.shortcuts.groupPayment") || "Payment"}
                </p>
                <ShortcutItem
                  label={t("checkout.shortcuts.pay") || "Pay"}
                  keys={["L"]}
                />
                <ShortcutItem
                  label={t("checkout.shortcuts.hold") || "Hold"}
                  keys={["O"]}
                />
                <ShortcutItem
                  label={t("checkout.cash") || "Cash"}
                  keys={["F1"]}
                />
                <ShortcutItem
                  label={t("checkout.card") || "Card"}
                  keys={["F2"]}
                />
                <ShortcutItem
                  label={t("checkout.debt") || "Credit"}
                  keys={["F3"]}
                />
                <ShortcutItem
                  label={t("checkout.back") || "Back"}
                  keys={["B"]}
                />
                <ShortcutItem
                  label={t("checkout.shortcuts.completeSale") || "Complete sale"}
                  keys={[isMac ? "⌘" : "Ctrl", "↵"]}
                />
              </div>
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
                  {formatMoney(subtotal)}
                </span>
              </li>
              {/* Manual discount — hidden behind a toggle; one-tap % presets. */}
              <li className="text-sm">
                <div className="flex items-center justify-between gap-5">
                  <span className="text-gray-500 dark:text-gray-400">
                    {t("checkout.discount") || "Discount"}
                  </span>
                  {discountAmount > 0 ? (
                    <span className="flex items-center gap-2">
                      <span className="font-medium text-brand-600 dark:text-brand-400">
                        −{formatMoney(discountAmount)}
                      </span>
                      <button
                        type="button"
                        onClick={clearDiscount}
                        aria-label={t("checkout.removeDiscount") || "Remove discount"}
                        className="flex h-5 w-5 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/[0.06]"
                      >
                        ×
                      </button>
                    </span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">—</span>
                  )}
                </div>

                <div className="mt-2.5 space-y-2">
                    {/* Preset buttons first — one tap covers the common cases */}
                    <div className="grid grid-cols-5 gap-1.5">
                      {DISCOUNT_PRESETS.map((p) => {
                        const active =
                          !discountCustom &&
                          discountType === "percent" &&
                          discountValueNum === p;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => {
                              setDiscountCustom(false);
                              applyPreset(p);
                            }}
                            className={`h-10 rounded-lg border text-sm font-semibold transition active:scale-[0.97] ${
                              active
                                ? "border-brand-500 bg-brand-500 text-white shadow-theme-xs"
                                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                            }`}
                          >
                            {p}%
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => {
                          setDiscountCustom((v) => !v);
                          setTimeout(() => discountRef.current?.focus(), 0);
                        }}
                        className={`h-10 rounded-lg border text-xs font-semibold transition active:scale-[0.97] ${
                          discountCustom
                            ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                        }`}
                      >
                        {t("checkout.discountCustom") || "Custom"}
                      </button>
                    </div>
                    {/* Manual value (any % or fixed soʻm) behind the Custom button */}
                    {discountCustom && (
                      <div className="flex items-center gap-1.5">
                        <input
                          ref={discountRef}
                          type="number"
                          inputMode="numeric"
                          min="0"
                          value={discountInput}
                          onChange={(e) => setDiscountInput(e.target.value)}
                          placeholder="0"
                          className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-2 text-right text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90"
                        />
                        <div className="inline-flex h-10 shrink-0 items-stretch overflow-hidden rounded-lg border border-gray-300 dark:border-gray-700">
                          <button
                            type="button"
                            onClick={() => setDiscountType("amount")}
                            className={`px-2.5 text-xs font-medium transition ${
                              discountType === "amount"
                                ? "bg-brand-500 text-white"
                                : "bg-transparent text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/[0.03]"
                            }`}
                          >
                            {currency}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDiscountType("percent")}
                            className={`px-2.5 text-xs font-medium transition ${
                              discountType === "percent"
                                ? "bg-brand-500 text-white"
                                : "bg-transparent text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/[0.03]"
                            }`}
                          >
                            %
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
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

            {/* Client + note stay tucked behind a small toggle; the payment
                details now live in the full-screen payment drawer. */}
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t("checkout.client")}
              </span>
              <button
                type="button"
                onClick={() => setShowMore((v) => !v)}
                className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
              >
                {showMore
                  ? t("checkout.fewerOptions") || "Fewer options"
                  : t("checkout.moreOptions") || "More options"}
              </button>
            </div>

            {/* Optional client + note (non-debt) — kept out of the way under More.
                The client field searches the customer history like the debt one,
                so every sale can be attached to a customer, not just credit. */}
            {showMore && (
              <div className="mt-4 space-y-3 border-t border-gray-100 pt-4 dark:border-gray-800">
                <div className="relative">
                  <label className="mb-1 inline-block text-xs font-semibold text-gray-700 dark:text-gray-400">
                    {t("checkout.client")}{" "}
                    <span className="font-normal text-gray-400">
                      ({t("checkout.optional") || "optional"})
                    </span>
                  </label>
                  {customerUserId ? (
                    <div className="flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 dark:border-brand-500/30 dark:bg-brand-500/10">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-semibold text-white">
                        {customerName.trim().charAt(0).toUpperCase() || "?"}
                      </span>
                      <p className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800 dark:text-white/90">
                        {customerName}
                      </p>
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
                      <input
                        ref={customerRef}
                        type="text"
                        value={customerName}
                        onChange={(e) => {
                          setCustomerName(e.target.value);
                          setCustomerUserId(null);
                        }}
                        onFocus={() => setCustomerFocused(true)}
                        onBlur={() => setTimeout(() => setCustomerFocused(false), 150)}
                        placeholder={t("checkout.clientPlaceholder")}
                        className={inputClass}
                        autoComplete="off"
                      />
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
                    </>
                  )}
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

            {/* Primary action — opens the full-screen payment drawer */}
            <button
              type="button"
              onClick={() => openPayment()}
              disabled={cart.length === 0 || isSubmitting || hasOversell}
              className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-brand-500 text-base font-semibold text-white shadow-theme-md transition hover:bg-brand-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>
                {`${t("checkout.pay") || "Pay"}${total > 0 ? ` · ${formatMoney(total)}` : ""}`}
              </span>
            </button>

            {/* Park the sale for later (BiLLZ "Kechiktirish", hotkey O). */}
            <button
              type="button"
              onClick={handleHold}
              disabled={cart.length === 0 || isHolding || isSubmitting}
              className="mt-2.5 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-700 shadow-theme-xs transition hover:bg-gray-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-white/[0.03]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="8.5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5V12l3 2" />
              </svg>
              <span>
                {isHolding
                  ? t("checkout.holding") || "..."
                  : t("checkout.hold") || "Hold"}
              </span>
            </button>
          </div>
        </aside>
      </div>

      {/* ── Payment drawer — slides in from the RIGHT, below the app header. The
          payment is composed from method entries; tapping a tile auto-fills
          what's left to pay. ── */}
      <div
        style={{ top: headerBottom }}
        className={`fixed inset-x-0 bottom-0 z-40 bg-gray-900/50 transition-opacity duration-300 ${
          showPayment ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closePayment}
        aria-hidden="true"
      />
      <aside
        style={{ top: headerBottom, height: `calc(100dvh - ${headerBottom}px)` }}
        className={`fixed right-0 z-50 flex w-full max-w-4xl bg-gray-50 shadow-theme-lg transition-transform duration-300 dark:bg-gray-950 ${
          showPayment ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={t("checkout.pay") || "Pay"}
      >
        {/* Receipt preview (desktop) */}
          <div className="hidden w-[380px] shrink-0 overflow-y-auto border-r border-gray-200 p-8 lg:block dark:border-gray-800">
            <div className="rounded-lg bg-white p-6 text-gray-800 shadow-theme-md dark:bg-gray-900 dark:text-white/90">
              <p className="border-b border-gray-200 pb-3 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
                {new Date().toLocaleString("uz-UZ", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {customerName.trim() ? ` · ${customerName.trim()}` : ""}
              </p>
              <div className="space-y-3 border-b border-gray-200 py-4 dark:border-gray-800">
                {cart.map((l, i) => (
                  <div key={l.productId}>
                    <p className="text-sm font-medium">
                      {i + 1}. {l.name}
                    </p>
                    <div className="mt-1 flex items-baseline text-sm">
                      <span className="whitespace-nowrap text-gray-500 dark:text-gray-400">
                        {l.quantity} × {new Intl.NumberFormat("uz-UZ").format(l.price)}
                      </span>
                      <span className="mx-2 flex-1 border-t border-dashed border-gray-300 dark:border-gray-700" />
                      <span className="whitespace-nowrap font-semibold">
                        {formatMoney(l.price * l.quantity)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-2 py-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">{t("checkout.subtotal")}</span>
                  <span>{formatMoney(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">{t("checkout.discount")}</span>
                    <span>−{formatMoney(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold">
                  <span>{t("checkout.total") || "Total"}</span>
                  <span>{formatMoney(total)}</span>
                </div>
                {payEntries.map((e) => (
                  <div key={e.method} className="flex justify-between italic text-gray-500 dark:text-gray-400">
                    <span>{t(`checkout.${e.method}`) || e.method}</span>
                    <span>{formatMoney(Number(e.amount) || 0)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Payment area */}
          <div className="flex min-w-0 flex-1 flex-col overflow-y-auto p-5 sm:p-8">
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleComplete}
                disabled={!paymentValid || isSubmitting}
                className="flex h-12 items-center gap-2.5 rounded-xl bg-brand-500 px-6 text-sm font-semibold text-white shadow-theme-md transition hover:bg-brand-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting
                  ? t("checkout.completing")
                  : t("checkout.pay") || "Pay"}
                <span className="rounded-md border border-white/40 px-1.5 py-0.5 text-xs font-semibold">
                  L
                </span>
              </button>
            </div>

            {/* Totals */}
            <div className="mt-8 flex flex-wrap gap-x-14 gap-y-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("checkout.totalPayable") || "Total"}:
                </p>
                <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
                  {formatMoney(total)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-success-600 dark:text-success-500">
                  {t("checkout.payRemaining") || "To pay"}:
                </p>
                <p className="mt-1 text-3xl font-bold text-success-600 dark:text-success-500">
                  {formatMoney(payRemaining)}
                </p>
              </div>
              {change > 0 && (
                <div>
                  <p className="text-sm font-medium text-warning-600 dark:text-warning-400">
                    {t("checkout.change") || "Change"}:
                  </p>
                  <p className="mt-1 text-3xl font-bold text-warning-600 dark:text-warning-400">
                    {formatMoney(change)}
                  </p>
                </div>
              )}
            </div>

            {/* Method tiles — tapping auto-fills the remaining amount */}
            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {(
                [
                  ["cash", "F1"],
                  ["card", "F2"],
                  ["debt", "F3"],
                ] as const
              ).map(([m, hotkey]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => addPayEntry(m)}
                  className="flex h-14 items-center justify-between rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 shadow-theme-xs transition hover:bg-gray-50 active:scale-[0.99] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-white/[0.03]"
                >
                  <span className="flex items-center gap-2.5">
                    {t(`checkout.${m}`) || m}
                    <span className="rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-xs font-semibold text-gray-500 dark:border-gray-700 dark:bg-white/[0.06] dark:text-gray-400">
                      {hotkey}
                    </span>
                  </span>
                  <span className="text-xl font-semibold text-brand-500">+</span>
                </button>
              ))}
            </div>

            {/* Payment entries */}
            {payEntries.length > 0 && (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {payEntries.map((e) => (
                  <div
                    key={e.method}
                    className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
                        {t(`checkout.${e.method}`) || e.method}
                      </span>
                      <button
                        type="button"
                        onClick={() => removePayEntry(e.method)}
                        aria-label={t("checkout.removeItem") || "Remove"}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-error-500 transition hover:bg-error-50 dark:hover:bg-error-500/10"
                      >
                        ×
                      </button>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatNumberInput(e.amount)}
                      onChange={(ev) =>
                        updatePayEntry(e.method, digitsOnly(ev.target.value))
                      }
                      placeholder="0"
                      className={`${inputClass} text-right text-base font-semibold`}
                    />
                    {e.method === "cash" && cashChips.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {cashChips.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => updatePayEntry("cash", String(c))}
                            className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                          >
                            {formatMoney(c)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {payEntries.length > 0 && payRemaining > 0 && (
              <p className="mt-3 text-sm text-error-500">
                {t("checkout.underpaid") || "Amount is less than the total"}
              </p>
            )}

            {/* Debt details — required when a debt entry is present */}
            {hasDebt && (
              <div className="mt-6 max-w-md space-y-3">
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
                        className={inputClass}
                        autoComplete="off"
                      />
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
          </div>
      </aside>
    </div>
  );
}

/** One row of the shortcuts legend: an action label + its key chips. */
function ShortcutItem({ label, keys }: { label: string; keys: string[] }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
      <span>{label}</span>
      <span className="flex items-center gap-1.5">
        {keys.map((k) => (
          <Kbd key={k}>{k}</Kbd>
        ))}
      </span>
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
