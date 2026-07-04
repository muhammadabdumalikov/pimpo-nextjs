"use client";

import React, { useState, useEffect } from "react";
import { SubscriptionTier } from "@/types/subscription";
import { useSubscription } from "@/context/SubscriptionContext";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import { CheckLineIcon } from "@/icons/index";
import Button from "../ui/button/Button";
import { getSubscriptionPlans, type SubscriptionPlan } from "@/lib/api";

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
  const { currentTier, setCurrentTier, isLoading: subscriptionLoading } = useSubscription();
  const { showToast } = useToast();
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingTier, setUpdatingTier] = useState<SubscriptionTier | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setIsLoading(true);
      const backendPlans = await getSubscriptionPlans();
      
      // Sort plans by tier order for consistent display
      const tierOrder = ['free', 'basic', 'pro'];
      const sortedPlans = [...backendPlans].sort((a, b) => {
        const aIndex = tierOrder.indexOf(a.tier);
        const bIndex = tierOrder.indexOf(b.tier);
        return aIndex - bIndex;
      });
      
      // Map backend plans to frontend format
      const mappedPlans: PlanData[] = sortedPlans.map((plan: SubscriptionPlan) => {
        const tier = plan.tier as SubscriptionTier;
        const price = parseFloat(plan.price || '0');
        
        // Get features based on tier
        const features = getFeaturesForTier(tier, t);
        
        return {
          tier,
          name: plan.name,
          price,
          description: plan.description || '',
          features,
          popular: tier === 'basic',
          soon: tier === 'pro',
        };
      });
      
      setPlans(mappedPlans);
    } catch (error) {
      console.error('Failed to load plans:', error);
      // Fallback to default plans if API fails
      setPlans(getDefaultPlans(t));
    } finally {
      setIsLoading(false);
    }
  };

  const getFeaturesForTier = (tier: SubscriptionTier, t: any): string[] => {
    switch (tier) {
      case 'free':
        return [
          t('upgradePlan.features.free.userDebtList'),
          t('upgradePlan.features.free.ecommerceDashboard'),
          t('upgradePlan.features.free.productsList'),
          t('upgradePlan.features.free.debtsLimit'),
          t('upgradePlan.features.free.productsLimit'),
        ];
      case 'basic':
        return [
          t('upgradePlan.features.basic.everythingInFree'),
          t('upgradePlan.features.basic.addProducts'),
          t('upgradePlan.features.basic.formElements'),
          t('upgradePlan.features.basic.imagesVideos'),
          t('upgradePlan.features.basic.emailSupport'),
        ];
      case 'pro':
        return [
          t('upgradePlan.features.pro.everythingInBasic'),
          t('upgradePlan.features.pro.ecommerceDashboard'),
          t('upgradePlan.features.pro.productsList'),
          t('upgradePlan.features.pro.addProduct'),
          t('upgradePlan.features.pro.userDebtManagement'),
          t('upgradePlan.features.pro.chartsAnalytics'),
          t('upgradePlan.features.pro.subscriptionManagement'),
          t('upgradePlan.features.pro.prioritySupport'),
        ];
      default:
        return [];
    }
  };

  const getDefaultPlans = (t: any): PlanData[] => [
    {
      tier: 'free' as SubscriptionTier,
      name: t('upgradePlan.free'),
      price: 0,
      description: t('upgradePlan.freeDescription'),
      features: getFeaturesForTier('free', t),
      popular: false,
    },
    {
      tier: 'basic' as SubscriptionTier,
      name: t('upgradePlan.basic'),
      price: 99000,
      description: t('upgradePlan.basicDescription'),
      features: getFeaturesForTier('basic', t),
      popular: true,
    },
    {
      tier: 'pro' as SubscriptionTier,
      name: t('upgradePlan.pro'),
      price: 249000,
      description: t('upgradePlan.proDescription'),
      features: getFeaturesForTier('pro', t),
      popular: false,
      soon: true,
    },
  ];

  const handleUpgrade = async (tier: SubscriptionTier) => {
    try {
      setUpdatingTier(tier);
      await setCurrentTier(tier);
      showToast('success', `Successfully ${tier === currentTier ? 'updated' : tierOrder.indexOf(tier) > tierOrder.indexOf(currentTier) ? 'upgraded to' : 'downgraded to'} ${tier} plan!`, 'Subscription Updated');
    } catch (error: any) {
      console.error('Failed to update subscription:', error);
      showToast('error', error.message || 'Failed to update subscription', 'Error');
    } finally {
      setUpdatingTier(null);
    }
  };

  const tierOrder = ['free', 'basic', 'pro'];
  const isCurrentPlan = (tier: SubscriptionTier) => currentTier === tier;
  const isUpgrade = (tier: SubscriptionTier) => {
    return tierOrder.indexOf(tier) > tierOrder.indexOf(currentTier);
  };

  if (isLoading || subscriptionLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500 dark:text-gray-400">{t('upgradePlan.loadingPlans')}</div>
      </div>
    );
  }

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
        {plans.map((plan) => {
          const current = isCurrentPlan(plan.tier);
          const upgrade = isUpgrade(plan.tier);
          const isSoon = plan.soon || false;
          const isEnabled = plan.tier === 'free' || plan.tier === 'basic';
          const isUpdating = updatingTier === plan.tier;
          
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
                    {plan.price === 0 ? t('upgradePlan.free') : plan.price.toLocaleString('ru-RU')}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t('upgradePlan.som')}{t('upgradePlan.month')}</span>
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
                disabled={current || !isEnabled || isUpdating}
              >
                {isUpdating ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                    <span>{t('upgradePlan.updating')}</span>
                  </div>
                ) : current ? (
                  t('upgradePlan.currentPlan')
                ) : !isEnabled ? (
                  t('upgradePlan.comingSoon')
                ) : upgrade ? (
                  t('upgradePlan.upgrade')
                ) : (
                  t('upgradePlan.downgrade')
                )}
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
