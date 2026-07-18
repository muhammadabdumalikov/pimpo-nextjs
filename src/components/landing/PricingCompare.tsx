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
type Row = { key: string; free: Cell; basic: Cell; pro: Cell };

const GROUPS: { key: string; rows: Row[] }[] = [
  {
    key: "core",
    rows: [
      { key: "branches", free: "1", basic: "1 + 3", pro: "1 + 5" },
      { key: "branchDiscount", free: false, basic: "−20%", pro: "−50%" },
      { key: "products", free: "100", basic: "unlimited", pro: "unlimited" },
      { key: "users", free: "1", basic: "4", pro: "10" },
    ],
  },
  {
    key: "pos",
    rows: [
      { key: "checkout", free: true, basic: true, pro: true },
      { key: "barcode", free: true, basic: true, pro: true },
      { key: "payments", free: true, basic: true, pro: true },
      { key: "discount", free: true, basic: true, pro: true },
      { key: "receipt", free: true, basic: true, pro: true },
    ],
  },
  {
    key: "credit",
    rows: [
      { key: "creditSale", free: "credit20", basic: "full", pro: "full" },
      { key: "ledger", free: true, basic: true, pro: true },
    ],
  },
  {
    key: "inventory",
    rows: [
      { key: "stock", free: "basic", basic: "full", pro: "full" },
      { key: "bulk", free: false, basic: false, pro: true },
      { key: "productImages", free: false, basic: false, pro: true },
    ],
  },
  {
    key: "procurement",
    rows: [{ key: "suppliers", free: false, basic: true, pro: true }],
  },
  {
    key: "reports",
    rows: [
      { key: "dashboard", free: true, basic: true, pro: true },
      { key: "performance", free: "limited", basic: true, pro: "extended" },
      { key: "staffSales", free: false, basic: true, pro: true },
    ],
  },
  {
    key: "team",
    rows: [{ key: "roles", free: false, basic: "basic", pro: "full" }],
  },
  {
    key: "support",
    rows: [{ key: "support", free: false, basic: "standard", pro: "priority" }],
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
                {t("landing.pricing.free.name")}
              </th>
              <th className="bg-brand-50/60 px-5 py-4 text-center text-sm font-semibold text-brand-700 dark:bg-brand-500/[0.06] dark:text-brand-300">
                <div className="flex flex-col items-center gap-1.5">
                  <span>{t("landing.pricing.basic.name")}</span>
                  <span className="rounded-full bg-brand-500 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    {t("landing.pricing.popular")}
                  </span>
                </div>
              </th>
              <th className="px-5 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                {t("landing.pricing.pro.name")}
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
                    <td className="px-5 py-3 text-center">{renderCell(row.free)}</td>
                    <td className="bg-brand-50/40 px-5 py-3 text-center dark:bg-brand-500/[0.04]">
                      {renderCell(row.basic)}
                    </td>
                    <td className="px-5 py-3 text-center">{renderCell(row.pro)}</td>
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
