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

// Selling-price tiers accept either an absolute amount or a percent markup on
// the line's cost (priceIn). Percent is a UI convenience only — the API always
// receives the computed amount.
type PriceMode = "sum" | "pct";

interface Line {
  key: string;
  productId: string;
  // Unit of the picked product; 'kg' → weighed goods, received in fractional kg.
  quantityType?: string | null;
  quantity: string;
  priceIn: string;
  // Selling price for this batch. Blank → keep the product's current price.
  priceOut: string;
  priceOutMode: PriceMode;
  // Optional wholesale ("ulgurji") + bundle ("to'plam") tiers. Blank → keep the
  // product's current tier.
  priceWholesale: string;
  priceWholesaleMode: PriceMode;
  priceBundle: string;
  priceBundleMode: PriceMode;
}

function formatMoney(n: number): string {
  // Same locale as the price inputs (formatNumberInput) so the Summa/Total
  // grouping matches the fields exactly.
  return new Intl.NumberFormat("uz-UZ").format(Math.round(n));
}

/** Percent input: digits plus one decimal separator ("12,5" → "12.5"). */
function sanitizePct(value: string): string {
  const cleaned = value.replace(/,/g, ".").replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  if (dot === -1) return cleaned;
  return cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, "");
}

/**
 * Resolve a tier field to the amount sent to the API. Blank → undefined (keep
 * the product's current price). Percent without a cost price → undefined too.
 */
function tierToNumber(raw: string, mode: PriceMode, base: number): number | undefined {
  if (!raw.trim()) return undefined;
  if (mode === "pct") {
    const pct = Number(raw);
    if (base <= 0 || !Number.isFinite(pct)) return undefined;
    return Math.round(base * (1 + pct / 100));
  }
  return Number(raw) || 0;
}

/** Markup implied by an absolute amount vs the cost, rounded to one decimal. */
function impliedPct(sum: number, base: number): number {
  return Math.round((sum / base - 1) * 1000) / 10;
}

interface SmartPriceInputProps {
  value: string;
  mode: PriceMode;
  /** The line's cost price — the base a percent markup is computed from. */
  base: number;
  currencyLabel: string;
  noBaseHint: string;
  toggleTitle: string;
  onChange: (value: string, mode: PriceMode) => void;
  inputRef?: (el: HTMLInputElement | null) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * Price input with a so'm/% mode chip. In % mode the field edits the markup
 * while focused and shows the resulting price when blurred (the chip keeps the
 * percent visible), so the row always reads as real prices. Typing "%" in the
 * field, or clicking the chip, toggles the mode and converts the value both
 * ways — 15 000 with cost 12 000 becomes 25%, and back.
 */
function SmartPriceInput({
  value,
  mode,
  base,
  currencyLabel,
  noBaseHint,
  toggleTitle,
  onChange,
  inputRef,
  onKeyDown,
}: SmartPriceInputProps) {
  const [focused, setFocused] = useState(false);
  const innerRef = useRef<HTMLInputElement | null>(null);

  const computed = tierToNumber(value, mode, base);
  const sumValue = mode === "sum" ? Number(value) || 0 : 0;

  const display =
    mode === "pct"
      ? focused || computed == null
        ? value
        : formatNumberInput(String(computed))
      : formatNumberInput(value);

  const setRef = (el: HTMLInputElement | null) => {
    innerRef.current = el;
    inputRef?.(el);
  };

  const toggleMode = () => {
    if (mode === "sum") {
      const pct = base > 0 && sumValue > 0 ? impliedPct(sumValue, base) : null;
      onChange(pct != null ? String(pct) : "", "pct");
    } else {
      onChange(computed != null ? String(computed) : "", "sum");
    }
    requestAnimationFrame(() => innerRef.current?.focus());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "%") {
      e.preventDefault();
      if (mode === "sum") toggleMode();
      return;
    }
    onKeyDown?.(e);
  };

