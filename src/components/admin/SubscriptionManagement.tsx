"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "@/hooks/useTranslations";
import { CheckLineIcon } from "@/icons/index";
import Button from "../ui/button/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";

type Plan = {
  tier: string;
  name: string;
  monthlyPrice: number;
  popular?: boolean;
};

// A row value: string => plain text, true => check icon, false => not included
type CellValue = string | boolean;
type CompareRow = {
  label: string;
  basic: CellValue;
  pro: CellValue;
  proplus: CellValue;
};

export default function SubscriptionManagement() {
  const { t } = useTranslations();
  const [monthly, setMonthly] = useState(true);

  const plans = useMemo<Plan[]>(
    () => [
      { tier: "basic", name: t("upgradePlan.basic"), monthlyPrice: 119000 },
      {
        tier: "pro",
        name: t("upgradePlan.pro"),
        monthlyPrice: 299000,
        popular: true,
      },
      {
        tier: "proplus",
        name: t("upgradePlan.proplus"),
        monthlyPrice: 499000,
      },
    ],
    [t],
  );

  const rows = useMemo<CompareRow[]>(
    () => [
      {
        label: t("upgradePlan.compare.branches"),
        basic: "1 + 3",
        pro: "1 + 5",
        proplus: t("upgradePlan.compare.unlimited"),
      },
      {
        label: t("upgradePlan.compare.branchDiscount"),
        basic: "+150 000",
        pro: "+150 000",
        proplus: "+150 000",
      },
      {
        label: t("upgradePlan.compare.products"),
        basic: t("upgradePlan.compare.unlimited"),
        pro: t("upgradePlan.compare.unlimited"),
        proplus: t("upgradePlan.compare.unlimited"),
      },
      {
        label: t("upgradePlan.compare.users"),
        basic: "4",
        pro: "10",
        proplus: t("upgradePlan.compare.unlimited"),
      },
      {
        label: t("upgradePlan.compare.debt"),
        basic: true,
        pro: true,
        proplus: true,
      },
      {
        label: t("upgradePlan.compare.inventory"),
        basic: true,
        pro: true,
        proplus: true,
      },
      {
        label: t("upgradePlan.compare.procurement"),
        basic: true,
        pro: true,
        proplus: true,
      },
      {
        label: t("upgradePlan.compare.reports"),
        basic: true,
        pro: t("upgradePlan.compare.extended"),
        proplus: t("upgradePlan.compare.extended"),
      },
      {
        label: t("upgradePlan.compare.bulkImport"),
        basic: false,
        pro: true,
        proplus: true,
      },
      {
        label: t("upgradePlan.compare.productImages"),
        basic: false,
        pro: true,
        proplus: true,
      },
      {
        label: t("upgradePlan.compare.team"),
        basic: t("upgradePlan.compare.basicValue"),
        pro: true,
        proplus: true,
      },
      {
        label: t("upgradePlan.compare.support"),
        basic: t("upgradePlan.compare.standard"),
        pro: t("upgradePlan.compare.priority"),
        proplus: t("upgradePlan.compare.priority"),
      },
    ],
    [t],
  );

  const priceFor = (plan: Plan) =>
    monthly ? plan.monthlyPrice : Math.round(plan.monthlyPrice * 12 * 0.8);
  const periodLabel = monthly ? t("upgradePlan.month") : t("upgradePlan.year");

  // Tint applied to the highlighted (popular) column cells.
  const colTint = (plan: Plan) =>
    plan.popular ? "bg-brand-500/[0.04] dark:bg-brand-500/[0.08]" : "";

  const renderValue = (value: CellValue) => {
    if (value === true)
      return (
        <CheckLineIcon className="mx-auto h-5 w-5 text-success-500" />
      );
    if (value === false)
      return <span className="text-gray-300 dark:text-gray-600">—</span>;
    return (
      <span className="text-sm text-gray-700 dark:text-gray-300">{value}</span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header + billing toggle */}
      <div className="rounded-2xl border border-gray-200 bg-white px-4 pb-5 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold text-gray-800 dark:text-white/90">
            {t("upgradePlan.headline")}
          </h2>
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            {t("upgradePlan.description")}
          </p>

          <div className="mt-6 inline-flex rounded-full bg-gray-100 p-1 dark:bg-gray-800">
            <button
              type="button"
              onClick={() => setMonthly(true)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                monthly
                  ? "bg-brand-500 text-white shadow-theme-xs"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white/70"
              }`}
            >
              {t("upgradePlan.monthly")}
            </button>
            <button
              type="button"
              onClick={() => setMonthly(false)}
              className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                !monthly
                  ? "bg-brand-500 text-white shadow-theme-xs"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white/70"
              }`}
            >
              {t("upgradePlan.annually")}
              <span
                className={`rounded-full px-2 py-0.5 text-theme-xs font-medium ${
                  !monthly
                    ? "bg-white/20 text-white"
                    : "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500"
                }`}
              >
                -20%
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Comparison table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow className="border-b border-gray-200 dark:border-gray-800">
                <TableCell
                  isHeader
                  className="px-5 py-4 text-left align-bottom text-sm font-medium text-gray-500 dark:text-gray-400"
                >
                  {t("upgradePlan.compare.feature")}
                </TableCell>
                {plans.map((plan) => {
                  const price = priceFor(plan);
                  return (
                    <TableCell
                      key={plan.tier}
                      isHeader
                      className={`px-5 py-4 text-center ${colTint(plan)}`}
                    >
                      {plan.popular && (
                        <span className="mb-2 inline-block rounded-full bg-brand-500 px-3 py-0.5 text-theme-xs font-medium text-white">
                          {t("upgradePlan.mostPopular")}
                        </span>
                      )}
                      <div className="text-base font-semibold text-gray-800 dark:text-white/90">
                        {plan.name}
                      </div>
                      <div className="mt-1 flex items-baseline justify-center gap-1">
                        <span className="text-xl font-bold text-gray-800 dark:text-white/90">
                          {price === 0
                            ? t("upgradePlan.free")
                            : price.toLocaleString("ru-RU")}
                        </span>
                        {price > 0 && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {t("upgradePlan.som")}
                            {periodLabel}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.map((row, index) => (
                <TableRow
                  key={index}
                  className="border-b border-gray-100 dark:border-gray-800"
                >
                  <TableCell className="px-5 py-3.5 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    {row.label}
                  </TableCell>
                  <TableCell className="px-5 py-3.5 text-center">
                    {renderValue(row.basic)}
                  </TableCell>
                  <TableCell
                    className={`px-5 py-3.5 text-center ${colTint(plans[1])}`}
                  >
                    {renderValue(row.pro)}
                  </TableCell>
                  <TableCell className="px-5 py-3.5 text-center">
                    {renderValue(row.proplus)}
                  </TableCell>
                </TableRow>
              ))}

              {/* CTA row */}
              <TableRow>
                <TableCell className="px-5 py-4">{null}</TableCell>
                {plans.map((plan) => (
                  <TableCell
                    key={plan.tier}
                    className={`px-5 py-4 text-center ${colTint(plan)}`}
                  >
                    <Button
                      variant={plan.popular ? "primary" : "outline"}
                      size="sm"
                      className="w-full"
                    >
                      {t("upgradePlan.choosePlan")}
                    </Button>
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
