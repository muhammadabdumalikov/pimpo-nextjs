"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTranslations } from "@/hooks/useTranslations";
import { getStaff, type Staff } from "@/lib/api";
import SelectField from "@/components/form/SelectField";
import { formatNumberInput, digitsOnly } from "@/lib/number";

export interface SalesFilterValues {
  paymentMethod: string; // "" = any
  cashierId: string; // "" = any
  minAmount: string;
  maxAmount: string;
}

export const EMPTY_FILTERS: SalesFilterValues = {
  paymentMethod: "",
  cashierId: "",
  minAmount: "",
  maxAmount: "",
};

export function countActiveFilters(f: SalesFilterValues): number {
  return [f.paymentMethod, f.cashierId, f.minAmount, f.maxAmount].filter(
    Boolean,
  ).length;
}

export default function SalesFilters({
  value,
  onChange,
}: {
  value: SalesFilterValues;
  onChange: (f: SalesFilterValues) => void;
}) {
  const { t } = useTranslations();
  const [open, setOpen] = useState(false);
  const [temp, setTemp] = useState<SalesFilterValues>(value);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Seed the working copy when the panel opens (done in the toggle handler to
  // avoid a synchronous setState inside an effect).
  const toggle = () => {
    if (!open) setTemp(value);
    setOpen((o) => !o);
  };

  useEffect(() => {
    if (!open || staffList.length) return;
    getStaff()
      .then(setStaffList)
      .catch(() => {
        /* non-fatal */
      });
  }, [open, staffList.length]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const active = countActiveFilters(value);
  const tempActive = countActiveFilters(temp);

  const methods = [
    { key: "", label: t("sales.allMethods") || "Any" },
    { key: "cash", label: t("checkout.cash") || "Cash" },
    { key: "card", label: t("checkout.card") || "Card" },
    { key: "split", label: t("checkout.split") || "Split" },
    { key: "debt", label: t("checkout.debt") || "Credit" },
  ];

  const apply = () => {
    onChange(temp);
    setOpen(false);
  };
  const reset = () => {
    setTemp(EMPTY_FILTERS);
    onChange(EMPTY_FILTERS);
    setOpen(false);
  };

  const inputClass =
    "h-11 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm text-gray-800 placeholder:text-gray-400 shadow-theme-xs focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white/90";

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        onClick={toggle}
        className={`flex h-12 items-center gap-2.5 rounded-xl border px-4 text-sm font-semibold shadow-theme-xs transition ${
          active > 0 || open
            ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
            : "border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-white/[0.06]"
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h14M6 10h8M8.5 15h3" />
        </svg>
        {t("sales.filters") || "Filters"}
        {active > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1 text-xs font-bold text-white">
            {active}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[min(92vw,360px)] rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark">
          {/* Payment method */}
          <div>
            <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t("checkout.paymentMethod") || "Payment method"}
            </p>
            <div className="flex flex-wrap gap-2">
              {methods.map((m) => {
                const on = temp.paymentMethod === m.key;
                return (
                  <button
                    key={m.key || "any"}
                    type="button"
                    onClick={() =>
                      setTemp((s) => ({ ...s, paymentMethod: m.key }))
                    }
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                      on
                        ? "border-brand-500 bg-brand-500 text-white shadow-theme-xs"
                        : "border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300 dark:hover:bg-white/[0.06]"
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cashier */}
          <div className="mt-5">
            <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t("sales.cashier") || "Cashier"}
            </p>
            <SelectField
              value={temp.cashierId}
              onChange={(v) => setTemp((s) => ({ ...s, cashierId: v }))}
              placeholder={t("sales.allCashiers") || "All cashiers"}
              options={[
                { value: "", label: t("sales.allCashiers") || "All cashiers" },
                ...staffList.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
          </div>

          {/* Amount range */}
          <div className="mt-5">
            <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t("sales.amountRange") || "Amount range"}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <input
                inputMode="numeric"
                value={formatNumberInput(temp.minAmount)}
                onChange={(e) =>
                  setTemp((s) => ({ ...s, minAmount: digitsOnly(e.target.value) }))
                }
                placeholder={t("sales.min") || "Min"}
                className={inputClass}
              />
              <input
                inputMode="numeric"
                value={formatNumberInput(temp.maxAmount)}
                onChange={(e) =>
                  setTemp((s) => ({ ...s, maxAmount: digitsOnly(e.target.value) }))
                }
                placeholder={t("sales.max") || "Max"}
                className={inputClass}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
            <button
              type="button"
              onClick={reset}
              disabled={active === 0 && tempActive === 0}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 disabled:opacity-40 dark:text-gray-300 dark:hover:bg-white/[0.06]"
            >
              {t("sales.reset") || "Reset"}
            </button>
            <button
              type="button"
              onClick={apply}
              className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-brand-600"
            >
              {t("sales.apply") || "Apply"}
              {tempActive > 0 ? ` (${tempActive})` : ""}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
