"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "@/hooks/useTranslations";
import { SubscriptionTier } from "@/types/subscription";

type Plan = {
  tier: SubscriptionTier;
  name: string;
  description: string;
  monthlyPrice: number;
  features: string[];
};

export default function SubscriptionManagement() {
  const { t } = useTranslations();
  const [monthly, setMonthly] = useState(true);
  const plans = useMemo<Plan[]>(
    () => [
      {
        tier: "free",
        name: t("upgradePlan.free"),
        description: t("upgradePlan.freeDescription"),
        monthlyPrice: 0,
        features: [
          t("upgradePlan.features.free.userDebtList"),
          t("upgradePlan.features.free.ecommerceDashboard"),
          t("upgradePlan.features.free.productsList"),
          t("upgradePlan.features.free.debtsLimit"),
          t("upgradePlan.features.free.productsLimit"),
        ],
      },
      {
        tier: "basic",
        name: t("upgradePlan.basic"),
        description: t("upgradePlan.basicDescription"),
        monthlyPrice: 29,
        features: [
          t("upgradePlan.features.basic.everythingInFree"),
          t("upgradePlan.features.basic.addProducts"),
          t("upgradePlan.features.basic.formElements"),
          t("upgradePlan.features.basic.imagesVideos"),
          t("upgradePlan.features.basic.emailSupport"),
        ],
      },
      {
        tier: "pro",
        name: t("upgradePlan.pro"),
        description: t("upgradePlan.proDescription"),
        monthlyPrice: 99,
        features: [
          t("upgradePlan.features.pro.everythingInBasic"),
          t("upgradePlan.features.pro.ecommerceDashboard"),
          t("upgradePlan.features.pro.productsList"),
          t("upgradePlan.features.pro.addProduct"),
          t("upgradePlan.features.pro.userDebtManagement"),
          t("upgradePlan.features.pro.chartsAnalytics"),
          t("upgradePlan.features.pro.subscriptionManagement"),
          t("upgradePlan.features.pro.prioritySupport"),
        ],
      },
    ],
    [t],
  );

  return (
    <div className="border-t border-gray-100 p-4 sm:p-6 dark:border-gray-800">
      <div className="mx-auto w-full max-w-[385px]">
        <h2 className="mb-7 text-center text-title-sm font-bold text-gray-800 dark:text-white/90">
          {t("upgradePlan.headline")}
        </h2>
      </div>

      <div>
        <div className="mb-10 text-center">
          <div className="relative z-1 mx-auto inline-flex rounded-full bg-gray-200 p-1 dark:bg-gray-800">
            <span
              className={`absolute top-1/2 -z-1 flex h-11 w-[120px] -translate-y-1/2 rounded-full bg-white shadow-theme-xs duration-200 ease-linear dark:bg-white/10 ${
                monthly ? "translate-x-0" : "translate-x-full"
              }`}
            ></span>
            <button
              type="button"
              className={`flex h-11 w-[120px] items-center justify-center text-base font-medium ${
                monthly
                  ? "text-gray-800 dark:text-white/90"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white/70"
              }`}
              onClick={() => setMonthly(true)}
            >
              {t("upgradePlan.monthly")}
            </button>
            <button
              type="button"
              className={`flex h-11 w-[120px] items-center justify-center text-base font-medium ${
                monthly
                  ? "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white/80"
                  : "text-gray-800 dark:text-white/90"
              }`}
              onClick={() => setMonthly(false)}
            >
              {t("upgradePlan.annually")}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 xl:gap-6">
          {plans.map((plan) => {
            const isHighlighted = plan.tier === "basic";
            const price = monthly ? plan.monthlyPrice : plan.monthlyPrice * 12;
            const periodLabel = monthly ? t("upgradePlan.month") : t("upgradePlan.year");

            return (
              <div
                key={plan.tier}
                className={`flex h-full flex-col rounded-2xl border p-6 ${
                  isHighlighted
                    ? "border-gray-800 bg-gray-800 dark:border-white/10 dark:bg-white/10"
                    : "border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
                }`}
              >
                <span
                  className={`mb-3 block text-theme-xl font-semibold ${
                    isHighlighted
                      ? "text-white"
                      : "text-gray-800 dark:text-white/90"
                  }`}
                >
                  {plan.name}
                </span>

                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-end">
                    <h2
                      className={`text-title-md font-bold ${
                        isHighlighted
                          ? "text-white"
                          : "text-gray-800 dark:text-white/90"
                      }`}
                    >
                      ${price.toFixed(2)}
                    </h2>

                    <span
                      className={`mb-1 inline-block text-sm ${
                        isHighlighted
                          ? "text-white/70"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {periodLabel}
                    </span>
                  </div>
                </div>

                <p
                  className={`text-sm ${
                    isHighlighted
                      ? "text-white/70"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {plan.description}
                </p>

                <div
                  className={`my-6 h-px w-full ${
                    isHighlighted ? "bg-white/20" : "bg-gray-200 dark:bg-gray-800"
                  }`}
                ></div>

                <div className="mb-8 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <p
                      key={feature}
                      className={`flex items-center gap-3 text-sm ${
                        isHighlighted
                          ? "text-white/80"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M13.4017 4.35986L6.12166 11.6399L2.59833 8.11657"
                          stroke="#12B76A"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        ></path>
                      </svg>
                      {feature}
                    </p>
                  ))}
                </div>

                <button
                  type="button"
                  className={`mt-auto flex w-full items-center justify-center rounded-lg p-3.5 text-sm font-medium shadow-theme-xs transition-colors ${
                    isHighlighted
                      ? "bg-brand-500 text-white hover:bg-brand-600"
                      : "bg-gray-800 text-white hover:bg-brand-500 dark:bg-white/10"
                  }`}
                >
                  {t("upgradePlan.choosePlan")} {plan.name}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
