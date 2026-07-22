"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  getOrders,
  getOrder,
  updateOrderStatus,
  type Order,
} from "@/lib/api";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import { useSidebar } from "@/context/SidebarContext";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import Badge from "@/components/ui/badge/Badge";

const PAGE_SIZE = 50;

type StoreStatus = "Pending" | "Confirmed" | "Completed" | "Cancelled";
const STATUS_TABS: (StoreStatus | "")[] = [
  "",
  "Pending",
  "Confirmed",
  "Completed",
  "Cancelled",
];

function statusColor(
  status: string,
): "warning" | "info" | "success" | "error" | "light" {
  switch (status) {
    case "Pending":
      return "warning";
    case "Confirmed":
      return "info";
    case "Completed":
      return "success";
    case "Cancelled":
      return "error";
    default:
      return "light";
  }
}

export default function OnlineOrders() {
  const { t } = useTranslations();
  const { showToast } = useToast();
  const { headerOpen } = useSidebar();

  // The detail drawer starts below the app header so its (higher z-index) bar
  // never covers the drawer's top — re-measured when the header is toggled.
  // (Same pattern as the AllSales slide-over.)
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

  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [statusTab, setStatusTab] = useState<StoreStatus | "">("Pending");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  // Detail drawer
  const [detail, setDetail] = useState<Order | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [cancelAsk, setCancelAsk] = useState(false);
  useBodyScrollLock(detailOpen);

  useEffect(() => {
    if (!detailOpen) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDetailOpen(false);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [detailOpen]);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 400);
    return () => clearTimeout(id);
  }, [search]);

  const fetchOrders = useCallback(
    async (pageNum: number, append: boolean) => {
      const res = await getOrders(
        pageNum,
        PAGE_SIZE,
        debounced || undefined,
        statusTab || undefined,
        undefined,
        undefined,
        { source: "store" },
      );
      setTotal(res.total);
      setPage(pageNum);
      setOrdersList((prev) => (append ? [...prev, ...res.orders] : res.orders));
    },
    [debounced, statusTab],
  );

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchOrders(1, false)
      .catch((e) => {
        if (alive) showToast("error", (e as Error).message, "Error");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchOrders]);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      await fetchOrders(page + 1, true);
    } catch (e) {
      showToast("error", (e as Error).message, "Error");
    } finally {
      setLoadingMore(false);
    }
  }, [fetchOrders, page, showToast]);

  const openDetail = useCallback(
    async (id: string) => {
      setDetail(null);
      setDetailOpen(true);
      setDetailLoading(true);
      setCancelAsk(false);
      try {
        setDetail(await getOrder(id));
      } catch (e) {
        showToast("error", (e as Error).message, "Error");
        setDetailOpen(false);
      } finally {
        setDetailLoading(false);
      }
    },
    [showToast],
  );

  // Keep `detail` mounted on close so the content doesn't blank out while the
  // drawer slides away.
  const closeDetail = useCallback(() => {
    setDetailOpen(false);
    setCancelAsk(false);
  }, []);

  const transition = useCallback(
    async (status: StoreStatus) => {
      if (!detail) return;
      setUpdating(true);
      try {
        const updated = await updateOrderStatus(detail.id, status);
        setDetail(updated);
        setCancelAsk(false);
        showToast("success", t("onlineOrders.statusUpdated"));
        // Refresh the list so the row reflects the new status / leaves the tab.
        await fetchOrders(1, false);
      } catch (e) {
        showToast("error", (e as Error).message, "Error");
      } finally {
        setUpdating(false);
      }
    },
    [detail, fetchOrders, showToast, t],
  );

  const fmtMoney = useMemo(() => new Intl.NumberFormat("uz-UZ"), []);
  const fmtDate = useCallback((iso: string) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString("uz-UZ")} ${d.toLocaleTimeString("uz-UZ", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }, []);

  const statusLabel = useCallback(
    (status: string) => {
      const key = `onlineOrders.status${status}`;
      const label = t(key);
      return label === key ? status : label;
    },
    [t],
  );

  const inputClass =
    "h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 shadow-theme-xs focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

  const canConfirm = detail?.status === "Pending";
  const canComplete =
    detail?.status === "Pending" || detail?.status === "Confirmed";
  const canCancel =
    detail?.status === "Pending" || detail?.status === "Confirmed";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
            {t("onlineOrders.title")}
          </h1>
          <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-brand-500 px-2.5 text-sm font-bold text-white shadow-theme-xs">
            {total}
          </span>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab || "all"}
            type="button"
            onClick={() => setStatusTab(tab)}
            className={`h-10 rounded-xl px-4 text-sm font-medium transition ${
              statusTab === tab
                ? "bg-brand-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            {tab ? statusLabel(tab) : t("onlineOrders.tabAll")}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t("onlineOrders.searchPlaceholder")}
        className={inputClass}
      />

      {/* List */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500"
              aria-hidden
            />
          </div>
        ) : ordersList.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1 py-16 text-center">
            <p className="text-base font-semibold text-gray-700 dark:text-white/80">
              {t("onlineOrders.empty")}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("onlineOrders.emptyHint")}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  <th className="px-5 py-3 font-medium">
                    {t("onlineOrders.date")}
                  </th>
                  <th className="px-5 py-3 font-medium">ID</th>
                  <th className="px-5 py-3 font-medium">
                    {t("onlineOrders.customer")}
                  </th>
                  <th className="px-5 py-3 font-medium">
                    {t("onlineOrders.phone")}
                  </th>
                  <th className="px-5 py-3 text-right font-medium">
                    {t("onlineOrders.total")}
                  </th>
                  <th className="px-5 py-3 font-medium">
                    {t("onlineOrders.status")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {ordersList.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => openDetail(o.id)}
                    className="cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.03]"
                  >
                    <td className="whitespace-nowrap px-5 py-3 text-gray-600 dark:text-gray-300">
                      {fmtDate(o.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-gray-500 dark:text-gray-400">
                      #{o.id.slice(0, 8)}
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-800 dark:text-white/90">
                      {o.customerName || t("onlineOrders.guest")}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-gray-600 dark:text-gray-300">
                      {o.customerPhone || "—"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right font-semibold text-gray-800 dark:text-white/90">
                      {fmtMoney.format(Number(o.totalAmount))}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">
                      <Badge variant="light" color={statusColor(o.status)}>
                        {statusLabel(o.status)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && ordersList.length < total && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className="h-11 rounded-xl border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          {loadingMore ? "…" : t("onlineOrders.loadMore")}
        </button>
      )}

      {/* ── Order detail — slide-over drawer from the right (BiLLZ-style, same
          pattern as AllSales) ── */}
      <div
        className={`fixed inset-0 z-40 bg-gray-900/50 transition-opacity duration-300 ${
          detailOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeDetail}
        aria-hidden="true"
      />
      <aside
        style={{ top: headerBottom, height: `calc(100dvh - ${headerBottom}px)` }}
        className={`fixed right-0 z-50 flex w-full max-w-lg flex-col bg-white shadow-theme-lg transition-transform duration-300 dark:bg-gray-900 ${
          detailOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={t("onlineOrders.detailTitle")}
      >
        {detailLoading || !detail ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
          </div>
        ) : (
          <>
            {/* Header: id + big total + status + close */}
            <div className="flex items-start justify-between gap-3 px-6 pb-4 pt-6">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">
                    {t("onlineOrders.detailTitle")} #{detail.id.slice(0, 8).toUpperCase()}
                  </h2>
                  <Badge variant="light" color={statusColor(detail.status)}>
                    {statusLabel(detail.status)}
                  </Badge>
                </div>
                <p className="mt-1 text-2xl font-extrabold text-brand-600 dark:text-brand-400">
                  {fmtMoney.format(Number(detail.totalAmount))} UZS
                </p>
              </div>
              <button
                type="button"
                onClick={closeDetail}
                aria-label="×"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200 hover:text-gray-700 dark:bg-white/[0.06] dark:text-gray-400 dark:hover:bg-white/[0.1]"
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-6 pb-8">
              {/* Customer */}
              <div>
                <p className="mb-2.5 text-sm font-bold text-gray-800 dark:text-white/90">
                  {t("onlineOrders.customer")}
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-white/[0.04]">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      {t("onlineOrders.customer")}:
                    </p>
                    <p className="mt-0.5 truncate text-sm font-bold text-gray-800 dark:text-white/90">
                      {detail.customerName || t("onlineOrders.guest")}
                    </p>
                  </div>
                  <div className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-white/[0.04]">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      {t("onlineOrders.phone")}:
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-gray-800 dark:text-white/90">
                      {detail.customerPhone ? (
                        <a
                          href={`tel:${detail.customerPhone.replace(/\s/g, "")}`}
                          className="text-brand-600 hover:underline dark:text-brand-400"
                        >
                          {detail.customerPhone}
                        </a>
                      ) : (
                        "—"
                      )}
                    </p>
                  </div>
                  <div className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-white/[0.04]">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      {t("onlineOrders.date")}:
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-gray-800 dark:text-white/90">
                      {fmtDate(detail.createdAt)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-white/[0.04]">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      {t("onlineOrders.note")}:
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-gray-800 dark:text-white/90">
                      {detail.note || "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Cart */}
              <div>
                <p className="mb-2.5 text-sm font-bold text-gray-800 dark:text-white/90">
                  {t("checkout.orderDetails") || "Cart"}
                </p>
                <div className="space-y-2.5">
                  {(detail.items ?? []).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 dark:bg-white/[0.04]"
                    >
                      <p className="min-w-0 flex-1 text-sm font-semibold text-gray-800 dark:text-white/90">
                        {item.quantity} <span className="text-gray-400">×</span>{" "}
                        {item.productName}
                      </p>
                      <p className="shrink-0 text-sm font-bold text-brand-600 dark:text-brand-400">
                        {fmtMoney.format(Number(item.lineTotal))} UZS
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 space-y-1.5 px-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">
                      {t("onlineOrders.total")}
                    </span>
                    <span className="font-semibold text-gray-800 dark:text-white/90">
                      {fmtMoney.format(Number(detail.totalAmount))} UZS
                    </span>
                  </div>
                </div>
              </div>

              {cancelAsk && (
                <p className="rounded-lg bg-warning-50 px-3 py-2 text-sm text-warning-700 dark:bg-warning-500/10 dark:text-warning-400">
                  {t("onlineOrders.cancelConfirm")}
                </p>
              )}
            </div>

            {/* Status actions pinned to the bottom (POS-drawer style) */}
            {(canConfirm || canComplete || canCancel) && (
              <div className="flex shrink-0 gap-3 border-t border-gray-200 p-4 dark:border-gray-800">
                {cancelAsk ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setCancelAsk(false)}
                      disabled={updating}
                      className="flex h-12 flex-1 items-center justify-center rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-700 shadow-theme-xs transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                    >
                      {t("onlineOrders.noKeep")}
                    </button>
                    <button
                      type="button"
                      onClick={() => transition("Cancelled")}
                      disabled={updating}
                      className="flex h-12 flex-1 items-center justify-center rounded-xl bg-error-500 text-sm font-semibold text-white shadow-theme-md transition hover:bg-error-600 disabled:opacity-50"
                    >
                      {updating ? "..." : t("onlineOrders.yesCancel")}
                    </button>
                  </>
                ) : (
                  <>
                    {canCancel && (
                      <button
                        type="button"
                        onClick={() => setCancelAsk(true)}
                        disabled={updating}
                        className="flex h-12 flex-1 items-center justify-center rounded-xl border border-error-300 bg-white text-sm font-semibold text-error-600 shadow-theme-xs transition hover:bg-error-50 disabled:opacity-50 dark:border-error-500/40 dark:bg-gray-800 dark:hover:bg-error-500/10"
                      >
                        {t("onlineOrders.cancel")}
                      </button>
                    )}
                    {canConfirm && (
                      <button
                        type="button"
                        onClick={() => transition("Confirmed")}
                        disabled={updating}
                        className="flex h-12 flex-1 items-center justify-center rounded-xl bg-brand-500 text-sm font-semibold text-white shadow-theme-md transition hover:bg-brand-600 disabled:opacity-50"
                      >
                        {updating ? "..." : t("onlineOrders.confirm")}
                      </button>
                    )}
                    {canComplete && (
                      <button
                        type="button"
                        onClick={() => transition("Completed")}
                        disabled={updating}
                        className="flex h-12 flex-1 items-center justify-center rounded-xl bg-success-500 text-sm font-semibold text-white shadow-theme-md transition hover:bg-success-600 disabled:opacity-50"
                      >
                        {updating ? "..." : t("onlineOrders.complete")}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </aside>
    </div>
  );
}
