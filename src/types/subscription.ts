export type SubscriptionTier = 'free' | 'basic' | 'pro' | 'proplus';

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
