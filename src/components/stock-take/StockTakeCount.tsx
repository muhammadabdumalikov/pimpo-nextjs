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
import SelectField from "@/components/form/SelectField";
import { Modal } from "@/components/ui/modal";
import ConfirmModal from "@/components/ui/confirm-modal/ConfirmModal";
import { exportStockTakeExcel } from "@/lib/stockTakeExcel";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import {
  getStockTake,
  countStockTake,
  completeStockTake,
  cancelStockTake,
  getProducts,
  type StockTake,
  type StockTakeItem,
  type Product,
} from "@/lib/api";

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
  // Current unit cost — used to show a running diff value while counting (the
  // exact COGS is computed on completion).
  unitCost: number;
}

function diffClass(n: number): string {
  return n > 0
    ? "text-success-600 dark:text-success-400"
    : n < 0
      ? "text-error-600 dark:text-error-400"
      : "text-gray-500 dark:text-gray-400";
}

// Signed number for the diff column: "+4" / "-4" / "0". The value carries its
// own sign, so no extra sign glyph (that produced a double "-" and a stray icon).
function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n);
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
              unitCost: Number(it.unitCost ?? 0),
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
            r.productId === product.id ? { ...r, countedQty: nextQty } : r,
          );
        }
        return [
          {
            productId: product.id,
            productName: product.name,
            bookQty: 0,
            countedQty: 1,
            unitCost: product.unitCost ?? 0,
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
      if (opt) addProduct({ id: value, name: opt.label, unitCost: opt.priceIn });
    },
    [productOptions, addProduct],
  );

  const onCountChange = (productId: string, raw: string) => {
    const value = raw === "" ? 0 : Number(raw);
    setRows((prev) =>
      prev.map((r) =>
        r.productId === productId ? { ...r, countedQty: value } : r,
      ),
    );
    // Debounced auto-save so an unsaved edit survives a closed tab / lost network.
    scheduleSave(productId, value);
  };

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
        items.push({ productId, countedQty: Math.floor(counted) });
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
      const d = r.countedQty - r.bookQty;
      if (d > 0) surplus += d;
      else if (d < 0) shortage += -d;
      if (d !== 0) changed++;
    }
    return { surplus, shortage, changed };
  }, [rows]);

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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {stockTake.name}
            </h3>
            <p className="text-theme-sm text-gray-400">
              {stockTake.type === "full"
                ? t("stockTakes.full")
                : t("stockTakes.partial")}{" "}
              · {formatDateTime(stockTake.startedAt)}
            </p>
          </div>
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-theme-xs font-medium ${
              isCompleted
                ? "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400"
                : "bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400"
            }`}
          >
            {isCompleted
              ? t("stockTakes.completed")
              : t("stockTakes.inProgress")}
          </span>
        </div>

        {!isCompleted && (
          <div className="mb-4 rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-theme-sm text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-400">
            {t("stockTakes.salesFrozen")}
          </div>
        )}

        {isCompleted && (
          <div className="mb-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
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
        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-theme-xs uppercase tracking-wide text-gray-400 dark:border-gray-800">
                  <th className="px-3 py-3 font-medium">
                    {t("stockTakes.product")}
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
                {rows.map((r) => {
                  const diffQty = r.countedQty - r.bookQty;
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
                            <Input
                              type="number"
                              min="0"
                              value={r.countedQty}
                              onChange={(e) =>
                                onCountChange(r.productId, e.target.value)
                              }
                              onBlur={() => {
                                scheduleSave(r.productId, r.countedQty);
                                void flush();
                              }}
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
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-12 dark:border-gray-800">
            <p className="text-center text-theme-sm text-gray-500 dark:text-gray-400">
              {t("stockTakes.empty")}
            </p>
          </div>
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
        <h2 className="mb-5 pr-10 text-xl font-semibold text-gray-800 dark:text-white/90">
          {t("stockTakes.complete")}
        </h2>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div
            className={`rounded-2xl border p-4 ${
              preview.surplus > 0
                ? "border-success-200 bg-success-50 dark:border-success-500/30 dark:bg-success-500/10"
                : "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]"
            }`}
          >
            <p className="text-theme-xs font-medium uppercase tracking-wide text-gray-400">
              {t("stockTakes.surplus")}
            </p>
            <p
              className={`mt-1 text-2xl font-bold ${
                preview.surplus > 0
                  ? "text-success-600 dark:text-success-400"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            >
              +{preview.surplus}
            </p>
          </div>
          <div
            className={`rounded-2xl border p-4 ${
              preview.shortage > 0
                ? "border-error-200 bg-error-50 dark:border-error-500/30 dark:bg-error-500/10"
                : "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]"
            }`}
          >
            <p className="text-theme-xs font-medium uppercase tracking-wide text-gray-400">
              {t("stockTakes.shortage")}
            </p>
            <p
              className={`mt-1 text-2xl font-bold ${
                preview.shortage > 0
                  ? "text-error-600 dark:text-error-400"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            >
              −{preview.shortage}
            </p>
          </div>
        </div>

        {preview.shortage > 0 && (
          <div className="mb-4 rounded-xl border border-warning-200 bg-warning-50 px-3 py-2 text-theme-sm text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-400">
            {t("stockTakes.shortageWarn")}
          </div>
        )}

        <p className="mb-6 text-theme-sm text-gray-500 dark:text-gray-400">
          {t("stockTakes.confirmComplete")}
        </p>

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
