"use client";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { RiFileExcel2Line } from "react-icons/ri";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Checkbox from "@/components/form/input/Checkbox";
import SelectField from "@/components/form/SelectField";
import Pagination from "@/components/ui/pagination/Pagination";
import { Modal } from "@/components/ui/modal";
import ConfirmModal from "@/components/ui/confirm-modal/ConfirmModal";
import { exportStockTakeExcel } from "@/lib/stockTakeExcel";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import {
  getStockTake,
  countStockTake,
  checkStockTake,
  completeStockTake,
  cancelStockTake,
  getProducts,
  type StockTake,
  type StockTakeItem,
  type Product,
} from "@/lib/api";

// Review-state filter for the count table ("tekshirildi/tekshirilmadi").
type CheckFilter = "all" | "unchecked" | "checked";

const CARD =
  "overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6";

// Idle before a buffered count edit is auto-saved. blur / visibilitychange /
// unmount already flush the common cases, so this timer mostly fires only when
// the user types and sits idle — raising it past ~2s barely trims requests
// (blur usually flushes first) while widening the crash-loss window. Tune here.
const SAVE_DEBOUNCE_MS = 2000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Ordered phases shown in the "Processing Excel File" dialog during an import.
const IMPORT_STEP_KEYS = [
  "procReading",
  "procMapping",
  "procValidating",
  "procFinalizing",
  "procCompleted",
] as const;

// A counted row: extends the persisted item shape but productId is required for
// rows the user just added by scanning/searching (bookQty defaults to 0 there).
interface CountRow {
  productId: string;
  productName: string;
  bookQty: number;
  countedQty: number;
  // Raw text in the count box. Kept as a string so in-between states while
  // typing ("", "0.", "0.12") survive the controlled re-render — a numeric
  // value would snap "" back to 0 and eat the decimal point mid-entry.
  // countedQty stays the parsed number for diffs/saves.
  countedInput: string;
  // Current unit cost — used to show a running diff value while counting (the
  // exact COGS is computed on completion).
  unitCost: number;
  // Whether the counter has reviewed this product ("tekshirildi"). Manual flag,
  // independent of countedQty; drives the review filter + progress.
  checked: boolean;
}

// Parse the count box text: "" / "." → 0; comma accepted as the decimal
// separator; rounded to whole grams (3 dp) to match the backend convention.
function parseCount(raw: string): number {
  const n = Number(raw.replace(",", "."));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 1000) / 1000;
}

function diffClass(n: number): string {
  return n > 0
    ? "text-success-600 dark:text-success-400"
    : n < 0
      ? "text-error-600 dark:text-error-400"
      : "text-gray-500 dark:text-gray-400";
}

// Signed number for the diff column: "+4" / "-4" / "0". Rounds to whole grams
// (3 dp) first — a float subtraction like 16.8 - 16 yields 0.8000000000000007,
// so String(n) would leak the noise — then groups thousands.
function signed(n: number): string {
  const r = Math.round(n * 1000) / 1000;
  if (r === 0) return "0";
  return r > 0 ? `+${fmtQty(r)}` : `-${fmtQty(r)}`;
}

// Unsigned quantity with grouping, up to whole grams: 196643.108 → "196 643,108".
function fmtQty(n: number): string {
  return Math.abs(n).toLocaleString("uz-UZ", { maximumFractionDigits: 3 });
}

// Small direction arrow paired with the Excel icon (down = download, up = upload).
function DirArrow({ up = false }: { up?: boolean }) {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {up ? (
        <path d="M12 19V5m0 0-6 6m6-6 6 6" />
      ) : (
        <path d="M12 5v14m0 0-6-6m6 6 6-6" />
      )}
    </svg>
  );
}

