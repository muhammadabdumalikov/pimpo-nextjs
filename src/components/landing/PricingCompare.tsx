"use client";

import { useState } from "react";
import { useTranslations } from "@/hooks/useTranslations";
import { CheckIcon, ChevronIcon } from "./icons";

// Shared column template: the header and every feature row use it so the
// columns stay aligned even though each group is its own collapsible block.
const COLS = "grid grid-cols-[minmax(200px,1.7fr)_repeat(3,minmax(96px,1fr))]";

// Detailed feature matrix (BILLZ-style). Each cell is one of:
//   true  → ✓ · false → — · numeric/literal string → shown as-is
//   value token (in VALUE_TOKENS) → translated via landing.compare.values.*
const VALUE_TOKENS = new Set([
  "unlimited",
  "full",
  "basic",
  "limited",
  "extended",
  "standard",
  "priority",
  "credit20",
]);

type Cell = boolean | string;
type Row = { key: string; basic: Cell; pro: Cell; proplus: Cell };

const GROUPS: { key: string; rows: Row[] }[] = [
  {
    key: "core",
    rows: [
      { key: "branches", basic: "1 + 3", pro: "1 + 5", proplus: "unlimited" },
      { key: "branchDiscount", basic: "+150 000", pro: "+150 000", proplus: "+150 000" },
      { key: "products", basic: "unlimited", pro: "unlimited", proplus: "unlimited" },
      { key: "users", basic: "4", pro: "10", proplus: "unlimited" },
    ],
  },
  {
    key: "pos",
    rows: [
      { key: "checkout", basic: true, pro: true, proplus: true },
      { key: "barcode", basic: true, pro: true, proplus: true },
      { key: "payments", basic: true, pro: true, proplus: true },
      { key: "discount", basic: true, pro: true, proplus: true },
      { key: "receipt", basic: true, pro: true, proplus: true },
    ],
  },
  {
    key: "credit",
    rows: [
      { key: "creditSale", basic: "full", pro: "full", proplus: "full" },
      { key: "ledger", basic: true, pro: true, proplus: true },
    ],
  },
  {
    key: "inventory",
    rows: [
      { key: "stock", basic: "full", pro: "full", proplus: "full" },
      { key: "bulk", basic: false, pro: true, proplus: true },
      { key: "productImages", basic: false, pro: true, proplus: true },
    ],
  },
  {
    key: "procurement",
    rows: [{ key: "suppliers", basic: true, pro: true, proplus: true }],
  },
  {
    key: "reports",
    rows: [
      { key: "dashboard", basic: true, pro: true, proplus: true },
      { key: "performance", basic: true, pro: "extended", proplus: "extended" },
      { key: "staffSales", basic: true, pro: true, proplus: true },
    ],
  },
  {
    key: "team",
    rows: [{ key: "roles", basic: "basic", pro: "full", proplus: "full" }],
  },
  {
    key: "support",
    rows: [{ key: "support", basic: "standard", pro: "priority", proplus: "priority" }],
  },
];

export default function PricingCompare() {
  const { t } = useTranslations();
  // Groups fold independently (FAQ-style) so the matrix stays scannable.
  // "core" starts open as the entry point.
  const [openGroups, setOpenGroups] = useState<string[]>(["core"]);

  const toggle = (key: string) =>
    setOpenGroups((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );

  const renderCell = (value: Cell) => {
    if (value === true) {
      return (
        <span className="inline-flex text-brand-500">
          <CheckIcon className="h-5 w-5" />
        </span>
      );
    }
    if (value === false) {
      return <span className="text-gray-300 dark:text-gray-600">—</span>;
    }
    const label = VALUE_TOKENS.has(value)
      ? t(`landing.compare.values.${value}`)
      : value;
    return (
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
    );
  };

  return (
    <div className="mt-16">
      <h3 className="mb-8 text-center text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
        {t("landing.compare.title")}
      </h3>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
        <div className="min-w-[640px]">
          {/* Column header — shared by every group below */}
          <div
            className={`${COLS} border-b border-gray-200 bg-gray-50/60 dark:border-gray-800 dark:bg-white/[0.03]`}
          >
            <div className="px-5 py-4 text-sm font-semibold text-gray-700 dark:text-gray-200">
              {t("landing.compare.feature")}
            </div>
            <div className="px-5 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
              {t("landing.pricing.basic.name")}
            </div>
            <div className="flex flex-col items-center gap-1.5 bg-brand-50/60 px-5 py-4 text-sm font-semibold text-brand-700 dark:bg-brand-500/[0.06] dark:text-brand-300">
              <span>{t("landing.pricing.pro.name")}</span>
              <span className="rounded-full bg-brand-500 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                {t("landing.pricing.popular")}
              </span>
            </div>
            <div className="px-5 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
              {t("landing.pricing.proplus.name")}
            </div>
          </div>

          {GROUPS.map((group) => {
            const isOpen = openGroups.includes(group.key);
            return (
              <div key={group.key}>
                <button
                  type="button"
                  onClick={() => toggle(group.key)}
                  aria-expanded={isOpen}
                  aria-controls={`compare-group-${group.key}`}
                  className="flex w-full items-center gap-2 bg-brand-50 px-5 py-3 text-left transition-colors hover:bg-brand-100/70 dark:bg-brand-500/10 dark:hover:bg-brand-500/[0.16]"
                >
                  {/* Closed points right, open points down — chevron sits next
                      to the label so the two read as one control. */}
                  <ChevronIcon
                    className={`h-4 w-4 flex-none text-brand-600 transition-transform dark:text-brand-300 ${
                      isOpen ? "" : "-rotate-90"
                    }`}
                  />
                  <span className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
                    {t(`landing.compare.groups.${group.key}`)}
                  </span>
                </button>

                <div
                  id={`compare-group-${group.key}`}
                  className={`grid transition-all duration-300 ease-out ${
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    {group.rows.map((row) => (
                      <div
                        key={`${group.key}.${row.key}`}
                        className={`${COLS} border-t border-gray-100 dark:border-gray-800/70`}
                      >
                        <div className="px-5 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {t(`landing.compare.rows.${row.key}`)}
                        </div>
                        <div className="px-5 py-3 text-center">
                          {renderCell(row.basic)}
                        </div>
                        <div className="bg-brand-50/40 px-5 py-3 text-center dark:bg-brand-500/[0.04]">
                          {renderCell(row.pro)}
                        </div>
                        <div className="px-5 py-3 text-center">
                          {renderCell(row.proplus)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
