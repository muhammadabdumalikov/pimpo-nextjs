"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import SelectField from "@/components/form/SelectField";
import Button from "@/components/ui/button/Button";
import { PlusIcon, TrashBinIcon } from "@/icons/index";
import { formatNumberInput, digitsOnly } from "@/lib/number";
import {
  getProducts,
  getSuppliers,
  getBranches,
  createReceipt,
  type Product,
  type Supplier,
  type Branch,
} from "@/lib/api";

interface Line {
  key: string;
  productId: string;
  quantity: string;
  priceIn: string;
  // Selling price for this batch. Blank → keep the product's current price.
  priceOut: string;
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(Math.round(n));
}

/** Small keyboard-key chip for the shortcuts legend. */
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-md border border-gray-200 bg-gray-50 px-1.5 text-theme-xs font-semibold text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
      {children}
    </kbd>
  );
}

let lineSeq = 0;
const newLine = (): Line => ({
  key: `line-${lineSeq++}`,
  productId: "",
  quantity: "1",
  priceIn: "",
  priceOut: "",
});

export default function CreateReceipt() {
  const { t } = useTranslations();
  const { showToast } = useToast();
  const router = useRouter();

  // Backend product search: results for the current query, plus a cache of every
  // product we've seen so picked rows keep their label/cost as results change.
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const productCache = useRef<Map<string, Product>>(new Map());
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [supplierId, setSupplierId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [note, setNote] = useState("");
  const [currency, setCurrency] = useState<"UZS" | "USD">("UZS");
  const [usdRate, setUsdRate] = useState("");
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  // The line whose product picker should open on mount (just-added row).
  const [autoFocusKey, setAutoFocusKey] = useState<string | null>(null);
  const [isMac, setIsMac] = useState(false);

  // Per-line input refs so shortcuts can move focus across fields.
  const qtyRefs = useRef<Map<string, HTMLInputElement | null>>(new Map());
  const priceRefs = useRef<Map<string, HTMLInputElement | null>>(new Map());
  const priceOutRefs = useRef<Map<string, HTMLInputElement | null>>(new Map());

  useEffect(() => {
    const ua = `${navigator.platform || ""} ${navigator.userAgent || ""}`;
    setIsMac(/Mac|iPhone|iPad|iPod/.test(ua));
  }, []);

  // Suppliers load on mount (small list, needed for the always-visible picker).
  // Products are loaded lazily the first time a product dropdown is opened.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setIsLoading(true);
        const [supRes, brRes] = await Promise.all([
          getSuppliers(1, 1000),
          getBranches(),
        ]);
        if (active) {
          setSuppliers(supRes.suppliers);
          setBranches(brRes.branches);
          // Preselect the default branch ("Asosiy do'kon").
          const def = brRes.branches.find((b) => b.isDefault) ?? brRes.branches[0];
          if (def) setBranchId(def.id);
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

  // Backend search by name / code / barcode (server filters via `?search=`).
  // Called by SelectField on open (empty query → default list) and as you type
  // or scan. Results feed every line's picker; the cache keeps picked rows.
  const searchProducts = useCallback(async (query: string) => {
    setProductsLoading(true);
    try {
      const res = await getProducts(1, 10, query.trim() || undefined);
      for (const p of res.products) productCache.current.set(p.id, p);
      setProductResults(res.products);
    } catch (err: unknown) {
      showToast("error", (err as Error)?.message || "Failed to search products", "Error");
    } finally {
      setProductsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toOption = (p: Product) => ({
    value: p.id,
    label: p.code ? `${p.name} (${p.code})` : p.name,
    // Matched by the search box but not shown — lets the scanner hit on barcode.
    keywords: [p.name, p.code, p.barcode].filter(Boolean).join(" "),
  });

  // Options for a given row: the current search results, plus the row's own
  // selected product (from cache) if it isn't in the results — so the trigger
  // always shows the picked product's name.
  const optionsForLine = (selectedId: string) => {
    const opts = productResults.map(toOption);
    if (selectedId && !productResults.some((p) => p.id === selectedId)) {
      const cached = productCache.current.get(selectedId);
      if (cached) opts.unshift(toOption(cached));
    }
    return opts;
  };

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
    const product = productCache.current.get(productId);
    // Prefill cost and selling price from the product's current values.
    updateLine(key, {
      productId,
      priceIn: product ? String(Math.round(Number(product.priceIn))) : "",
      priceOut: product ? String(Math.round(Number(product.priceOut))) : "",
    });
    // Move straight to the quantity field so the row fills with the keyboard.
    requestAnimationFrame(() => qtyRefs.current.get(key)?.focus());
  };

  const addLine = useCallback(() => {
    const line = newLine();
    setLines((prev) => [...prev, line]);
    // Auto-open the new row's product picker for uninterrupted entry.
    setAutoFocusKey(line.key);
    return line.key;
  }, []);

  const removeLine = (key: string) => {
    qtyRefs.current.delete(key);
    priceRefs.current.delete(key);
    priceOutRefs.current.delete(key);
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));
  };

  // Enter in quantity → jump to price; Enter in price → add a new line (or jump
  // to the next existing row). Plain Enter never submits — that's Ctrl/Cmd+Enter.
  const onQtyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, key: string) => {
    if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      priceRefs.current.get(key)?.focus();
    }
  };

  // Enter in cost → jump to selling price.
  const onPriceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, key: string) => {
    if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      priceOutRefs.current.get(key)?.focus();
    }
  };

  // Enter in selling price → next existing row, or add a new line.
  const onPriceOutKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      const next = lines[index + 1];
      if (next) {
        qtyRefs.current.get(next.key)?.focus();
      } else {
        addLine();
      }
    }
  };

  const submit = async (draft: boolean) => {
    const items = lines
      .filter((l) => l.productId)
      .map((l) => ({
        productId: l.productId,
        quantity: Math.trunc(Number(l.quantity) || 0),
        priceIn: Number(l.priceIn) || 0,
        // Omit when blank so the backend keeps the product's current price.
        priceOut: l.priceOut.trim() ? Number(l.priceOut) : undefined,
      }));

    if (items.length === 0) {
      return setError(t("goodsReceipt.errors.noItems") || "Add at least one product");
    }
    if (items.some((i) => i.quantity < 1)) {
      return setError(t("goodsReceipt.errors.badQuantity") || "Quantity must be at least 1");
    }
    const rate = Number(digitsOnly(usdRate)) || 0;
    if (currency === "USD" && rate <= 0) {
      return setError(t("goodsReceipt.errors.rateRequired") || "Enter the USD rate");
    }

    setIsSubmitting(true);
    setError("");
    try {
      await createReceipt({
        items,
        supplierId: supplierId || undefined,
        branchId: branchId || undefined,
        note: note.trim() || undefined,
        draft: draft || undefined,
        currency,
        usdRate: currency === "USD" ? rate : undefined,
      });
      showToast(
        "success",
        draft
          ? t("goodsReceipt.draftSaved")
          : t("goodsReceipt.createSuccess") || "Receipt created — stock updated",
        "Success",
      );
      router.push("/receipts");
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to create receipt");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit(false);
  };

  // Esc cancels (back to the list). An open product picker swallows Esc first,
  // so the first press closes the dropdown and the second leaves the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || isSubmitting) return;
      if (document.querySelector('[role="listbox"]')) return;
      router.push("/receipts");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isSubmitting, router]);

  // Ctrl/Cmd+Enter submits from anywhere in the form.
  const onFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      e.currentTarget.requestSubmit();
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
      onKeyDown={onFormKeyDown}
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
        {branches.length > 1 && (
          <div>
            <Label>{t("goodsReceipt.branchLabel")}</Label>
            <SelectField
              value={branchId}
              onChange={setBranchId}
              placeholder={t("goodsReceipt.selectBranch")}
              options={branches.map((b) => ({ value: b.id, label: b.name }))}
            />
          </div>
        )}
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
        <div>
          <Label>{t("goodsReceipt.currency")}</Label>
          <SelectField
            value={currency}
            onChange={(v) => setCurrency(v as "UZS" | "USD")}
            options={[
              { value: "UZS", label: "UZS" },
              { value: "USD", label: "USD" },
            ]}
          />
        </div>
        {currency === "USD" && (
          <div>
            <Label>{t("goodsReceipt.usdRate")}</Label>
            <Input
              inputMode="numeric"
              value={formatNumberInput(usdRate)}
              onChange={(e) => setUsdRate(digitsOnly(e.target.value))}
              placeholder="12800"
            />
          </div>
        )}
      </div>

      {/* Line items — plain divs (not a table in an overflow container) so the
          product dropdown can overlay freely without being clipped. */}
      <div className="mb-3">
        {/* Column headers (desktop only) */}
        <div className="hidden grid-cols-[minmax(0,420px)_88px_120px_120px_120px_44px] gap-3 border-b border-gray-200 pb-2 text-theme-xs font-medium uppercase tracking-wide text-gray-400 dark:border-gray-800 sm:grid">
          <div>{t("goodsReceipt.product")}</div>
          <div>{t("goodsReceipt.quantity")}</div>
          <div>{t("goodsReceipt.priceIn")}</div>
          <div>{t("goodsReceipt.priceOut") || "Цена продажи"}</div>
          <div className="text-right">{t("goodsReceipt.lineTotal")}</div>
          <div />
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
          {lines.map((l, index) => {
            const lineTotal = (Number(l.quantity) || 0) * (Number(l.priceIn) || 0);
            return (
              <div
                key={l.key}
                className="grid grid-cols-1 gap-3 py-3 sm:grid-cols-[minmax(0,420px)_88px_120px_120px_120px_44px] sm:items-center"
              >
                <div className="min-w-0">
                  <span className="mb-1 block text-theme-xs text-gray-500 dark:text-gray-400 sm:hidden">
                    {t("goodsReceipt.product")}
                  </span>
                  <SelectField
                    value={l.productId}
                    onChange={(v) => onPickProduct(l.key, v)}
                    placeholder={t("goodsReceipt.selectProduct")}
                    searchPlaceholder={t("goodsReceipt.searchProduct") || "Search product..."}
                    options={optionsForLine(l.productId)}
                    onSearch={searchProducts}
                    loading={productsLoading}
                    autoFocus={l.key === autoFocusKey}
                  />
                </div>
                <div>
                  <span className="mb-1 block text-theme-xs text-gray-500 dark:text-gray-400 sm:hidden">
                    {t("goodsReceipt.quantity")}
                  </span>
                  <Input
                    ref={(el) => {
                      qtyRefs.current.set(l.key, el);
                    }}
                    type="number"
                    min="1"
                    step={1}
                    value={l.quantity}
                    onChange={(e) => updateLine(l.key, { quantity: e.target.value })}
                    onKeyDown={(e) => onQtyKeyDown(e, l.key)}
                  />
                </div>
                <div>
                  <span className="mb-1 block text-theme-xs text-gray-500 dark:text-gray-400 sm:hidden">
                    {t("goodsReceipt.priceIn")}
                  </span>
                  <Input
                    ref={(el) => {
                      priceRefs.current.set(l.key, el);
                    }}
                    type="text"
                    inputMode="numeric"
                    value={formatNumberInput(l.priceIn)}
                    onChange={(e) => updateLine(l.key, { priceIn: digitsOnly(e.target.value) })}
                    onKeyDown={(e) => onPriceKeyDown(e, l.key)}
                  />
                </div>
                <div>
                  <span className="mb-1 block text-theme-xs text-gray-500 dark:text-gray-400 sm:hidden">
                    {t("goodsReceipt.priceOut") || "Цена продажи"}
                  </span>
                  <Input
                    ref={(el) => {
                      priceOutRefs.current.set(l.key, el);
                    }}
                    type="text"
                    inputMode="numeric"
                    value={formatNumberInput(l.priceOut)}
                    onChange={(e) => updateLine(l.key, { priceOut: digitsOnly(e.target.value) })}
                    onKeyDown={(e) => onPriceOutKeyDown(e, index)}
                  />
                </div>
                <div className="text-sm font-medium text-gray-800 dark:text-white/90 sm:text-right">
                  <span className="mr-2 text-theme-xs text-gray-500 dark:text-gray-400 sm:hidden">
                    {t("goodsReceipt.lineTotal")}:
                  </span>
                  {formatMoney(lineTotal)}
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeLine(l.key)}
                    disabled={lines.length <= 1}
                    className="rounded-lg p-2 text-gray-500 hover:bg-error-50 hover:text-error-500 disabled:opacity-40 dark:text-gray-400 dark:hover:bg-error-500/10"
                    aria-label={t("goodsReceipt.removeLine")}
                  >
                    <TrashBinIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => addLine()}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-gray-300 bg-white px-3 py-2 text-theme-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
        >
          <PlusIcon />
          {t("goodsReceipt.addLine")}
        </button>

        {/* Keyboard shortcuts legend (desktop) */}
        <div className="hidden flex-wrap items-center gap-x-4 gap-y-1 text-theme-xs text-gray-500 dark:text-gray-400 md:flex">
          <span className="flex items-center gap-1.5">
            <Kbd>↵</Kbd> {t("goodsReceipt.shortcuts.nextField")}
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
            <Kbd>↵</Kbd> {t("goodsReceipt.shortcuts.save")}
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>Esc</Kbd> {t("goodsReceipt.shortcuts.cancel")}
          </span>
        </div>
      </div>

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
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => void submit(true)}
            disabled={isSubmitting}
          >
            {t("goodsReceipt.saveDraft")}
          </Button>
          <Button type="submit" size="md" disabled={isSubmitting}>
            {isSubmitting ? t("goodsReceipt.saving") : t("goodsReceipt.receive")}
          </Button>
        </div>
      </div>
    </form>
  );
}
