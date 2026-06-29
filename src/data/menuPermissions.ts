import { MenuPermission, SubscriptionTier } from '@/types/subscription';

// Default menu permissions - can be managed from admin page
export const defaultMenuPermissions: MenuPermission[] = [
  // Dashboard menus
  { menuItem: 'dashboard.ecommerce', allowedTiers: ['free', 'basic', 'pro', ] },
  
  // E-commerce menus
  { menuItem: 'ecommerce.categories', allowedTiers: ['free', 'basic', 'pro', ] },
  { menuItem: 'ecommerce.products', allowedTiers: ['free', 'basic', 'pro', ] },
  { menuItem: 'ecommerce.addProduct', allowedTiers: ['pro', ] },
  { menuItem: 'checkout', allowedTiers: ['free', 'basic', 'pro',] },
  
  // User Debt
  { menuItem: 'userDebt', allowedTiers: ['free', 'pro', ] },

  // Inventory & analytics
  { menuItem: 'inventory', allowedTiers: ['free', 'basic', 'pro'] },
  { menuItem: 'productPerformance', allowedTiers: ['free', 'basic', 'pro'] },

  // Procurement (suppliers + goods receipts)
  { menuItem: 'suppliers', allowedTiers: ['free', 'basic', 'pro'] },
  { menuItem: 'receipts', allowedTiers: ['free', 'basic', 'pro'] },

  // Team management (role/staff access is further gated to the owner via role permissions)
  { menuItem: 'team.roles', allowedTiers: ['free', 'basic', 'pro'] },
  { menuItem: 'team.staff', allowedTiers: ['free', 'basic', 'pro'] },

  // Subscription Management (typically admin only, but configurable)
  // Made accessible to all tiers for easier management
  { menuItem: 'subscriptionManagement', allowedTiers: ['free', 'basic', 'pro', ] },
  
  // Upgrade Plan (accessible to all tiers)
  { menuItem: 'upgradePlan', allowedTiers: ['free', 'basic', 'pro', ] },

  // Settings
  { menuItem: 'settings', allowedTiers: ['free', 'basic', 'pro',] },
  { menuItem: 'settings.receipts', allowedTiers: ['free', 'basic', 'pro',] },
];

// Helper function to get menu permissions
export const getMenuPermissions = (): MenuPermission[] => {
  // In production, this would fetch from API or database
  if (typeof window === 'undefined') {
    // Server-side: return default permissions
    return defaultMenuPermissions;
  }
  
  const saved = localStorage.getItem('menuPermissions');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return defaultMenuPermissions;
    }
  }
  return defaultMenuPermissions;
};

// Helper function to save menu permissions
export const saveMenuPermissions = (permissions: MenuPermission[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('menuPermissions', JSON.stringify(permissions));
  }
};

// Helper function to check if a menu item is allowed for a tier
export const isMenuAllowed = (menuItem: string, tier: SubscriptionTier, permissions: MenuPermission[]): boolean => {
  const permission = permissions.find(p => p.menuItem === menuItem);
  if (!permission) return false; // If not found, deny access
  return permission.allowedTiers.includes(tier);
};
