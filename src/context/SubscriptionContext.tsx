'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SubscriptionTier } from '@/types/subscription';
import {
  getCurrentSubscription,
  getSubscriptionLimits,
  subscribeToPlan,
  changeSubscription,
  cancelSubscription as cancelSubscriptionAPI,
  type SubscriptionLimits,
} from '@/lib/api';
import { useAuth } from './AuthContext';

type SubscriptionContextType = {
  currentTier: SubscriptionTier;
  setCurrentTier: (tier: SubscriptionTier) => Promise<void>;
  hasAccess: (allowedTiers: SubscriptionTier[]) => boolean;
  getLimit: (limitType: 'debts' | 'products') => number | null;
  isLimitReached: (limitType: 'debts' | 'products', currentCount: number) => boolean;
  isLoading: boolean;
  limits: SubscriptionLimits | null;
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentTier, setCurrentTierState] = useState<SubscriptionTier>('free');
  const [isLoading, setIsLoading] = useState(true);
  const [limits, setLimits] = useState<SubscriptionLimits | null>(null);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      loadSubscription();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const loadSubscription = async () => {
    try {
      setIsLoading(true);
      const subscription = await getCurrentSubscription();
      const subscriptionLimits = await getSubscriptionLimits();
      
      setCurrentTierState(subscription.tier as SubscriptionTier);
      setLimits(subscriptionLimits);
    } catch (error) {
      console.error('Failed to load subscription:', error);
      // Default to free tier on error
      setCurrentTierState('free');
      setLimits({ debtsLimit: 20, productsLimit: 100 });
    } finally {
      setIsLoading(false);
    }
  };

  const setCurrentTier = async (tier: SubscriptionTier) => {
    try {
      // Check if business already has a subscription
      const currentSub = await getCurrentSubscription();
      
      if (currentSub && currentSub.isActive) {
        // Business has active subscription, use change endpoint
        await changeSubscription(tier);
      } else {
        // Business doesn't have subscription, use subscribe endpoint
        await subscribeToPlan(tier);
      }
      
      setCurrentTierState(tier);
      // Reload limits after subscription update
      const subscriptionLimits = await getSubscriptionLimits();
      setLimits(subscriptionLimits);
    } catch (error) {
      console.error('Failed to update subscription:', error);
      throw error;
    }
  };

  const hasAccess = (allowedTiers: SubscriptionTier[]): boolean => {
    // proplus is a superset of pro: menu lists that predate the tier (they
    // enumerate up to 'pro') automatically grant it too.
    if (currentTier === 'proplus') {
      return allowedTiers.includes('proplus') || allowedTiers.includes('pro');
    }
    return allowedTiers.includes(currentTier);
  };

  // Get limit for a specific type based on subscription tier
  const getLimit = (limitType: 'debts' | 'products'): number | null => {
    if (limits) {
      return limitType === 'debts' ? limits.debtsLimit : limits.productsLimit;
    }
    // Fallback to free plan limits
    return 20;
  };

  // Check if limit is reached
  const isLimitReached = (limitType: 'debts' | 'products', currentCount: number): boolean => {
    const limit = getLimit(limitType);
    if (limit === null) return false;
    return currentCount >= limit;
  };

  return (
    <SubscriptionContext.Provider
      value={{
        currentTier,
        setCurrentTier,
        hasAccess,
        getLimit,
        isLimitReached,
        isLoading,
        limits,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
