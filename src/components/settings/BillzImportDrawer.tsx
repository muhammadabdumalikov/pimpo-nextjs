"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  LuX,
  LuPackage,
  LuUsers,
  LuImage,
  LuRefreshCw,
  LuCircleAlert,
} from "react-icons/lu";
import { useTranslations } from "@/hooks/useTranslations";
import {
  getBillzImportItems,
  type BillzImportEntity,
  type BillzImportItem,
} from "@/lib/api";

const PAGE_SIZE = 50;

const ENTITY_META: Record<
  BillzImportEntity,
  { icon: React.ReactNode; labelKey: string }
> = {
  products: {
    icon: <LuPackage className="h-4 w-4" />,
    labelKey: "integrations.billz.entityProducts",
  },
  customers: {
    icon: <LuUsers className="h-4 w-4" />,
    labelKey: "integrations.billz.entityCustomers",
  },
  images: {
    icon: <LuImage className="h-4 w-4" />,
    labelKey: "integrations.billz.entityImages",
  },
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("uz-UZ")} ${d.toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

interface BillzImportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Entities of the current/last job — defines which tabs are shown. */
  entities: BillzImportEntity[];
}

/**
 * Slide-over audit log of migrated records, one tab per entity plus a
 * failed-only filter. Cumulative across jobs; newest first; load-more paging.
 */
export default function BillzImportDrawer({
  isOpen,
  onClose,
  entities,
}: BillzImportDrawerProps) {
  const { t } = useTranslations();

  const tabs: BillzImportEntity[] =
    entities.length > 0 ? entities : ["products"];
  const [tab, setTab] = useState<BillzImportEntity>(tabs[0]);
  const [failedOnly, setFailedOnly] = useState(false);

  const [items, setItems] = useState<BillzImportItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // Guards against out-of-order responses when the user flips tabs quickly.
  const requestSeq = useRef(0);

  const load = useCallback(
    async (entity: BillzImportEntity, failed: boolean, pageNum: number) => {
      const seq = ++requestSeq.current;
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      try {
        const res = await getBillzImportItems({
          entity,
          status: failed ? "failed" : "all",
          page: pageNum,
          limit: PAGE_SIZE,
        });
        if (seq !== requestSeq.current) return;
        setItems((prev) => (pageNum === 1 ? res.items : [...prev, ...res.items]));
        setTotal(res.total);
        setPage(pageNum);
      } catch {
        if (seq === requestSeq.current && pageNum === 1) {
          setItems([]);
          setTotal(0);
        }
      } finally {
        if (seq === requestSeq.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [],
  );

  // (Re)load on open and whenever the tab or filter changes.
  useEffect(() => {
    if (!isOpen) return;
    load(tab, failedOnly, 1);
  }, [isOpen, tab, failedOnly, load]);

  // Keep the active tab valid if the entity set changes between jobs.
  useEffect(() => {
    if (!tabs.includes(tab)) setTab(tabs[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entities.join(",")]);

  // Escape closes; body scroll locks while open.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  return (
    <div
      className={`fixed inset-0 z-[100000] ${isOpen ? "" : "pointer-events-none"}`}
      aria-hidden={!isOpen}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-gray-900/40 backdrop-blur-[2px] transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        className={`absolute right-0 top-0 flex h-full w-full max-w-[480px] flex-col border-l border-gray-200 bg-white transition-transform duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] dark:border-gray-800 dark:bg-gray-900 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 pb-4 pt-5">
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-white/90">
              {t("integrations.billz.logTitle")}
            </h3>
            <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
              {t("integrations.billz.logSubtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="-mr-1 -mt-1 flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/5 dark:hover:text-gray-200"
          >
            <LuX className="h-5 w-5" />
          </button>
        </div>

        {/* Entity tabs */}
        <div className="flex items-center gap-1 border-b border-gray-100 px-5 dark:border-gray-800">
          {tabs.map((e) => {
            const active = tab === e;
            return (
              <button
                key={e}
                type="button"
                onClick={() => setTab(e)}
                className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-theme-sm font-medium transition-colors ${
                  active
                    ? "border-brand-500 text-brand-600 dark:text-brand-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {ENTITY_META[e].icon}
                {t(ENTITY_META[e].labelKey)}
              </button>
            );
          })}
        </div>

        {/* Filter row */}
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFailedOnly(false)}
              className={`rounded-full px-3 py-1 text-theme-xs font-medium transition ${
                !failedOnly
                  ? "bg-gray-800 text-white dark:bg-white/90 dark:text-gray-900"
                  : "bg-gray-100 text-gray-500 hover:text-gray-700 dark:bg-white/5 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {t("integrations.billz.logAll")}
            </button>
            <button
              type="button"
              onClick={() => setFailedOnly(true)}
              className={`rounded-full px-3 py-1 text-theme-xs font-medium transition ${
                failedOnly
                  ? "bg-error-500 text-white"
                  : "bg-gray-100 text-gray-500 hover:text-gray-700 dark:bg-white/5 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {t("integrations.billz.logFailedOnly")}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-theme-xs tabular-nums text-gray-400 dark:text-gray-500">
              {total.toLocaleString("ru-RU")}
            </span>
            <button
              type="button"
              onClick={() => load(tab, failedOnly, 1)}
              aria-label={t("integrations.billz.logRefresh")}
              className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/5 dark:hover:text-gray-200"
            >
              <LuRefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {loading ? (
            <div className="space-y-2 pt-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-11 animate-pulse rounded-lg bg-gray-100 dark:bg-white/5"
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <p className="text-theme-sm text-gray-500 dark:text-gray-400">
                {failedOnly
                  ? t("integrations.billz.logEmptyFailed")
                  : t("integrations.billz.logEmpty")}
              </p>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-gray-100 dark:divide-gray-800/60">
                {items.map((item) => (
                  <li key={item.id} className="flex items-start gap-3 py-2.5">
                    {item.status === "success" ? (
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-success-500" />
                    ) : (
                      <LuCircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-error-500" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">
                        {item.name}
                      </p>
                      {item.status === "failed" && item.error && (
                        <p className="mt-0.5 text-theme-xs text-error-500">
                          {item.error}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 pt-0.5 text-theme-xs tabular-nums text-gray-400 dark:text-gray-500">
                      {formatTime(item.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
              {items.length < total && (
                <button
                  type="button"
                  onClick={() => load(tab, failedOnly, page + 1)}
                  disabled={loadingMore}
                  className="mt-3 w-full rounded-lg border border-gray-200 py-2.5 text-theme-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                >
                  {loadingMore
                    ? t("common.loading")
                    : `${t("integrations.billz.logLoadMore")} (${(
                        total - items.length
                      ).toLocaleString("ru-RU")})`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
