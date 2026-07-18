"use client";

import { Fragment } from "react";
import { useTranslations } from "@/hooks/useTranslations";
import { CheckIcon } from "./icons";

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
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/60 dark:border-gray-800 dark:bg-white/[0.03]">
              <th className="px-5 py-4 text-sm font-semibold text-gray-700 dark:text-gray-200">
                {t("landing.compare.feature")}
              </th>
              <th className="px-5 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                {t("landing.pricing.basic.name")}
              </th>
              <th className="bg-brand-50/60 px-5 py-4 text-center text-sm font-semibold text-brand-700 dark:bg-brand-500/[0.06] dark:text-brand-300">
                <div className="flex flex-col items-center gap-1.5">
                  <span>{t("landing.pricing.pro.name")}</span>
                  <span className="rounded-full bg-brand-500 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    {t("landing.pricing.popular")}
                  </span>
                </div>
              </th>
              <th className="px-5 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                {t("landing.pricing.proplus.name")}
              </th>
            </tr>
          </thead>
          <tbody>
            {GROUPS.map((group) => (
              <Fragment key={group.key}>
                <tr>
                  <td
                    colSpan={4}
                    className="bg-brand-50 px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                  >
                    {t(`landing.compare.groups.${group.key}`)}
                  </td>
                </tr>
                {group.rows.map((row) => (
                  <tr
                    key={`${group.key}.${row.key}`}
                    className="border-t border-gray-100 dark:border-gray-800/70"
                  >
                    <td className="px-5 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {t(`landing.compare.rows.${row.key}`)}
                    </td>
                    <td className="px-5 py-3 text-center">{renderCell(row.basic)}</td>
                    <td className="bg-brand-50/40 px-5 py-3 text-center dark:bg-brand-500/[0.04]">
                      {renderCell(row.pro)}
                    </td>
                    <td className="px-5 py-3 text-center">{renderCell(row.proplus)}</td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