// Date + time in 24-hour format (uz-UZ), matching the rest of the app.
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("uz-UZ")}, ${d.toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })}`;
}

export default function StockTakeCount({ id }: { id: string }) {
  const { t } = useTranslations();
  const { showToast } = useToast();
  const router = useRouter();

  const [stockTake, setStockTake] = useState<StockTake | null>(null);
  const [completedItems, setCompletedItems] = useState<StockTakeItem[]>([]);
  const [rows, setRows] = useState<CountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importStep, setImportStep] = useState(-1);
  const [importProgress, setImportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [productOptions, setProductOptions] = useState<
    { value: string; label: string; keywords?: string; priceIn?: number }[]
  >([]);
  const [productLoading, setProductLoading] = useState(false);

  const isCompleted = stockTake?.status === "completed";

  // Review filter ("Barchasi / Tekshirilmagan / Tekshirilgan").
  const [checkFilter, setCheckFilter] = useState<CheckFilter>("all");

  // Client-side pagination over the filtered rows (all rows already live in
  // state — a full count can be hundreds of products).
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // `silent` refreshes the data WITHOUT flipping the full-screen loading state —
  // used after an Excel import so the progress dialog isn't yanked away by the
  // page spinner mid-flow.
  const load = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        const data = await getStockTake(id);
        const { items, ...st } = data;
        setStockTake(st);
        setCompletedItems(items);
        setRows(
          items
            .filter((it) => it.productId)
            .map((it) => ({
              productId: it.productId as string,
              productName: it.productName,
              bookQty: it.bookQty,
              countedQty: it.countedQty,
              countedInput: String(it.countedQty),
              unitCost: Number(it.unitCost ?? 0),
              checked: it.checked,
            })),
        );
      } catch (e) {
        showToast("error", (e as Error).message, "Error");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [id, showToast],
  );

  useEffect(() => {
    load();
  }, [load]);

  // Backend-driven product search for the picker.
  const searchProducts = useCallback(async (query: string) => {
    try {
      setProductLoading(true);
      const res = await getProducts(1, 20, query || undefined);
      setProductOptions(
        res.products.map((p) => ({
          value: p.id,
          label: p.name,
          keywords: [p.code, p.barcode].filter(Boolean).join(" "),
          priceIn: Number(p.priceIn ?? 0),
        })),
      );
    } catch {
      setProductOptions([]);
    } finally {
      setProductLoading(false);
    }
  }, []);

  // ── Debounced auto-save ────────────────────────────────────────────────────
  // Counted quantities are saved automatically as they change (not only on blur/
  // back), so a closed tab or dropped network can't lose an unsaved count. Edits
  // are buffered per product and flushed in ONE batched request after a short
  // idle, so fast typing/scanning doesn't spray the API.
  const pendingRef = useRef<Map<string, number>>(new Map());
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    if (pendingRef.current.size === 0) return;
    const items = Array.from(pendingRef.current, ([productId, countedQty]) => ({
      productId,
      countedQty,
    }));
    pendingRef.current.clear();
    try {
      await countStockTake(id, items);
    } catch (e) {
      showToast("error", (e as Error).message, "Error");
    }
  }, [id, showToast]);

  const scheduleSave = useCallback(
    (productId: string, countedQty: number) => {
      pendingRef.current.set(productId, countedQty);
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      flushTimerRef.current = setTimeout(() => {
        void flush();
      }, SAVE_DEBOUNCE_MS);
    },
    [flush],
  );

  // Flush any buffered edits when leaving the screen (best-effort on unmount).
  useEffect(() => {
    return () => {
      void flush();
    };
  }, [flush]);

  // Also flush when the tab is hidden/closed — visibilitychange fires reliably
  // before a tab is discarded (unlike beforeunload), so a switched-away or
  // closed tab still lands the last edit.
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", onHidden);
    return () => document.removeEventListener("visibilitychange", onHidden);
  }, [flush]);

  // Add a product row (or increment counted qty if it already exists).
  const addProduct = useCallback(
    (product: Pick<Product, "id" | "name"> & { unitCost?: number }) => {
      let nextQty = 1;
      setRows((prev) => {
        const existing = prev.find((r) => r.productId === product.id);
        if (existing) {
          nextQty = existing.countedQty + 1;
          return prev.map((r) =>
            r.productId === product.id
              ? { ...r, countedQty: nextQty, countedInput: String(nextQty) }
              : r,
          );
        }
        return [
          {
            productId: product.id,
            productName: product.name,
            bookQty: 0,
            countedQty: 1,
            countedInput: "1",
            unitCost: product.unitCost ?? 0,
            checked: false,
          },
          ...prev,
        ];
      });
      scheduleSave(product.id, nextQty);
    },
    [scheduleSave],
  );

  // Product picked from the search dropdown (search matches name + barcode +
  // code server-side, so a scanner button isn't needed).
  const onPickProduct = useCallback(
    async (value: string) => {
      const opt = productOptions.find((o) => o.value === value);
      if (opt) {
        addProduct({ id: value, name: opt.label, unitCost: opt.priceIn });
        // The row is prepended (or its count bumped) — jump to page 1 so the
        // just-picked product is on screen.
        setCurrentPage(1);
      }
    },
    [productOptions, addProduct],
  );

  const onCountChange = (productId: string, raw: string) => {
    // Digits + one optional decimal separator ("." or ","); anything else —
    // letters, minus, a second dot — is ignored so the box can't go invalid.
    if (!/^\d*[.,]?\d*$/.test(raw)) return;
    const value = parseCount(raw);
    setRows((prev) =>
      prev.map((r) =>
        r.productId === productId
          ? { ...r, countedQty: value, countedInput: raw }
          : r,
      ),
    );
    // Debounced auto-save so an unsaved edit survives a closed tab / lost network.
    scheduleSave(productId, value);
  };

  // Tidy the box when leaving it ("" / "0." / ",5" → the parsed number) and
  // land the pending edit.
  const onCountBlur = (productId: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.productId === productId
          ? { ...r, countedInput: String(r.countedQty) }
          : r,
      ),
    );
    void flush();
  };

  // Toggle a product's reviewed flag. Optimistic — persisted immediately (a
  // toggle is rare, so no debounce); reverts + toasts if the save fails.
  const setRowChecked = useCallback(
    (productId: string, nextChecked: boolean) => {
      setRows((prev) =>
        prev.map((r) =>
          r.productId === productId ? { ...r, checked: nextChecked } : r,
        ),
      );
      void checkStockTake(id, [{ productId, checked: nextChecked }]).catch(
        (e) => {
          showToast("error", (e as Error).message, "Error");
          setRows((prev) =>
            prev.map((r) =>
              r.productId === productId ? { ...r, checked: !nextChecked } : r,
            ),
          );
        },
      );
    },
    [id, showToast],
  );

  // ── Excel round-trip ────────────────────────────────────────────────────────
  // Download the current rows so a worker can fill/correct the counts offline,
  // then re-upload the same file to apply them (matched on the hidden ID column).
  const downloadExcel = () => {
    exportStockTakeExcel(
      `inventarizatsiya-${stockTake?.name ?? id}`.slice(0, 60),
      rows.map((r) => [r.productId, r.productName, r.bookQty, r.countedQty]),
    );
  };

  const importExcel = async (file: File) => {
    setImporting(true);
    setImportStep(0); // Reading file
    setImportProgress(8);
    try {
      // 1) Read the workbook.
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      await sleep(300);

      // 2) Map the sheet rows to fields.
      setImportStep(1);
      setImportProgress(28);
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
      await sleep(300);

      // 3) Validate — keep rows with a matchable id and a valid count.
      setImportStep(2);
      setImportProgress(45);
      const items: { productId: string; countedQty: number }[] = [];
      for (const row of data) {
        const productId = String(row["ID"] ?? "").trim();
        const counted = Number(row["Sanalgan"]);
        if (!productId || !Number.isFinite(counted) || counted < 0) continue;
        // Round to whole grams — weighed goods are counted in fractional kg,
        // so don't floor a decimal count (0.5 → 0) from the sheet.
        items.push({ productId, countedQty: Math.round(counted * 1000) / 1000 });
      }
      await sleep(300);
      if (items.length === 0) {
        showToast("error", t("stockTakes.excelEmpty"), "Error");
        return;
      }

      // 4) Finalize — apply in chunks; the real work drives the bar 45 → 95.
      setImportStep(3);
      const CHUNK = 500;
      for (let i = 0; i < items.length; i += CHUNK) {
        await countStockTake(id, items.slice(i, i + CHUNK));
        const done = Math.min(i + CHUNK, items.length);
        setImportProgress(45 + Math.round((done / items.length) * 50));
      }

      // 5) Done — mark every step ✓ and let the finished state linger a moment
      // before the dialog closes.
      setImportProgress(100);
      setImportStep(4);
      await load(true); // silent — keep the progress dialog visible, no page spinner
      setImportStep(IMPORT_STEP_KEYS.length); // all steps complete (green checks)
      showToast(
        "success",
        `${items.length} ${t("stockTakes.excelImported")}`,
        "Success",
      );
      await sleep(2000);
    } catch (e) {
      showToast("error", (e as Error).message, "Error");
    } finally {
      setImporting(false);
      setImportStep(-1);
      setImportProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const completedById = useRef<Map<string, StockTakeItem>>(new Map());
  useEffect(() => {
    completedById.current = new Map(
      completedItems
        .filter((it) => it.productId)
        .map((it) => [it.productId as string, it]),
    );
  }, [completedItems]);

  // Preview of what completing will do — units only (COGS value is priced
  // server-side against the FIFO batches, so it isn't known until completion).
  const preview = useMemo(() => {
    let surplus = 0;
    let shortage = 0;
    let changed = 0;
    for (const r of rows) {
      // Round each diff to whole grams so float noise (16.8 - 16 = 0.800…07)
      // can't accumulate across the sum.
      const d = Math.round((r.countedQty - r.bookQty) * 1000) / 1000;
      if (d > 0) surplus += d;
      else if (d < 0) shortage += -d;
      if (d !== 0) changed++;
    }
    return {
      surplus: Math.round(surplus * 1000) / 1000,
      shortage: Math.round(shortage * 1000) / 1000,
      changed,
    };
  }, [rows]);

  // Review progress ("X / Y tekshirildi") across all rows, regardless of filter.
  const checkedCount = useMemo(
    () => rows.reduce((n, r) => n + (r.checked ? 1 : 0), 0),
    [rows],
  );

  // Rows shown under the active review filter.
  const visibleRows = useMemo(() => {
    if (checkFilter === "checked") return rows.filter((r) => r.checked);
    if (checkFilter === "unchecked") return rows.filter((r) => !r.checked);
    return rows;
  }, [rows, checkFilter]);

  // Switching the filter restarts paging so you never land on an empty page.
  useEffect(() => {
    setCurrentPage(1);
  }, [checkFilter]);

  // Clamp to the last page as the filtered set shrinks (rows checked out of the
  // "unchecked" view, an Excel re-import, etc.), then slice the current page.
  const totalPages = Math.max(1, Math.ceil(visibleRows.length / itemsPerPage));
  const page = Math.min(currentPage, totalPages);
  const pagedRows = useMemo(
    () => visibleRows.slice((page - 1) * itemsPerPage, page * itemsPerPage),
    [visibleRows, page, itemsPerPage],
  );

  const doComplete = async () => {
    setCompleting(true);
    try {
      // Make sure any debounced edit lands before the count is finalized.
      await flush();
      await completeStockTake(id);
      showToast("success", t("stockTakes.complete"), "Success");
      setConfirmComplete(false);
      await load();
    } catch (e) {
      showToast("error", (e as Error).message, "Error");
    } finally {
      setCompleting(false);
    }
  };

  const doCancel = async () => {
    setCancelling(true);
    try {
      await cancelStockTake(id);
      showToast("success", t("stockTakes.cancelled"), "Success");
      router.push("/stock-takes");
    } catch (e) {
      showToast("error", (e as Error).message, "Error");
      setCancelling(false);
      setConfirmCancel(false);
    }
  };

  if (loading) {
    return (
      <div className={CARD}>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
        </div>
      </div>
    );
  }

  if (!stockTake) return null;

  return (
    <div className="space-y-6">
      <div className={CARD}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h3 className="truncate text-xl font-semibold tracking-tight text-gray-800 dark:text-white/90">
                {stockTake.name}
              </h3>
              <span className="shrink-0 rounded-md border border-gray-200 px-1.5 py-0.5 text-theme-xs font-medium text-gray-500 dark:border-gray-700 dark:text-gray-400">
                {stockTake.type === "full"
                  ? t("stockTakes.full")
                  : t("stockTakes.partial")}
              </span>
            </div>
            <p className="mt-1 text-theme-sm tabular-nums text-gray-400">
              {formatDateTime(stockTake.startedAt)}
            </p>
          </div>

          {isCompleted ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success-50 px-2.5 py-1 text-theme-xs font-medium text-success-600 dark:bg-success-500/10 dark:text-success-400">
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 10.5l4 4 8-9" />
              </svg>
              {t("stockTakes.completed")}
            </span>
          ) : (
            <div className="flex flex-col items-end gap-1.5">
              {/* Live status: pulsing dot instead of a static pill */}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-50 px-2.5 py-1 text-theme-xs font-medium text-warning-700 dark:bg-warning-500/10 dark:text-warning-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning-500 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-warning-500" />
                </span>
                {t("stockTakes.inProgress")}
              </span>
              {/* The freeze is a state note, not an alarm — a quiet lock line
                  instead of a shouting full-width banner */}
              <span className="inline-flex items-center gap-1.5 text-theme-xs text-gray-400 dark:text-gray-500">
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="4" y="11" width="16" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
                {t("stockTakes.salesFrozen")}
              </span>
            </div>
          )}
        </div>

        {/* Running result while counting — the number the counter cares about */}
        {!isCompleted && rows.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-2 border-t border-gray-100 pt-3.5 text-theme-sm dark:border-gray-800">
            <span className="text-gray-400 dark:text-gray-500">
              {t("stockTakes.diff")}:
            </span>
            {preview.surplus === 0 && preview.shortage === 0 ? (
              <span className="font-medium tabular-nums text-gray-500 dark:text-gray-400">
                0
              </span>
            ) : (
              <>
                {preview.surplus > 0 && (
                  <span
                    className="rounded-md bg-success-50 px-2 py-0.5 font-medium tabular-nums text-success-600 dark:bg-success-500/10 dark:text-success-400"
                    title={t("stockTakes.surplus")}
                  >
                    +{fmtQty(preview.surplus)}
                  </span>
                )}
                {preview.shortage > 0 && (
                  <span
                    className="rounded-md bg-error-50 px-2 py-0.5 font-medium tabular-nums text-error-600 dark:bg-error-500/10 dark:text-error-400"
                    title={t("stockTakes.shortage")}
                  >
                    −{fmtQty(preview.shortage)}
                  </span>
                )}
              </>
            )}
            <span className="ml-auto tabular-nums text-gray-400 dark:text-gray-500">
              {preview.changed}/{rows.length}
            </span>
          </div>
        )}

        {isCompleted && (
          <div className="mb-2 mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <p className="text-theme-xs uppercase tracking-wide text-gray-400">
                {t("stockTakes.surplus")}
              </p>
              <p className="mt-1 text-lg font-semibold text-success-600 dark:text-success-400">
                {Number(stockTake.surplusQty ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <p className="text-theme-xs uppercase tracking-wide text-gray-400">
                {t("stockTakes.shortage")}
              </p>
              <p className="mt-1 text-lg font-semibold text-error-600 dark:text-error-400">
                {Number(stockTake.shortageQty ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <p className="text-theme-xs uppercase tracking-wide text-gray-400">
                {t("stockTakes.diffValue")}
              </p>
              <p className="mt-1 text-lg font-semibold text-gray-800 dark:text-white/90">
                {stockTake.diffValue == null
                  ? "0"
                  : Number(stockTake.diffValue).toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </div>

      {!isCompleted && (
        <div className={CARD}>
          <div className="flex items-center gap-2">
            <div className="min-w-[200px] flex-1">
              <SelectField
                options={productOptions}
                value=""
                onChange={onPickProduct}
                onSearch={searchProducts}
                loading={productLoading}
                placeholder={t("stockTakes.searchProduct")}
                searchPlaceholder={t("stockTakes.searchProduct")}
                portal
              />
            </div>
            <button
              type="button"
              onClick={downloadExcel}
              aria-label={t("stockTakes.downloadExcel")}
              className="flex h-11 shrink-0 items-center gap-1 rounded-lg border border-gray-300 px-2.5 text-success-600 transition hover:bg-success-50 dark:border-gray-700 dark:text-success-500 dark:hover:bg-success-500/10"
            >
              <DirArrow />
              <RiFileExcel2Line className="h-5 w-5" />
            </button>
            <button
              type="button"
              disabled={importing}
              onClick={() => fileInputRef.current?.click()}
              aria-label={t("stockTakes.uploadExcel")}
              className="flex h-11 shrink-0 items-center gap-1 rounded-lg border border-gray-300 px-2.5 text-success-600 transition hover:bg-success-50 disabled:opacity-50 dark:border-gray-700 dark:text-success-500 dark:hover:bg-success-500/10"
            >
              {importing ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <DirArrow up />
              )}
              <RiFileExcel2Line className="h-5 w-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importExcel(f);
              }}
            />
          </div>
        </div>
      )}

      <div className={CARD}>
        {rows.length > 0 && (
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Review filter — Barchasi / Tekshirilmagan / Tekshirilgan */}
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-gray-800 dark:bg-white/[0.03]">
              {(
                [
                  {
                    key: "all",
                    label: t("stockTakes.filterAll"),
                    count: rows.length,
                  },
                  {
                    key: "unchecked",
                    label: t("stockTakes.filterUnchecked"),
                    count: rows.length - checkedCount,
                  },
                  {
                    key: "checked",
                    label: t("stockTakes.filterChecked"),
                    count: checkedCount,
                  },
                ] as { key: CheckFilter; label: string; count: number }[]
              ).map((seg) => (
                <button
                  key={seg.key}
                  type="button"
                  onClick={() => setCheckFilter(seg.key)}
                  className={`rounded-md px-3 py-1.5 text-theme-xs font-medium transition ${
                    checkFilter === seg.key
                      ? "bg-white text-gray-800 shadow-theme-xs dark:bg-gray-800 dark:text-white/90"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  }`}
                >
                  {seg.label}
                  <span className="ml-1 text-gray-400 dark:text-gray-500">
                    {seg.count}
                  </span>
                </button>
              ))}
            </div>
            {/* Review progress across all rows */}
            <div className="flex items-center gap-2 text-theme-xs text-gray-500 dark:text-gray-400">
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className="h-full rounded-full bg-brand-500 transition-all"
                  style={{
                    width: `${rows.length ? Math.round((checkedCount / rows.length) * 100) : 0}%`,
                  }}
                />
              </div>
              <span>
                {checkedCount}/{rows.length} {t("stockTakes.checked")}
              </span>
            </div>
          </div>
        )}

        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-12 dark:border-gray-800">
            <p className="text-center text-theme-sm text-gray-500 dark:text-gray-400">
              {t("stockTakes.empty")}
            </p>
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-12 dark:border-gray-800">
            <p className="text-center text-theme-sm text-gray-500 dark:text-gray-400">
              {t("stockTakes.noneInFilter")}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-theme-xs uppercase tracking-wide text-gray-400 dark:border-gray-800">
                  <th className="px-3 py-3 font-medium">
                    {t("stockTakes.product")}
                  </th>
                  <th className="px-3 py-3 font-medium">
                    {t("stockTakes.checkStatus")}
                  </th>
                  <th className="px-3 py-3 font-medium">
                    {t("stockTakes.book")}
                  </th>
                  <th className="px-3 py-3 font-medium">
                    {t("stockTakes.counted")}
                  </th>
                  <th className="px-3 py-3 font-medium">
                    {t("stockTakes.diff")}
                  </th>
                  <th className="px-3 py-3 font-medium">
                    {t("stockTakes.diffValue")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((r) => {
                  const diffQty =
                    Math.round((r.countedQty - r.bookQty) * 1000) / 1000;
                  const saved = completedById.current.get(r.productId);
                  // Running "farq summasi": the exact stored COGS once completed,
                  // otherwise a live estimate from the product's cost.
                  const diffValue =
                    isCompleted && saved?.diffValue != null
                      ? Number(saved.diffValue)
                      : diffQty * r.unitCost;
                  // Shortage → light red, surplus → light green, so the eye lands
                  // on the mismatched rows at a glance.
                  const rowTint =
                    diffQty < 0
                      ? "bg-error-50/70 dark:bg-error-500/10"
                      : diffQty > 0
                        ? "bg-success-50/70 dark:bg-success-500/10"
                        : "";
                  return (
                    <tr
                      key={r.productId}
                      className={`border-b border-gray-100 dark:border-gray-800/60 ${rowTint}`}
                    >
                      <td className="px-3 py-3 font-medium text-gray-800 dark:text-white/90">
                        {r.productName}
                      </td>
                      <td
                        className="px-3 py-3"
                        title={
                          r.checked
                            ? t("stockTakes.checkedLabel")
                            : t("stockTakes.uncheckedLabel")
                        }
                      >
                        {isCompleted ? (
                          r.checked ? (
                            <svg
                              className="h-5 w-5 text-success-500"
                              viewBox="0 0 20 20"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M4 10.5l4 4 8-9" />
                            </svg>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600">
                              —
                            </span>
                          )
                        ) : (
                          <Checkbox
                            checked={r.checked}
                            onChange={(checked) =>
                              setRowChecked(r.productId, checked)
                            }
                          />
                        )}
                      </td>
                      <td className="px-3 py-3 text-gray-700 dark:text-gray-300">
                        {r.bookQty}
                      </td>
                      <td className="px-3 py-3">
                        {isCompleted ? (
                          <span className="text-gray-700 dark:text-gray-300">
                            {r.countedQty}
                          </span>
                        ) : (
                          <div className="w-24">
                            {/* Text + decimal keyboard (not type="number"): the
                                raw string keeps "" and "0." alive while typing,
                                so counts like 0.123 can actually be entered. */}
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={r.countedInput}
                              onChange={(e) =>
                                onCountChange(r.productId, e.target.value)
                              }
                              onBlur={() => onCountBlur(r.productId)}
                            />
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`font-medium ${diffClass(diffQty)}`}>
                          {signed(diffQty)}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`font-medium ${diffClass(diffValue)}`}>
                          {diffValue === 0
                            ? "0"
                            : Math.round(diffValue).toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {visibleRows.length > 0 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={visibleRows.length}
            itemsPerPage={itemsPerPage}
            onPageChange={(p) => setCurrentPage(Math.min(Math.max(1, p), totalPages))}
            onItemsPerPageChange={(n) => {
              setItemsPerPage(n);
              setCurrentPage(1);
            }}
          />
        )}

        {!isCompleted && (
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setConfirmCancel(true)}
              disabled={completing || cancelling}
              className="!text-error-600 hover:!bg-error-50 dark:!text-error-400 dark:hover:!bg-error-500/10"
            >
              {t("stockTakes.cancelCount")}
            </Button>
            <Button
              onClick={() => setConfirmComplete(true)}
              disabled={completing || cancelling}
            >
              {t("stockTakes.complete")}
            </Button>
          </div>
        )}
      </div>

      {/* Complete confirmation — surplus/shortage unit preview + warning. */}
      <Modal
        isOpen={confirmComplete}
        onClose={() => !completing && setConfirmComplete(false)}
        className="mx-4 w-full max-w-md p-6 sm:p-7"
      >
        <h2 className="pr-10 text-xl font-semibold text-gray-800 dark:text-white/90">
          {t("stockTakes.complete")}
        </h2>
        <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
          {t("stockTakes.confirmComplete")}
        </p>

        {/* Ledger-style result: quiet rows, right-aligned tabular figures —
            the shortage (money leaving) is the dominant line. */}
        <div className="my-5 rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5 dark:border-gray-800">
            <span className="text-theme-sm text-gray-500 dark:text-gray-400">
              {t("stockTakes.changedProducts")}
            </span>
            <span className="tabular-nums text-theme-sm font-medium text-gray-700 dark:text-gray-300">
              {preview.changed}/{rows.length}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5 dark:border-gray-800">
            <span className="text-theme-sm text-gray-500 dark:text-gray-400">
              {t("stockTakes.surplus")}
            </span>
            <span
              className={`tabular-nums text-theme-sm font-medium ${
                preview.surplus > 0
                  ? "text-success-600 dark:text-success-400"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            >
              {preview.surplus > 0 ? `+${fmtQty(preview.surplus)}` : "0"}
            </span>
          </div>
          <div className="px-4 py-2.5">
            <div className="flex items-center justify-between">
              <span className="text-theme-sm text-gray-500 dark:text-gray-400">
                {t("stockTakes.shortage")}
              </span>
              <span
                className={`tabular-nums font-semibold ${
                  preview.shortage > 0
                    ? "text-lg text-error-600 dark:text-error-400"
                    : "text-theme-sm font-medium text-gray-400 dark:text-gray-500"
                }`}
              >
                {preview.shortage > 0 ? `−${fmtQty(preview.shortage)}` : "0"}
              </span>
            </div>
            {preview.shortage > 0 && (
              <p className="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
                {t("stockTakes.shortageWarn")}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => setConfirmComplete(false)}
            disabled={completing}
          >
            {t("stockTakes.cancel")}
          </Button>
          <Button onClick={doComplete} disabled={completing}>
            {completing ? (
              <span className="flex items-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {t("stockTakes.completing")}
              </span>
            ) : (
              t("stockTakes.complete")
            )}
          </Button>
        </div>
      </Modal>

      {/* Cancel confirmation — abandons the count and releases the freeze. */}
      <ConfirmModal
        isOpen={confirmCancel}
        onClose={() => !cancelling && setConfirmCancel(false)}
        onConfirm={doCancel}
        title={t("stockTakes.cancelCount")}
        message={t("stockTakes.confirmCancel")}
        confirmLabel={t("stockTakes.cancelCount")}
        cancelLabel={t("stockTakes.cancel")}
        variant="danger"
        isLoading={cancelling}
      />

      {/* Excel import progress — mirrors the "Processing Excel File" flow. */}
      <Modal
        isOpen={importing}
        onClose={() => {}}
        showCloseButton={false}
        className="mx-4 w-full max-w-md p-6 sm:p-8"
      >
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-success-50 text-success-600 shadow-[0_0_44px_rgba(34,197,94,0.35)] dark:bg-success-500/10 dark:text-success-400">
            <RiFileExcel2Line className="h-11 w-11" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("stockTakes.procTitle")}
          </h3>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-success-500 transition-all duration-300"
              style={{ width: `${importProgress}%` }}
            />
          </div>
          <p className="mt-2 text-sm font-semibold text-success-600 dark:text-success-400">
            {importProgress}% {t("stockTakes.procComplete")}
          </p>
          <p className="text-theme-xs text-gray-400">
            {t("stockTakes.procHint")}
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {IMPORT_STEP_KEYS.map((key, i) => {
            const done = i < importStep;
            const active = i === importStep;
            return (
              <div key={key} className="flex items-center gap-3">
                {done ? (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-500 text-white">
                    <svg
                      className="h-3 w-3"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>
                ) : active ? (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-100 dark:bg-success-500/20">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-success-500" />
                  </span>
                ) : (
                  <span className="h-5 w-5 shrink-0 rounded-full border-2 border-gray-200 dark:border-gray-700" />
                )}
                <span
                  className={`text-sm ${
                    done || active
                      ? "font-medium text-gray-800 dark:text-white/90"
                      : "text-gray-400"
                  }`}
                >
                  {t(`stockTakes.${key}`)}
                  {active ? "…" : ""}
                </span>
              </div>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}
