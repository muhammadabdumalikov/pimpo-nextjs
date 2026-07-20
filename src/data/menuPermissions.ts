import { MenuPermission, SubscriptionTier } from '@/types/subscription';

// Default menu permissions - can be managed from admin page
export const defaultMenuPermissions: MenuPermission[] = [
  // Dashboard menus
  { menuItem: 'dashboard.ecommerce', allowedTiers: ['free', 'basic', 'pro', ] },
  
  // E-commerce menus
  { menuItem: 'ecommerce.categories', allowedTiers: ['free', 'basic', 'pro', ] },
  { menuItem: 'ecommerce.products', allowedTiers: ['free', 'basic', 'pro', ] },
  // Adding products is available on every tier (each tier just has its own
  // product-count limit); bulk import is the pro-only capability.
  { menuItem: 'ecommerce.addProduct', allowedTiers: ['free', 'basic', 'pro', ] },
  { menuItem: 'checkout', allowedTiers: ['free', 'basic', 'pro',] },
  
  // Kassa (cash shifts) — available on every tier
  { menuItem: 'kassa', allowedTiers: ['free', 'basic', 'pro', ] },

  // Finance (Moliya) — available on every tier
  { menuItem: 'finance.categories', allowedTiers: ['free', 'basic', 'pro', ] },
  { menuItem: 'finance.transactions', allowedTiers: ['free', 'basic', 'pro', ] },
  { menuItem: 'finance.state', allowedTiers: ['free', 'basic', 'pro', ] },

  // User Debt
  { menuItem: 'userDebt', allowedTiers: ['free', 'basic', 'pro', ] },

  // Inventory & analytics
  { menuItem: 'inventory', allowedTiers: ['free', 'basic', 'pro'] },
  { menuItem: 'productPerformance', allowedTiers: ['free', 'basic', 'pro'] },

  // Reports (Hisobotlar) — available on every tier
  { menuItem: 'reports', allowedTiers: ['free', 'basic', 'pro'] },

  // Procurement (suppliers + goods receipts) — not on the free plan.
  { menuItem: 'suppliers', allowedTiers: ['basic', 'pro'] },
  { menuItem: 'receipts', allowedTiers: ['basic', 'pro'] },

  // Team management (role/staff access is further gated to the owner via role
  // permissions) — not on the free plan.
  { menuItem: 'team.roles', allowedTiers: ['basic', 'pro'] },
  { menuItem: 'team.staff', allowedTiers: ['basic', 'pro'] },
  { menuItem: 'team.sales', allowedTiers: ['basic', 'pro'] },

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

// Maps an admin route to its menu identifier. Single source of truth shared by
// the sidebar (which item to show) and the route guard (which page to allow).
const routeMenuMap: Record<string, string> = {
  '/dashboard': 'dashboard.ecommerce',
  '/categories': 'ecommerce.categories',
  '/products': 'ecommerce.products',
  '/product': 'ecommerce.productsList',
  '/add-product': 'ecommerce.addProduct',
  '/user-debt': 'userDebt',
  '/subscription-management': 'subscriptionManagement',
  '/settings/receipts': 'settings.receipts',
  '/settings': 'settings',
  '/cart': 'checkout',
  // All-sales history shares the checkout menu right: whoever can sell can
  // also see the sales list.
  '/sales': 'checkout',
  '/kassa': 'kassa',
  '/kassa/operations': 'kassa',
  '/finance/categories': 'finance.categories',
  '/finance/transactions': 'finance.transactions',
  '/finance/state': 'finance.state',
  '/inventory': 'inventory',
  '/suppliers': 'suppliers',
  '/receipts': 'receipts',
  // Stock-takes is merged into the Inventory (Ombor) page; the detail/count
  // screen at /stock-takes/:id inherits the 'inventory' permission.
  '/stock-takes': 'inventory',
  // Branch-to-branch transfers live under the same Inventory permission.
  '/stock-transfers': 'inventory',
  '/product-performance': 'productPerformance',
  // Reports hub + all nested report routes (/reports/pnl, /reports/stock, …)
  // inherit the 'reports' menu id via longest-prefix matching.
  '/reports': 'reports',
  '/roles': 'team.roles',
  '/staff': 'team.staff',
  '/staff-sales': 'team.sales',
};

// Resolve a pathname to a menu id. Exact match wins; otherwise the longest
// prefix (so nested routes like `/receipts/new` inherit `/receipts`). Returns
// null for unmapped routes (e.g. `/dashboard`, `/edit-product/:id`) which are
// treated as always-accessible within the admin area.
export const getMenuIdFromPath = (path: string): string | null => {
  if (routeMenuMap[path]) return routeMenuMap[path];
  let best: string | null = null;
  let bestLen = -1;
  for (const key of Object.keys(routeMenuMap)) {
    if ((path === key || path.startsWith(key + '/')) && key.length > bestLen) {
      best = routeMenuMap[key];
      bestLen = key.length;
    }
  }
  return best;
};

// A section is visible only when allowed by BOTH the subscription tier and the
// acting account's role. Unmapped routes (menuId === null) are always allowed.
export const isMenuVisible = (
  menuId: string | null,
  tier: SubscriptionTier,
  hasMenuAccess: (menuId: string) => boolean,
  permissions: MenuPermission[] = getMenuPermissions(),
): boolean => {
  if (!menuId) return true;
  return isMenuAllowed(menuId, tier, permissions) && hasMenuAccess(menuId);
};
