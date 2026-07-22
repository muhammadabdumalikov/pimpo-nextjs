"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import { useSidebar } from "@/context/SidebarContext";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import {
  getOrders,
  getOrder,
  getSalesSummary,
  updateOrder,
  getStaff,
  searchCustomers,
  resolveReceiptTemplate,
  getStoredAccount,
  type Order,
  type SalesSummary,
  type Staff,
  type UpdateOrderDto,
} from "@/lib/api";
import {
  buildReceiptHtml,
  printReceiptHtml,
  type ReceiptData,
} from "@/lib/receiptRender";
import { receiptTplStrings } from "@/lib/receiptTemplateI18n";
import type { Locale } from "@/i18n/config";
import SelectField from "@/components/form/SelectField";
import DateRangeFilter, { toYmd, type DateRange } from "./DateRangeFilter";
import { storeToday } from "@/lib/reportFormat";
import SalesFilters, {
  EMPTY_FILTERS,
  type SalesFilterValues,
} from "./SalesFilters";

const PAGE_SIZE = 50;

const CARD =
  "rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]";

/** Today (store timezone) as the YYYY-MM-DD string the API expects. */
function todayStr() {
  return toYmd(storeToday());
}

export default function AllSales() {
  const { t, locale } = useTranslations();
  const { showToast } = useToast();
  const { headerOpen } = useSidebar();
  const receiptStrings = useMemo(() => receiptTplStrings(locale as Locale), [locale]);

  // The detail drawer starts below the app header so its (higher z-index) bar
  // never covers the drawer's top — re-measured when the header is toggled.
  const [headerBottom, setHeaderBottom] = useState(0);
  useEffect(() => {
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

  // Filters: an inclusive day range (BiLLZ-style; default = today). Both empty
  // means all time.
  const [range, setRange] = useState<DateRange>({
    from: todayStr(),
    to: todayStr(),
  });
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [filters, setFilters] = useState<SalesFilterValues>(EMPTY_FILTERS);

  // Filters live in the URL so navigating into a sale and back (or a reload)
  // keeps the view. Restored once on mount; written on every change below.
  const filtersRestoredRef = useRef(false);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("all") === "1") {
      setRange({ from: "", to: "" });
    } else if (p.has("from") || p.has("to")) {
      setRange({ from: p.get("from") ?? "", to: p.get("to") ?? "" });
    }
    const q = p.get("q");
    if (q) {
      setSearch(q);
      setDebounced(q);
    }
    const restored: SalesFilterValues = {
      paymentMethod: p.get("pm") ?? "",
      cashierId: p.get("cashier") ?? "",
      minAmount: p.get("min") ?? "",
      maxAmount: p.get("max") ?? "",
    };
    if (restored.paymentMethod || restored.cashierId || restored.minAmount || restored.maxAmount) {
      setFilters(restored);
    }
    filtersRestoredRef.current = true;
  }, []);

  useEffect(() => {
    if (!filtersRestoredRef.current) return;
    const p = new URLSearchParams();
    const today = todayStr();
    if (!range.from && !range.to) {
      p.set("all", "1");
    } else if (range.from !== today || range.to !== today) {
      if (range.from) p.set("from", range.from);
      if (range.to) p.set("to", range.to);
    }
    if (debounced) p.set("q", debounced);
    if (filters.paymentMethod) p.set("pm", filters.paymentMethod);
    if (filters.cashierId) p.set("cashier", filters.cashierId);
    if (filters.minAmount) p.set("min", filters.minAmount);
    if (filters.maxAmount) p.set("max", filters.maxAmount);
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [range, debounced, filters]);

  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [summary, setSummary] = useState<SalesSummary | null>(null);

  // Sale detail — a BiLLZ-style slide-over drawer from the right.
  const [detail, setDetail] = useState<Order | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  // Lock background scroll while the detail drawer is open.
  useBodyScrollLock(detailOpen);

  // Edit mode inside the drawer ("Tranzaksiyani tahrirlash"): only the sale's
  // metadata is editable — date, customer, cashier, note. Money stays as rung.
  const [editMode, setEditMode] = useState(false);
  const [editCustomerId, setEditCustomerId] = useState("");
  const [customerOptions, setCustomerOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [editCashierId, setEditCashierId] = useState("");
  const [editNote, setEditNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!detailOpen) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDetailOpen(false);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [detailOpen]);

  const currency = "UZS";
  const fmt = (v: number | string) =>
    new Intl.NumberFormat("uz-UZ").format(Math.round(Number(v) || 0));

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  // First page (replaces the list) whenever the filters change.
  const loadFirst = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getOrders(
        1,
        PAGE_SIZE,
        debounced || undefined,
        "Completed",
        range.from || undefined,
        range.to || undefined,
        filters,
      );
      setOrdersList(res.orders);
      setTotal(res.total);
      setPage(1);
    } catch (e) {
      showToast("error", (e as Error).message, "Error");
    } finally {
      setLoading(false);
    }
  }, [debounced, range, filters, showToast]);

  useEffect(() => {
    loadFirst();
  }, [loadFirst]);

  // Summary follows the date range (not the text search) — it's the report.
  const refreshSummary = useCallback(() => {
    getSalesSummary(range.from || undefined, range.to || undefined)
      .then(setSummary)
      .catch(() => {
        /* non-fatal */
      });
  }, [range]);
  useEffect(() => {
    refreshSummary();
  }, [refreshSummary]);

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const res = await getOrders(
        next,
        PAGE_SIZE,
        debounced || undefined,
        "Completed",
        range.from || undefined,
        range.to || undefined,
        filters,
      );
      setOrdersList((prev) => [...prev, ...res.orders]);
      setTotal(res.total);
      setPage(next);
    } catch (e) {
      showToast("error", (e as Error).message, "Error");
    } finally {
      setLoadingMore(false);
    }
  };

  const openDetail = async (id: string) => {
    setDetailOpen(true);
    setDetail(null);
    setEditMode(false);
    try {
      setDetail(await getOrder(id));
    } catch (e) {
      setDetailOpen(false);
      showToast("error", (e as Error).message, "Error");
    }
  };

  // ── Edit mode ─────────────────────────────────────────────────────────────
  // Reprint any past sale's receipt (same renderer as checkout). Uses the
  // business-wide default template; falls back to the account name for the store.
  const printReceipt = async (order: Order) => {
    const account = getStoredAccount();
    const created = order.createdAt ? new Date(order.createdAt) : new Date();
    const data: ReceiptData = {
      saleNumber: order.id.slice(0, 8),
      storeName: account?.name || receiptStrings.out.defaultStoreName,
      date: created.toLocaleDateString(receiptStrings.out.dateLocale),
      time: created.toLocaleTimeString(receiptStrings.out.dateLocale, {
        hour: "2-digit",
        minute: "2-digit",
      }),
      cashier: order.cashierName ?? account?.name ?? undefined,
      customer: order.customerName ?? undefined,
      saleComment: order.note ?? undefined,
      items: (order.items ?? []).map((it) => ({
        name: it.productName,
        qty: it.quantity,
        price: Number(it.priceOut),
      })),
      subtotal: Number(order.subtotalAmount),
      discount: Number(order.discountAmount),
      total: Number(order.totalAmount),
      currency: receiptStrings.out.currency,
    };
    try {
      const template = await resolveReceiptTemplate();
      printReceiptHtml(buildReceiptHtml(template, data, receiptStrings), 80);
    } catch {
      showToast("error", t("sales.printFailed") || "Failed to print receipt", "Error");
    }
  };

  const startEdit = () => {
    if (!detail) return;
    setEditCustomerId(detail.userId ?? "");
    setCustomerOptions(
      detail.userId && detail.customerName
        ? [{ value: detail.userId, label: detail.customerName }]
        : [],
    );
    setEditCashierId(detail.cashierId ?? "");
    setEditNote(detail.note ?? "");
    setEditMode(true);
    if (staffList.length === 0) {
      getStaff()
        .then(setStaffList)
        .catch(() => {
          /* non-fatal — the current cashier stays selectable */
        });
    }
  };

  const onCustomerSearch = (q: string) => {
    const term = q.trim();
    if (!term) return;
    setCustomerLoading(true);
    searchCustomers(term, 8)
      .then((r) =>
        setCustomerOptions(
          r.map((c) => ({ value: c.id, label: `${c.name} — ${c.phone}` })),
        ),
      )
      .catch(() => {
        /* non-fatal */
      })
      .finally(() => setCustomerLoading(false));
  };

  // Cashier choices: the staff list plus the sale's current cashier (the
  // owner isn't in the staff table but must stay selectable).
  const cashierOptions = useMemo(() => {
    const opts = staffList.map((s) => ({ value: s.id, label: s.name }));
    if (
      detail?.cashierId &&
      !opts.some((o) => o.value === detail.cashierId)
    ) {
      opts.unshift({
        value: detail.cashierId,
        label: detail.cashierName ?? "—",
      });
    }
    return opts;
  }, [staffList, detail]);

  const saveEdit = async () => {
    if (!detail || saving) return;
    // Send only what actually changed — the backend treats absent as "keep".
    // The sale timestamp is intentionally not editable.
    const payload: UpdateOrderDto = {};
    if (editCustomerId !== (detail.userId ?? "")) {
      payload.userId = editCustomerId || null;
      if (!editCustomerId) payload.customerName = null;
    }
    if (editCashierId !== (detail.cashierId ?? "")) {
      payload.cashierId = editCashierId || null;
    }
    if ((editNote.trim() || null) !== (detail.note ?? null)) {
      payload.note = editNote.trim() || null;
    }
    if (Object.keys(payload).length === 0) {
      setEditMode(false);
      return;
    }
    setSaving(true);
    try {
      const updated = await updateOrder(detail.id, payload);
      setDetail(updated);
      setEditMode(false);
      showToast("success", t("sales.updated") || "Saved", "Success");
      loadFirst();
      refreshSummary();
    } catch (e) {
      showToast("error", (e as Error).message, "Error");
    } finally {
      setSaving(false);
    }
  };

  // A day separator label: "Bugun" / "Kecha" / the date.
  const dayLabel = useCallback(
    (ymd: string) => {
      const todayYmd = toYmd(new Date());
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yestYmd = toYmd(y);
      if (ymd === todayYmd) return t("sales.today") || "Today";
      if (ymd === yestYmd) return t("sales.yesterday") || "Yesterday";
      const [yy, mm, dd] = ymd.split("-");
      return `${dd}.${mm}.${yy}`;
    },
    [t],
  );

  // Group the list by calendar day (keyed by YMD) for the dashed separators.
  const groups = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const o of ordersList) {
      const key = toYmd(new Date(o.createdAt));
      const list = map.get(key);
      if (list) list.push(o);
      else map.set(key, [o]);
    }
    return Array.from(map.entries());
  }, [ordersList]);

  const inputClass =
    "h-12 rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 shadow-theme-xs focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

  // On wide screens the page fills the viewport: header + search + the right
  // report column stay put while only the sales list scrolls. The height is
  // measured from the grid's top edge to the bottom of the viewport so it works
  // with the collapsible app header.
  const gridRef = useRef<HTMLDivElement>(null);
  const [gridHeight, setGridHeight] = useState<number | null>(null);
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const update = () => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      setGridHeight(Math.max(420, window.innerHeight - top - 24));
    };
    // The header show/hide is an animated grid-row inside a `min-h-screen`
    // layout, so the body never resizes and ResizeObserver misses the toggle.
    // Re-measure every frame for the ~300ms animation (the effect re-runs on
    // `headerOpen`) so the list reclaims the space a collapsed header leaves.
    let rafId = 0;
    const startedAt = Date.now();
    const tick = () => {
      update();
      if (Date.now() - startedAt < 400) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const ro = new ResizeObserver(update);
    ro.observe(document.body);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      ro.disconnect();
    };
  }, [headerOpen]);

  return (
    <div
      ref={gridRef}
      style={
        gridHeight
          ? ({ "--sales-h": `${gridHeight}px` } as React.CSSProperties)
          : undefined
      }
      className="grid grid-cols-1 gap-5 xl:h-[var(--sales-h,calc(100vh-220px))] xl:grid-cols-[minmax(0,1fr)_340px] xl:overflow-hidden"
    >
      {/* ── Left: fixed header + search, scrollable day-grouped sales list ── */}
      <div className="flex min-h-0 flex-col gap-4 max-xl:h-[var(--sales-h,calc(100vh-220px))]">
        <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
              {t("sales.title") || "All sales"}
            </h1>
            <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-brand-500 px-2.5 text-sm font-bold text-white shadow-theme-xs dark:bg-brand-500 dark:text-white">
              {total}
            </span>
          </div>
          <DateRangeFilter value={range} onChange={setRange} />
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("sales.searchPlaceholder") || "ID, client, user"}
              autoComplete="off"
              className={`${inputClass} w-full pl-11`}
            />
          </div>
          <SalesFilters value={filters} onChange={setFilters} />
        </div>

        {/* Scrollable list region — fills the viewport and scrolls internally at
            every width (fixed viewport height below xl, grid-managed at xl). */}
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
          </div>
        ) : ordersList.length === 0 ? (
          <div className={`${CARD} py-16 text-center`}>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("sales.empty") || "No sales found"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map(([day, list]) => (
              <React.Fragment key={day}>
                {/* Dashed day separator with a centered date chip */}
                <div className="relative flex items-center py-2">
                  <span className="flex-1 border-t border-dashed border-gray-300 dark:border-gray-700" />
                  <span className="mx-3 rounded-full border border-gray-200 bg-white px-4 py-1 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                    {dayLabel(day)}
                  </span>
                  <span className="flex-1 border-t border-dashed border-gray-300 dark:border-gray-700" />
                </div>
                {list.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => openDetail(o.id)}
                    className={`${CARD} flex w-full items-center gap-4 px-4 py-4 text-left transition hover:bg-gray-50 sm:px-5 dark:hover:bg-white/[0.04]`}
                  >
                    <span className="shrink-0 rounded-xl bg-gray-100 px-3 py-2 text-sm font-semibold text-brand-600 dark:bg-white/[0.06] dark:text-brand-400">
                      {o.itemTypes ?? 0} {t("sales.types") || "types"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-gray-800 dark:text-white/90">
                        {t("sales.sale") || "Sale"} #{o.id.slice(0, 8).toUpperCase()}
                        {o.customerName ? (
                          <span className="ml-2 font-medium text-gray-500 dark:text-gray-400">
                            {o.customerName}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-sm text-gray-500 dark:text-gray-400">
                        {new Date(o.createdAt).toLocaleDateString("uz-UZ")} |{" "}
                        {new Date(o.createdAt).toLocaleTimeString("uz-UZ", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-sm font-bold text-brand-600 dark:text-brand-400">
                        {fmt(o.totalAmount)} {currency}
                      </span>
                      {o.cashierName && (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                          <span className="h-2 w-2 rounded-full bg-brand-500" />
                          {o.cashierName}
                        </span>
                      )}
                    </span>
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 20 20"
                      fill="none"
                      className="shrink-0 text-gray-400"
                    >
                      <path
                        d="M7.5 5l5 5-5 5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                ))}
              </React.Fragment>
            ))}
            {ordersList.length < total && (
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="flex h-12 w-full items-center justify-center rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              >
                {loadingMore
                  ? "..."
                  : `${t("sales.loadMore") || "Load more"} (${ordersList.length}/${total})`}
              </button>
            )}
          </div>
        )}
        </div>
      </div>

      {/* ── Right: day report cards (BiLLZ-style) — fixed, scrolls if tall ── */}
      <div className="flex min-h-0 flex-col gap-4 xl:overflow-y-auto">
        <div className={`${CARD} p-5`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t("sales.transactions") || "Transactions"}
              </p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {summary ? summary.count : "—"}{" "}
                <span className="text-sm font-semibold text-gray-500">
                  {t("checkout.pieces") || "pcs"}
                </span>
              </p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-white/[0.06] dark:text-gray-300">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" d="M4 6h16M4 12h10M4 18h7" />
              </svg>
            </span>
          </div>
          <div className="my-4 border-t border-dashed border-gray-300 dark:border-gray-700" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t("sales.goods") || "Goods"}
              </p>
              <p className="mt-0.5 text-sm font-bold text-brand-600 dark:text-brand-400">
                {summary ? fmt(summary.units) : "—"} {t("checkout.pieces") || "pcs"}
              </p>
            </div>
          </div>
        </div>

        <div className={`${CARD} p-5`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t("sales.amountTitle") || "Transactions total"}
              </p>
              <p className="mt-1 text-2xl font-bold text-brand-600 dark:text-brand-400">
                {summary ? fmt(summary.revenue) : "—"} {currency}
              </p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-white/[0.06] dark:text-gray-300">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="2.5" y="6.5" width="19" height="11" rx="2" />
                <circle cx="12" cy="12" r="2.75" />
              </svg>
            </span>
          </div>
          <div className="my-4 border-t border-dashed border-gray-300 dark:border-gray-700" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t("checkout.cash") || "Cash"}
              </p>
              <p className="mt-0.5 text-sm font-bold text-brand-600 dark:text-brand-400">
                {summary ? fmt(summary.cash) : "—"} {currency}
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t("checkout.card") || "Card"}
              </p>
              <p className="mt-0.5 text-sm font-bold text-brand-600 dark:text-brand-400">
                {summary ? fmt(summary.card) : "—"} {currency}
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t("sales.debt") || "On credit"}
              </p>
              <p className="mt-0.5 text-sm font-bold text-warning-600 dark:text-warning-400">
                {summary ? fmt(summary.debt) : "—"} {currency}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sale detail — slide-over drawer from the right (BiLLZ-style) ── */}
      <div
        className={`fixed inset-0 z-40 bg-gray-900/50 transition-opacity duration-300 ${
          detailOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setDetailOpen(false)}
        aria-hidden="true"
      />
      <aside
        style={{ top: headerBottom, height: `calc(100dvh - ${headerBottom}px)` }}
        className={`fixed right-0 z-50 flex w-full max-w-lg flex-col bg-white shadow-theme-lg transition-transform duration-300 dark:bg-gray-900 ${
          detailOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={t("sales.sale") || "Sale"}
      >
        {!detail ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
          </div>
        ) : editMode ? (
          <>
            {/* Edit header */}
            <div className="flex items-start justify-between gap-3 px-6 pb-4 pt-6">
              <div>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                  {t("sales.editTitle") || "Edit transaction"}
                </p>
                <h2 className="mt-0.5 text-2xl font-extrabold text-gray-800 dark:text-white/90">
                  {t("sales.sale") || "Sale"} #{detail.id.slice(0, 8).toUpperCase()}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                aria-label="×"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200 hover:text-gray-700 dark:bg-white/[0.06] dark:text-gray-400 dark:hover:bg-white/[0.1]"
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Edit form: date, customer, cashier, note */}
            <div className="flex-1 space-y-5 overflow-y-auto px-6 pb-8 pt-2">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 inline-block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {t("sales.saleDate") || "Sale date"}
                  </label>
                  {/* Read-only: the sale timestamp cannot be changed. */}
                  <input
                    type="text"
                    disabled
                    readOnly
                    value={`${new Date(detail.createdAt).toLocaleDateString("uz-UZ")} | ${new Date(
                      detail.createdAt,
                    ).toLocaleTimeString("uz-UZ", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`}
                    className={`${inputClass} w-full cursor-not-allowed opacity-60`}
                  />
                </div>
                <div>
                  <label className="mb-1.5 inline-block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {t("checkout.client") || "Client"}
                  </label>
                  <SelectField
                    value={editCustomerId}
                    onChange={setEditCustomerId}
                    placeholder={t("sales.selectClient") || "Select a client"}
                    options={[{ value: "", label: "—" }, ...customerOptions]}
                    onSearch={onCustomerSearch}
                    loading={customerLoading}
                    disabled={detail.paymentMethod === "debt"}
                  />
                </div>
                <div>
                  <label className="mb-1.5 inline-block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {t("sales.cashier") || "Cashier"}
                  </label>
                  <SelectField
                    value={editCashierId}
                    onChange={setEditCashierId}
                    placeholder="—"
                    options={cashierOptions}
                  />
                </div>
              </div>
              {detail.paymentMethod === "debt" && (
                <p className="rounded-lg bg-warning-50 px-3 py-2 text-sm text-warning-700 dark:bg-warning-500/10 dark:text-warning-400">
                  {t("sales.debtCustomerLocked") ||
                    "The customer of a debt sale cannot be changed."}
                </p>
              )}
              <div>
                <label className="mb-1.5 inline-block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {t("checkout.note") || "Note"}
                </label>
                <textarea
                  rows={4}
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder={t("sales.notePlaceholder") || "Add a note"}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 shadow-theme-xs focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditMode(false)}
                  disabled={saving}
                  className="flex h-12 flex-1 items-center justify-center rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                >
                  {t("sales.cancel") || "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={saving}
                  className="flex h-12 flex-1 items-center justify-center rounded-xl bg-brand-500 text-sm font-semibold text-white shadow-theme-md transition hover:bg-brand-600 disabled:opacity-50"
                >
                  {saving ? "..." : t("sales.save") || "Save"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Header: id + big total + close */}
            <div className="flex items-start justify-between gap-3 px-6 pb-4 pt-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">
                  {t("sales.sale") || "Sale"} #{detail.id.slice(0, 8).toUpperCase()}
                </h2>
                <p className="mt-1 text-2xl font-extrabold text-brand-600 dark:text-brand-400">
                  {fmt(detail.totalAmount)} {currency}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                aria-label="×"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200 hover:text-gray-700 dark:bg-white/[0.06] dark:text-gray-400 dark:hover:bg-white/[0.1]"
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-6 pb-8">
              {/* Payment breakdown */}
              <div>
                <p className="mb-2.5 text-sm font-bold text-gray-800 dark:text-white/90">
                  {t("sales.payment") || "Payment"}
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  {(detail.payments ?? []).map((p, i) => (
                    <div
                      key={`${p.method}-${i}`}
                      className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-white/[0.04]"
                    >
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {t(`checkout.${p.method}`) || p.method}
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-brand-600 dark:text-brand-400">
                        {fmt(p.amount)} {currency}
                      </p>
                    </div>
                  ))}
                  {detail.paymentMethod === "debt" && (
                    <div className="rounded-xl bg-warning-50 px-4 py-3 dark:bg-warning-500/10">
                      <p className="text-sm font-semibold text-warning-700 dark:text-warning-400">
                        {t("sales.debt") || "On credit"}
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-warning-600 dark:text-warning-400">
                        {fmt(
                          Number(detail.totalAmount) -
                            (detail.payments ?? []).reduce(
                              (s, p) => s + p.amount,
                              0,
                            ),
                        )}{" "}
                        {currency}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Cart */}
              <div>
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-gray-800 dark:text-white/90">
                    {t("checkout.orderDetails") || "Cart"}
                  </p>
                  {detail.cashierName && (
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {t("sales.cashier") || "Cashier"}:
                      <span className="h-2 w-2 rounded-full bg-brand-500" />
                      {detail.cashierName}
                    </p>
                  )}
                </div>
                <div className="space-y-2.5">
                  {(detail.items ?? []).map((it) => (
                    <div
                      key={it.id}
                      className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 dark:bg-white/[0.04]"
                    >
                      <p className="min-w-0 flex-1 text-sm font-semibold text-gray-800 dark:text-white/90">
                        {it.quantity} {t("checkout.pieces") || "pcs"}{" "}
                        <span className="text-gray-400">×</span> {it.productName}
                      </p>
                      <p className="shrink-0 text-sm font-bold text-brand-600 dark:text-brand-400">
                        {fmt(it.lineTotal)} {currency}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 space-y-1.5 px-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">
                      {t("checkout.subtotal") || "Subtotal"}
                    </span>
                    <span className="font-semibold text-gray-800 dark:text-white/90">
                      {fmt(detail.subtotalAmount)} {currency}
                    </span>
                  </div>
                  {Number(detail.discountAmount) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">
                        {t("checkout.discount") || "Discount"}
                      </span>
                      <span className="font-semibold text-brand-600 dark:text-brand-400">
                        −{fmt(detail.discountAmount)} {currency}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Details tiles */}
              <div>
                <p className="mb-2.5 text-sm font-bold text-gray-800 dark:text-white/90">
                  {t("sales.details") || "Details"}
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-white/[0.04]">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      {t("sales.dateTime") || "Date & time"}:
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-gray-800 dark:text-white/90">
                      {new Date(detail.createdAt).toLocaleDateString("uz-UZ")} |{" "}
                      {new Date(detail.createdAt).toLocaleTimeString("uz-UZ", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </p>
                  </div>
                  {detail.customerName && (
                    <div className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-white/[0.04]">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                        {t("checkout.client") || "Client"}:
                      </p>
                      <p className="mt-0.5 truncate text-sm font-bold text-gray-800 dark:text-white/90">
                        {detail.customerName}
                      </p>
                    </div>
                  )}
                  <div className="col-span-2 rounded-xl bg-gray-50 px-4 py-3 dark:bg-white/[0.04]">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      {t("checkout.note") || "Note"}:
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-gray-800 dark:text-white/90">
                      {detail.note || "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions pinned to the bottom so they stay reachable and clear of
                the app header when it expands over the drawer's top. */}
            <div className="flex shrink-0 gap-3 border-t border-gray-200 p-4 dark:border-gray-800">
              <button
                type="button"
                onClick={() => detail && printReceipt(detail)}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-700 shadow-theme-xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-white/[0.03]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M6 14h12v7H6z" />
                </svg>
                {t("sales.printReceipt") || "Print receipt"}
              </button>
              <button
                type="button"
                onClick={startEdit}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-500 text-sm font-semibold text-white shadow-theme-md transition hover:bg-brand-600"
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.75 3.25a1.77 1.77 0 0 1 2.5 2.5L6.5 15.5l-3.25.75.75-3.25 9.75-9.75Z" />
                </svg>
                {t("sales.edit") || "Edit"}
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
