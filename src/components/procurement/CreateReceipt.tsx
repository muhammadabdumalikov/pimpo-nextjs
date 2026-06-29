"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import SelectField from "@/components/form/SelectField";
import Button from "@/components/ui/button/Button";
import { PlusIcon, TrashBinIcon } from "@/icons/index";
import {
  getProducts,
  getSuppliers,
  createReceipt,
  type Product,
  type Supplier,
} from "@/lib/api";

interface Line {
  key: string;
  productId: string;
  quantity: string;
  priceIn: string;
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(Math.round(n));
}

let lineSeq = 0;
const newLine = (): Line => ({
  key: `line-${lineSeq++}`,
  productId: "",
  quantity: "1",
  priceIn: "",
});

export default function CreateReceipt() {
  const { t } = useTranslations();
  const { showToast } = useToast();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [supplierId, setSupplierId] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setIsLoading(true);
        const [prodRes, supRes] = await Promise.all([
          getProducts(1, 1000),
          getSuppliers(1, 1000),
        ]);
        if (active) {
          setProducts(prodRes.products);
          setSuppliers(supRes.suppliers);
        }
      } catch (err: unknown) {
        showToast("error", (err as Error)?.message || "Failed to load data", "Error");
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const productOptions = useMemo(
    () => products.map((p) => ({ value: p.id, label: p.code ? `${p.name} (${p.code})` : p.name })),
    [products],
  );

  const total = useMemo(
    () =>
      lines.reduce((sum, l) => {
        const qty = Number(l.quantity) || 0;
        const price = Number(l.priceIn) || 0;
        return sum + qty * price;
      }, 0),
    [lines],
  );

  const updateLine = (key: string, patch: Partial<Line>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  const onPickProduct = (key: string, productId: string) => {
    const product = products.find((p) => p.id === productId);
    // Prefill the unit cost from the product's current priceIn as a convenience.
    updateLine(key, {
      productId,
      priceIn: product ? String(Math.round(Number(product.priceIn))) : "",
    });
  };

  const addLine = () => setLines((prev) => [...prev, newLine()]);
  const removeLine = (key: string) =>
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const items = lines
      .filter((l) => l.productId)
      .map((l) => ({
        productId: l.productId,
        quantity: Math.trunc(Number(l.quantity) || 0),
        priceIn: Number(l.priceIn) || 0,
      }));

    if (items.length === 0) {
      return setError(t("goodsReceipt.errors.noItems") || "Add at least one product");
    }
    if (items.some((i) => i.quantity < 1)) {
      return setError(t("goodsReceipt.errors.badQuantity") || "Quantity must be at least 1");
    }

    setIsSubmitting(true);
    setError("");
    try {
      await createReceipt({
        items,
        supplierId: supplierId || undefined,
        note: note.trim() || undefined,
      });
      showToast("success", t("goodsReceipt.createSuccess") || "Receipt created — stock updated", "Success");
      router.push("/receipts");
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to create receipt");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-gray-200 bg-white px-4 pb-5 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6"
    >
      <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
        {t("goodsReceipt.createTitle")}
      </h3>
      <p className="mb-5 text-theme-sm text-gray-500 dark:text-gray-400">
        {t("goodsReceipt.createDescription")}
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-600 dark:border-error-800 dark:bg-error-900/20 dark:text-error-400">
          {error}
        </div>
      )}

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>{t("goodsReceipt.supplierLabel")}</Label>
          <SelectField
            value={supplierId}
            onChange={setSupplierId}
            placeholder={t("goodsReceipt.selectSupplier")}
            searchable
            searchPlaceholder={t("goodsReceipt.searchSupplier") || "Search supplier..."}
            options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
          />
        </div>
        <div>
          <Label>{t("goodsReceipt.noteLabel")}</Label>
          <Input
            type="text"
            placeholder={t("goodsReceipt.notePlaceholder")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>

      {/* Line items */}
      <div className="mb-3 overflow-x-auto">
        <table className="min-w-[680px] w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-theme-xs uppercase tracking-wide text-gray-400 dark:border-gray-800">
              <th className="px-2 py-3 font-medium">{t("goodsReceipt.product")}</th>
              <th className="px-2 py-3 font-medium w-28">{t("goodsReceipt.quantity")}</th>
              <th className="px-2 py-3 font-medium w-36">{t("goodsReceipt.priceIn")}</th>
              <th className="px-2 py-3 font-medium w-36 text-right">{t("goodsReceipt.lineTotal")}</th>
              <th className="px-2 py-3 w-10" />
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const lineTotal = (Number(l.quantity) || 0) * (Number(l.priceIn) || 0);
              return (
                <tr key={l.key} className="border-b border-gray-100 align-top dark:border-gray-800/60">
                  <td className="px-2 py-2">
                    <SelectField
                      value={l.productId}
                      onChange={(v) => onPickProduct(l.key, v)}
                      placeholder={t("goodsReceipt.selectProduct")}
                      searchable
                      searchPlaceholder={t("goodsReceipt.searchProduct") || "Search product..."}
                      options={productOptions}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      min="1"
                      step={1}
                      value={l.quantity}
                      onChange={(e) => updateLine(l.key, { quantity: e.target.value })}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      min="0"
                      step={0.01}
                      value={l.priceIn}
                      onChange={(e) => updateLine(l.key, { priceIn: e.target.value })}
                    />
                  </td>
                  <td className="px-2 py-2 text-right font-medium text-gray-800 dark:text-white/90">
                    {formatMoney(lineTotal)}
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => removeLine(l.key)}
                      disabled={lines.length <= 1}
                      className="rounded-lg p-2 text-gray-500 hover:bg-error-50 hover:text-error-500 disabled:opacity-40 dark:text-gray-400 dark:hover:bg-error-500/10"
                      aria-label={t("goodsReceipt.removeLine")}
                    >
                      <TrashBinIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={addLine}
        className="mb-5 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-theme-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
      >
        <PlusIcon />
        {t("goodsReceipt.addLine")}
      </button>

      <div className="flex flex-col-reverse gap-4 border-t border-gray-200 pt-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-base font-semibold text-gray-800 dark:text-white/90">
          {t("goodsReceipt.total")}: {formatMoney(total)}
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => router.push("/receipts")}
            disabled={isSubmitting}
          >
            {t("goodsReceipt.cancel")}
          </Button>
          <Button type="submit" size="md" disabled={isSubmitting}>
            {isSubmitting ? t("goodsReceipt.saving") : t("goodsReceipt.save")}
          </Button>
        </div>
      </div>
    </form>
  );
}
