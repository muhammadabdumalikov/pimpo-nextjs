"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  LuX,
  LuPackage,
  LuUsers,
  LuTriangleAlert,
  LuChevronDown,
  LuRefreshCw,
} from "react-icons/lu";
import { useTranslations } from "@/hooks/useTranslations";
import {
  probeBillzData,
  type BillzProbeEntity,
  type BillzProbeResult,
  type BillzProbeSample,
} from "@/lib/api";

// The mapped fields we surface per entity, in display order. `null` from the
// backend means the guessed source field was not found — rendered as a flagged
// "not found" chip so a wrong mapping is impossible to miss (MG2).
const PRODUCT_FIELDS: { key: string; labelKey: string }[] = [
  { key: "name", labelKey: "integrations.billz.probe.fName" },
  { key: "sku", labelKey: "integrations.billz.probe.fSku" },
  { key: "barcode", labelKey: "integrations.billz.probe.fBarcode" },
  { key: "priceIn", labelKey: "integrations.billz.probe.fPriceIn" },
  { key: "priceOut", labelKey: "integrations.billz.probe.fPriceOut" },
  { key: "stock", labelKey: "integrations.billz.probe.fStock" },
  { key: "brandName", labelKey: "integrations.billz.probe.fBrand" },
  { key: "categoryName", labelKey: "integrations.billz.probe.fCategory" },
  { key: "unitName", labelKey: "integrations.billz.probe.fUnit" },
];
const CUSTOMER_FIELDS: { key: string; labelKey: string }[] = [
  { key: "name", labelKey: "integrations.billz.probe.fName" },
  { key: "phone", labelKey: "integrations.billz.probe.fPhone" },
];

const TABS: { id: BillzProbeEntity; icon: React.ReactNode; labelKey: string }[] =
  [
    {
      id: "products",
      icon: <LuPackage className="h-4 w-4" />,
      labelKey: "integrations.billz.entityProducts",
    },
    {
      id: "customers",
      icon: <LuUsers className="h-4 w-4" />,
      labelKey: "integrations.billz.entityCustomers",
    },
  ];

interface BillzProbeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TabState {
  loading: boolean;
  error: string | null;
  data: BillzProbeResult | null;
}

const emptyTab: TabState = { loading: false, error: null, data: null };

function SampleCard({
  sample,
  fields,
  t,
}: {
  sample: BillzProbeSample;
  fields: { key: string; labelKey: string }[];
  t: (k: string) => string;
}) {
  const [rawOpen, setRawOpen] = useState(false);
  const mapped = sample.mapped as unknown as Record<string, unknown>;
  return (
    <div className="rounded-xl border border-gray-200 p-3.5 dark:border-gray-800">
      <dl className="grid grid-cols-[minmax(70px,auto)_1fr] gap-x-3 gap-y-1.5">
        {fields.map((f) => {
          const v = mapped[f.key];
          const missing = v === null || v === undefined || v === "";
          return (
            <React.Fragment key={f.key}>
              <dt className="text-theme-xs text-gray-400 dark:text-gray-500">
                {t(f.labelKey)}
              </dt>
              <dd className="min-w-0 text-theme-sm">
                {missing ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-warning-50 px-1.5 py-0.5 text-theme-xs font-medium text-warning-600 dark:bg-warning-500/10 dark:text-orange-400">
                    <LuTriangleAlert className="h-3 w-3" />
                    {t("integrations.billz.probe.notFound")}
                  </span>
                ) : (
                  <span className="break-words font-medium tabular-nums text-gray-800 dark:text-white/90">
                    {String(v)}
                  </span>
                )}
              </dd>
            </React.Fragment>
          );
        })}
      </dl>

      <button
        type="button"
        onClick={() => setRawOpen((o) => !o)}
        className="mt-2.5 inline-flex items-center gap-1 text-theme-xs font-medium text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-300"
      >
        <LuChevronDown
          className={`h-3.5 w-3.5 transition-transform ${rawOpen ? "rotate-180" : ""}`}
        />
        {t("integrations.billz.probe.rawJson")}
      </button>
      {rawOpen && (
        <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-gray-50 p-3 text-[11px] leading-relaxed text-gray-600 dark:bg-white/[0.03] dark:text-gray-400">
          {JSON.stringify(sample.raw, null, 2)}
        </pre>
      )}
    </div>
  );
}

/**
 * MG2 preview: pulls one small page from BiLLZ and shows raw records next to the
 * mapped values the import would read, flagging every field that came back
 * empty. Read-only — nothing is imported.
 */