  // Live preview while typing: % mode shows the resulting price, sum mode the
  // implied markup vs cost.
  let bubble = "";
  if (focused && value.trim()) {
    if (mode === "pct") {
      bubble = computed != null ? `= ${formatMoney(computed)}` : noBaseHint;
    } else if (base > 0 && sumValue > 0) {
      const pct = impliedPct(sumValue, base);
      bubble = `${pct >= 0 ? "+" : ""}${pct}%`;
    }
  }

  return (
    <div className="relative">
      {bubble && (
        <div className="pointer-events-none absolute bottom-full right-0 z-20 mb-1 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1 text-theme-xs font-medium text-white shadow-theme-lg dark:bg-gray-600">
          {bubble}
        </div>
      )}
      <Input
        ref={setRef}
        type="text"
        inputMode={mode === "pct" ? "decimal" : "numeric"}
        className="pr-14"
        placeholder="0"
        value={display}
        onChange={(e) =>
          onChange(
            mode === "pct" ? sanitizePct(e.target.value) : digitsOnly(e.target.value),
            mode,
          )
        }
        onKeyDown={handleKeyDown}
        onFocus={(e) => {
          setFocused(true);
          // The displayed price flips to the raw percent — select it so typing
          // replaces the old markup in one go.
          if (mode === "pct") e.target.select();
        }}
        onBlur={() => setFocused(false)}
      />
      <button
        type="button"
        tabIndex={-1}
        title={toggleTitle}
        onMouseDown={(e) => e.preventDefault()}
        onClick={toggleMode}
        className={`absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md px-1.5 py-0.5 text-theme-xs font-semibold transition-colors ${
          mode === "pct"
            ? "bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-400 dark:hover:bg-brand-500/25"
            : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        }`}
      >
        {mode === "pct" ? (focused || !value.trim() ? "%" : `${value}%`) : currencyLabel}
      </button>
    </div>
  );
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
  priceOutMode: "sum",
  priceWholesale: "",
  priceWholesaleMode: "sum",
  priceBundle: "",
  priceBundleMode: "sum",
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

