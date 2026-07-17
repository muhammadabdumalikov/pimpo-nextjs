"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import SelectField from "@/components/form/SelectField";
import CameraScanner from "@/components/checkout/CameraScanner";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import {
  getStockTake,
  countStockTake,
  completeStockTake,
  getProducts,
  getProduct,
  lookupBarcode,
  type StockTake,
  type StockTakeItem,
  type Product,
} from "@/lib/api";

const CARD =
  "overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6";

// A counted row: extends the persisted item shape but productId is required for
// rows the user just added by scanning/searching (bookQty defaults to 0 there).
interface CountRow {
  productId: string;
  productName: string;
  bookQty: number;
  countedQty: number;
}

function diffClass(n: number): string {
  return n > 0
    ? "text-success-600 dark:text-success-400"
    : n < 0
      ? "text-error-600 dark:text-error-400"
      : "text-gray-500 dark:text-gray-400";
}

function diffSign(n: number): string {
  return n > 0 ? "➕" : n < 0 ? "➖" : "➡️";
}

export default function StockTakeCount({ id }: { id: string }) {
  const { t } = useTranslations();
  const { showToast } = useToast();

  const [stockTake, setStockTake] = useState<StockTake | null>(null);
  const [completedItems, setCompletedItems] = useState<StockTakeItem[]>([]);
  const [rows, setRows] = useState<CountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState("");
  const [completing, setCompleting] = useState(false);

  const [productOptions, setProductOptions] = useState<
    { value: string; label: string; keywords?: string }[]
  >([]);
  const [productLoading, setProductLoading] = useState(false);

  const isCompleted = stockTake?.status === "completed";

  const load = useCallback(async () => {
    try {
      setLoading(true);
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
          })),
      );
    } catch (e) {
      showToast("error", (e as Error).message, "Error");
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

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
        })),
      );
    } catch {
      setProductOptions([]);
    } finally {
      setProductLoading(false);
    }
  }, []);

  // Persist a single row's counted qty (called on blur / after add).
  const persist = useCallback(
    async (productId: string, countedQty: number) => {
      try {
        await countStockTake(id, [{ productId, countedQty }]);
      } catch (e) {
        showToast("error", (e as Error).message, "Error");
      }
    },
    [id, showToast],
  );

  // Add a product row (or increment counted qty if it already exists).
  const addProduct = useCallback(
    (product: Pick<Product, "id" | "name">) => {
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
          },
          ...prev,
        ];
      });
      setLastScanned(product.name);
      persist(product.id, nextQty);
    },
    [persist],
  );

  // Product picked from the search dropdown.
  const onPickProduct = useCallback(
    async (value: string) => {
      const opt = productOptions.find((o) => o.value === value);
      if (opt) addProduct({ id: value, name: opt.label });
    },
    [productOptions, addProduct],
  );

  // A barcode came from the camera: resolve it to a product in the catalog.
  const onDetected = useCallback(
    async (code: string) => {
      try {
        const result = await lookupBarcode(code);
        if (!result.existsInBusiness || !result.productId) {
          showToast("error", t("stockTakes.notFound"), "Error");
          return;
        }
        // Fetch the product so we have a stable name for the new row.
        const product = await getProduct(result.productId);
        addProduct({ id: product.id, name: product.name });
      } catch (e) {
        showToast("error", (e as Error).message, "Error");
      }
    },
    [addProduct, showToast, t],
  );

  const onCountChange = (productId: string, raw: string) => {
    const value = raw === "" ? 0 : Number(raw);
    setRows((prev) =>
      prev.map((r) =>
        r.productId === productId ? { ...r, countedQty: value } : r,
      ),
    );
  };

  const completedById = useRef<Map<string, StockTakeItem>>(new Map());
  useEffect(() => {
    completedById.current = new Map(
      completedItems
        .filter((it) => it.productId)
        .map((it) => [it.productId as string, it]),
    );
  }, [completedItems]);

  const onComplete = async () => {
    if (!window.confirm(t("stockTakes.confirmComplete"))) return;
    setCompleting(true);
    try {
      await completeStockTake(id);
      showToast("success", t("stockTakes.complete"), "Success");
      await load();
    } catch (e) {
      showToast("error", (e as Error).message, "Error");
    } finally {
      setCompleting(false);
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
              · {new Date(stockTake.startedAt).toLocaleString()}
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
                {stockTake.surplusQty ?? "0"}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <p className="text-theme-xs uppercase tracking-wide text-gray-400">
                {t("stockTakes.shortage")}
              </p>
              <p className="mt-1 text-lg font-semibold text-error-600 dark:text-error-400">
                {stockTake.shortageQty ?? "0"}
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
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="min-w-[240px] flex-1">
              <SelectField
                options={productOptions}
                value=""
                onChange={onPickProduct}
                onSearch={searchProducts}
                loading={productLoading}
                placeholder={t("stockTakes.searchProduct")}
                searchPlaceholder={t("stockTakes.searchProduct")}
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setScanning((v) => !v)}
            >
              {t("stockTakes.scan")}
            </Button>
          </div>

          <CameraScanner
            isOpen={scanning}
            onClose={() => setScanning(false)}
            onDetected={onDetected}
            lastScanned={lastScanned}
          />
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
                  return (
                    <tr
                      key={r.productId}
                      className="border-b border-gray-100 dark:border-gray-800/60"
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
                              onBlur={() =>
                                persist(r.productId, r.countedQty)
                              }
                            />
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`font-medium ${diffClass(diffQty)}`}>
                          {diffSign(diffQty)} {diffQty}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`font-medium ${diffClass(
                            saved?.diffValue == null
                              ? 0
                              : Number(saved.diffValue),
                          )}`}
                        >
                          {saved?.diffValue == null
                            ? "—"
                            : Number(saved.diffValue).toLocaleString()}
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
          <div className="mt-6 flex justify-end">
            <Button onClick={onComplete} disabled={completing}>
              {t("stockTakes.complete")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