export default function BillzProbeDrawer({
  isOpen,
  onClose,
}: BillzProbeDrawerProps) {
  const { t } = useTranslations();

  const [tab, setTab] = useState<BillzProbeEntity>("products");
  const [state, setState] = useState<Record<BillzProbeEntity, TabState>>({
    products: emptyTab,
    customers: emptyTab,
  });
  // Entities whose fetch has been kicked off — dedupes the effect (and React
  // strict-mode double-invokes) so each tab loads once until a forced refresh.
  const loadedRef = useRef<Set<BillzProbeEntity>>(new Set());

  const load = useCallback(async (entity: BillzProbeEntity, force = false) => {
    if (!force && loadedRef.current.has(entity)) return;
    loadedRef.current.add(entity);
    setState((prev) => ({ ...prev, [entity]: { ...emptyTab, loading: true } }));
    try {
      const data = await probeBillzData(entity);
      setState((prev) => ({
        ...prev,
        [entity]: { loading: false, error: null, data },
      }));
    } catch (e) {
      loadedRef.current.delete(entity); // let the retry button try again
      setState((prev) => ({
        ...prev,
        [entity]: { loading: false, error: (e as Error).message, data: null },
      }));
    }
  }, []);

  // Fetch the active tab on open / tab change (cached after first load).
  useEffect(() => {
    if (!isOpen) return;
    load(tab);
  }, [isOpen, tab, load]);

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

  const cur = state[tab];
  const fields = tab === "products" ? PRODUCT_FIELDS : CUSTOMER_FIELDS;

  return (
    <div
      className={`fixed inset-0 z-[100000] ${isOpen ? "" : "pointer-events-none"}`}
      aria-hidden={!isOpen}
    >
      <div
        className={`absolute inset-0 bg-gray-900/40 backdrop-blur-[2px] transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        className={`absolute right-0 top-0 flex h-full w-full max-w-[520px] flex-col border-l border-gray-200 bg-white transition-transform duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] dark:border-gray-800 dark:bg-gray-900 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 pb-4 pt-5">
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-white/90">
              {t("integrations.billz.probe.title")}
            </h3>
            <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
              {t("integrations.billz.probe.subtitle")}
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

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-gray-100 px-5 dark:border-gray-800">
          {TABS.map((tb) => {
            const active = tab === tb.id;
            return (
              <button
                key={tb.id}
                type="button"
                onClick={() => setTab(tb.id)}
                className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-theme-sm font-medium transition-colors ${
                  active
                    ? "border-brand-500 text-brand-600 dark:text-brand-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {tb.icon}
                {t(tb.labelKey)}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {cur.loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-32 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5"
                />
              ))}
            </div>
          ) : cur.error ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-error-50 text-error-500 dark:bg-error-500/15">
                <LuTriangleAlert className="h-5 w-5" />
              </span>
              <p className="max-w-xs text-theme-sm text-gray-500 dark:text-gray-400">
                {cur.error}
              </p>
              <button
                type="button"
                onClick={() => load(tab, true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-theme-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
              >
                <LuRefreshCw className="h-3.5 w-3.5" />
                {t("integrations.billz.probe.retry")}
              </button>
            </div>
          ) : cur.data ? (
            <div className="space-y-4">
              {/* Summary line + refresh */}
              <div className="flex items-center justify-between">
                <p className="text-theme-sm text-gray-500 dark:text-gray-400">
                  {cur.data.totalReported != null ? (
                    <>
                      {t("integrations.billz.probe.totalPrefix")}{" "}
                      <span className="font-semibold text-gray-800 dark:text-white/90">
                        ~{cur.data.totalReported.toLocaleString("ru-RU")}
                      </span>
                    </>
                  ) : (
                    t("integrations.billz.probe.totalUnknown")
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => load(tab, true)}
                  aria-label={t("integrations.billz.probe.retry")}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/5 dark:hover:text-gray-200"
                >
                  <LuRefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Warnings — the MG2 signal */}
              {cur.data.warnings.length > 0 && (
                <div className="rounded-xl border border-warning-200 bg-warning-50 p-3.5 dark:border-warning-500/20 dark:bg-warning-500/10">
                  <p className="flex items-center gap-1.5 text-theme-sm font-medium text-warning-600 dark:text-orange-400">
                    <LuTriangleAlert className="h-4 w-4" />
                    {t("integrations.billz.probe.warningsTitle")}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {cur.data.warnings.map((w, i) => (
                      <li
                        key={i}
                        className="text-theme-xs text-warning-600 dark:text-orange-400/90"
                      >
                        • {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Samples */}
              {cur.data.samples.length > 0 ? (
                <div className="space-y-3">
                  {cur.data.samples.map((s, i) => (
                    <SampleCard
                      key={s.billzId ?? i}
                      sample={s}
                      fields={fields}
                      t={t}
                    />
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                  {t("integrations.billz.probe.noRecords")}
                </p>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
