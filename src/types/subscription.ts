// Purchasable plans on the landing are basic | pro | proplus. `free` is the
// internal floor a business falls to when its 1-month trial expires and it has
// no active paid plan — it is never sold, only used for gating the UI down.
export type SubscriptionTier = 'free' | 'basic' | 'pro' | 'proplus';

// Tier ordering shared with the backend (see pimpo-backend/src/subscription/tier.ts).
export const TIER_RANK: Record<SubscriptionTier, number> = {
  free: 0,
  basic: 1,
  pro: 2,
  proplus: 3,
};

// Tiers at or above `min` — handy for building allowedTiers lists.
export const tiersFrom = (min: SubscriptionTier): SubscriptionTier[] =>
  (Object.keys(TIER_RANK) as SubscriptionTier[]).filter(
    (t) => TIER_RANK[t] >= TIER_RANK[min],
  );

export interface MenuPermission {
  menuItem: string; // Menu item identifier (e.g., "dashboard", "products", "userDebt")
  allowedTiers: SubscriptionTier[]; // Which subscription tiers can access this menu
}

export interface Subscription {
  id: string;
  name: string;
  tier: SubscriptionTier;
  description: string;
  price: number;
  features: string[];
}
