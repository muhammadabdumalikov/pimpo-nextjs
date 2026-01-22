"use client";

import React from "react";
import { SubscriptionTier } from "@/types/subscription";
import { useSubscription } from "@/context/SubscriptionContext";
import { useTranslations } from "@/hooks/useTranslations";
import { CheckLineIcon } from "@/icons/index";
import Button from "../ui/button/Button";
import Badge from "../ui/badge/Badge";

interface PlanData {
  tier: SubscriptionTier;
  name: string;
  price: number;
  description: string;
  features: string[];
  popular: boolean;
  soon?: boolean;
}

export default function UpgradePlan() {
  const { t } = useTranslations();
  const { currentTier, setCurrentTier } = useSubscription();

  const subscriptionPlans: PlanData[] = [
    {
      tier: 'free' as SubscriptionTier,
      name: t('upgradePlan.free'),
      price: 0,
      description: t('upgradePlan.freeDescription'),
      features: [
        t('upgradePlan.features.free.userDebtList'),
        t('upgradePlan.features.free.ecommerceV2'),
        t('upgradePlan.features.free.productsListV2'),
        t('upgradePlan.features.free.debtsLimit'),
        t('upgradePlan.features.free.productsLimit'),
      ],
      popular: false,
    },
    {
      tier: 'basic' as SubscriptionTier,
      name: t('upgradePlan.basic'),
      price: 29,
      description: t('upgradePlan.basicDescription'),
      features: [
        t('upgradePlan.features.basic.everythingInFree'),
        t('upgradePlan.features.basic.addProducts'),
        t('upgradePlan.features.basic.formElements'),
        t('upgradePlan.features.basic.imagesVideos'),
        t('upgradePlan.features.basic.emailSupport'),
      ],
      popular: true,
    },
    {
      tier: 'pro' as SubscriptionTier,
      name: t('upgradePlan.pro'),
      price: 99,
      description: t('upgradePlan.proDescription'),
      features: [
        t('upgradePlan.features.pro.everythingInBasic'),
        t('upgradePlan.features.pro.ecommerceV2Dashboard'),
        t('upgradePlan.features.pro.productsV2'),
        t('upgradePlan.features.pro.addProductV2'),
        t('upgradePlan.features.pro.userDebtManagement'),
        t('upgradePlan.features.pro.chartsAnalytics'),
        t('upgradePlan.features.pro.subscriptionManagement'),
        t('upgradePlan.features.pro.prioritySupport'),
      ],
      popular: false,
      soon: true,
    },
  ];

  const handleUpgrade = (tier: SubscriptionTier) => {
    // In production, this would integrate with payment gateway
    setCurrentTier(tier);
    alert(`Upgraded to ${tier} plan!`);
  };

  const isCurrentPlan = (tier: SubscriptionTier) => currentTier === tier;
  const isUpgrade = (tier: SubscriptionTier) => {
    const tierOrder = ['free', 'basic', 'pro', 'enterprise'];
    return tierOrder.indexOf(tier) > tierOrder.indexOf(currentTier);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white/90 mb-2">
            {t('upgradePlan.title')}
          </h2>
          <p className="text-gray-500 text-theme-sm dark:text-gray-400">
            {t('upgradePlan.description')}
          </p>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="flex flex-wrap justify-center gap-6">
        {subscriptionPlans.map((plan) => {
          const current = isCurrentPlan(plan.tier);
          const upgrade = isUpgrade(plan.tier);
          const isSoon = plan.soon || false;
          const isEnabled = plan.tier === 'free' || plan.tier === 'basic';
          
          return (
            <div
              key={plan.tier}
              className={`relative flex flex-col rounded-2xl border bg-white p-6 dark:bg-white/[0.03] w-full max-w-sm ${
                plan.popular
                  ? 'border-brand-500 shadow-lg dark:border-brand-500'
                  : 'border-gray-200 dark:border-gray-800'
              } ${isSoon ? 'opacity-75' : ''}`}
            >
              {plan.popular && !isSoon && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-brand-500 px-4 py-1 text-xs font-medium text-white">
                    {t('upgradePlan.mostPopular')}
                  </span>
                </div>
              )}
              {isSoon && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center justify-center rounded-full bg-warning-500 px-4 py-1 text-xs font-medium text-white border-0">
                    {t('upgradePlan.soon')}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90 mb-1">
                  {plan.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {plan.description}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-gray-800 dark:text-white/90">
                    ${plan.price}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t('upgradePlan.month')}</span>
                  )}
                </div>
              </div>

              <ul className="mb-6 flex-1 space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckLineIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={current ? "outline" : plan.popular && !isSoon ? "primary" : "outline"}
                size="md"
                className="w-full mt-auto"
                onClick={() => handleUpgrade(plan.tier)}
                disabled={current || !isEnabled}
              >
                {current ? t('upgradePlan.currentPlan') : !isEnabled ? t('upgradePlan.comingSoon') : upgrade ? t('upgradePlan.upgrade') : t('upgradePlan.downgrade')}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Info Section */}
      <div className="rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-2">
            {t('upgradePlan.needHelp')}
          </h3>
          <p className="text-gray-500 text-theme-sm dark:text-gray-400 mb-4">
            {t('upgradePlan.contactSalesDescription')}
          </p>
          <Button variant="outline" size="md">
            {t('upgradePlan.contactSales')}
          </Button>
        </div>
      </div>
    </div>
  );
}