  // Chip label for the tier inputs' sum mode; % markup is always vs priceIn.
  const currencyLabel = currency === "USD" ? "$" : t("goodsReceipt.som") || "so'm";
  const noBaseHint = t("goodsReceipt.pctNeedsCost") || "Avval kirim narxini kiriting";
  const priceModeTitle = t("goodsReceipt.priceModeToggle") || "so'm / %";

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
    // Prefill cost + selling tiers from the product's current values (as
    // absolute amounts — the % mode is an explicit per-field choice).
    updateLine(key, {
      productId,
      quantityType: product?.quantityType ?? null,
      priceIn: product ? String(Math.round(Number(product.priceIn))) : "",
      priceOut: product ? String(Math.round(Number(product.priceOut))) : "",
      priceOutMode: "sum",
      priceWholesale:
        product?.priceWholesale != null
          ? String(Math.round(Number(product.priceWholesale)))
          : "",
      priceWholesaleMode: "sum",
      priceBundle:
        product?.priceBundle != null
          ? String(Math.round(Number(product.priceBundle)))
          : "",
      priceBundleMode: "sum",
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
      .map((l) => {
        const base = Number(l.priceIn) || 0;
        return {
          productId: l.productId,
          // Weighed goods keep a fractional kg (rounded to whole grams); piece
          // products stay whole numbers.
          quantity:
            l.quantityType === "kg"
              ? Math.round((Number(l.quantity) || 0) * 1000) / 1000
              : Math.trunc(Number(l.quantity) || 0),
          priceIn: base,
          // % fields resolve to amounts here — the API never sees a percent.
          // Blank → undefined so the backend keeps the current price/tier.
          priceOut: tierToNumber(l.priceOut, l.priceOutMode, base),
          priceWholesale: tierToNumber(l.priceWholesale, l.priceWholesaleMode, base),
          priceBundle: tierToNumber(l.priceBundle, l.priceBundleMode, base),
        };
      });

    if (items.length === 0) {
      return setError(t("goodsReceipt.errors.noItems") || "Add at least one product");
    }
    if (items.some((i) => i.quantity <= 0)) {
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
        <div className="hidden grid-cols-[minmax(0,3fr)_minmax(0,1.2fr)_minmax(0,1.8fr)_minmax(0,1.8fr)_minmax(0,1.8fr)_minmax(0,1.8fr)_minmax(0,2fr)_44px] gap-3 border-b border-gray-200 pb-2 text-theme-xs font-medium uppercase tracking-wide text-gray-400 dark:border-gray-800 sm:grid">
          <div>{t("goodsReceipt.product")}</div>
          <div>{t("goodsReceipt.quantity")}</div>
          <div>{t("goodsReceipt.priceIn")}</div>
          <div>{t("goodsReceipt.priceOut") || "Цена продажи"}</div>
          <div>{t("goodsReceipt.priceBundle") || "To'plam"}</div>
          <div>{t("goodsReceipt.priceWholesale") || "Ulgurji"}</div>
          <div className="text-right">{t("goodsReceipt.lineTotal")}</div>
          <div />
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
          {lines.map((l, index) => {
            const lineTotal = (Number(l.quantity) || 0) * (Number(l.priceIn) || 0);
            return (
              <div
                key={l.key}
                className="grid grid-cols-1 gap-3 py-3 sm:grid-cols-[minmax(0,3fr)_minmax(0,1.2fr)_minmax(0,1.8fr)_minmax(0,1.8fr)_minmax(0,1.8fr)_minmax(0,1.8fr)_minmax(0,2fr)_44px] sm:items-center"
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
                    {l.quantityType === "kg" ? " (kg)" : ""}
                  </span>
                  <Input
                    ref={(el) => {
                      qtyRefs.current.set(l.key, el);
                    }}
                    type="number"
                    min={l.quantityType === "kg" ? "0" : "1"}
                    step={l.quantityType === "kg" ? 0.001 : 1}
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
                  <SmartPriceInput
                    inputRef={(el) => {
                      priceOutRefs.current.set(l.key, el);
                    }}
                    value={l.priceOut}
                    mode={l.priceOutMode}
                    base={Number(l.priceIn) || 0}
                    currencyLabel={currencyLabel}
                    noBaseHint={noBaseHint}
                    toggleTitle={priceModeTitle}
                    onChange={(value, mode) =>
                      updateLine(l.key, { priceOut: value, priceOutMode: mode })
                    }
                    onKeyDown={(e) => onPriceOutKeyDown(e, index)}
                  />
                </div>
                <div>
                  <span className="mb-1 block text-theme-xs text-gray-500 dark:text-gray-400 sm:hidden">
                    {t("goodsReceipt.priceBundle") || "To'plam"}
                  </span>
                  <SmartPriceInput
                    value={l.priceBundle}
                    mode={l.priceBundleMode}
                    base={Number(l.priceIn) || 0}
                    currencyLabel={currencyLabel}
                    noBaseHint={noBaseHint}
                    toggleTitle={priceModeTitle}
                    onChange={(value, mode) =>
                      updateLine(l.key, { priceBundle: value, priceBundleMode: mode })
                    }
                  />
                </div>
                <div>
                  <span className="mb-1 block text-theme-xs text-gray-500 dark:text-gray-400 sm:hidden">
                    {t("goodsReceipt.priceWholesale") || "Ulgurji"}
                  </span>
                  <SmartPriceInput
                    value={l.priceWholesale}
                    mode={l.priceWholesaleMode}
                    base={Number(l.priceIn) || 0}
                    currencyLabel={currencyLabel}
                    noBaseHint={noBaseHint}
                    toggleTitle={priceModeTitle}
                    onChange={(value, mode) =>
                      updateLine(l.key, { priceWholesale: value, priceWholesaleMode: mode })
                    }
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
            <Kbd>%</Kbd> {t("goodsReceipt.shortcuts.pct")}
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
