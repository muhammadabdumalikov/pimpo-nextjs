'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SubscriptionTier } from '@/types/subscription';

type SubscriptionContextType = {
  currentTier: SubscriptionTier;
  setCurrentTier: (tier: SubscriptionTier) => void;
  hasAccess: (allowedTiers: SubscriptionTier[]) => boolean;
  getLimit: (limitType: 'debts' | 'products') => number | null;
  isLimitReached: (limitType: 'debts' | 'products', currentCount: number) => boolean;
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentTier, setCurrentTierState] = useState<SubscriptionTier>('free');

  useEffect(() => {
    // Load subscription tier from localStorage or API
    const savedTier = localStorage.getItem('subscriptionTier') as SubscriptionTier | null;
    if (savedTier && ['free', 'basic', 'pro', 'enterprise'].includes(savedTier)) {
      setCurrentTierState(savedTier);
    }
  }, []);

  const setCurrentTier = (tier: SubscriptionTier) => {
    setCurrentTierState(tier);
    localStorage.setItem('subscriptionTier', tier);
  };

  const hasAccess = (allowedTiers: SubscriptionTier[]): boolean => {
    return allowedTiers.includes(currentTier);
  };

  // Get limit for a specific type based on subscription tier
  const getLimit = (limitType: 'debts' | 'products'): number | null => {
    if (currentTier === 'free') {
      return 20; // Free plan has 20 limit for both debts and products
    }
    return null; // No limit for other tiers
  };

  // Check if limit is reached
  const isLimitReached = (limitType: 'debts' | 'products', currentCount: number): boolean => {
    const limit = getLimit(limitType);
    if (limit === null) return false;
    return currentCount >= limit;
  };

  return (
    <SubscriptionContext.Provider value={{ currentTier, setCurrentTier, hasAccess, getLimit, isLimitReached }}>
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
