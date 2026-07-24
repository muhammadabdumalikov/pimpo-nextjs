import { MenuPermission, SubscriptionTier, tiersFrom } from '@/types/subscription';

// Tier plan (mirrors the backend gating — see pimpo-backend/src/subscription):
//   • free   — internal floor (trial expired / no paid plan): core POS only,
//              everything else prompts an upgrade.
//   • basic  — Standart: full POS, credit, inventory, procurement, finance,
//              team, and the operational reports.
//   • pro    — Business: + extended analytics (P&L, ABC/assortment, dead-stock,
//              reorder, debt-aging, traffic, transfers history, targets, digest)
//              + bulk import + product images.
//   • proplus— Business+: + multi-branch analytics (branch comparison, transfer
//              suggestions) + unlimited scale.
const FREE = tiersFrom('free');   // everyone, incl. expired floor
const BASIC = tiersFrom('basic'); // basic, pro, proplus
const PRO = tiersFrom('pro');     // pro, proplus
const PROPLUS = tiersFrom('proplus'); // proplus only

// Default menu permissions - can be managed from admin page
export const defaultMenuPermissions: MenuPermission[] = [
  // Dashboard menus
  { menuItem: 'dashboard.ecommerce', allowedTiers: FREE },

  // E-commerce menus — core POS, kept on the free floor so an expired account
  // can still run the shop (each tier has its own product-count limit).
  { menuItem: 'ecommerce.categories', allowedTiers: FREE },
  { menuItem: 'ecommerce.products', allowedTiers: FREE },
  { menuItem: 'ecommerce.addProduct', allowedTiers: FREE },
  { menuItem: 'checkout', allowedTiers: FREE },

  // Kassa (cash shifts) — core POS.
  { menuItem: 'kassa', allowedTiers: FREE },

  // User Debt (nasiya) — core POS; the free floor caps at 20 debts (backend).
  { menuItem: 'userDebt', allowedTiers: FREE },

  // Finance (Moliya) — Standart (basic) and up.
  { menuItem: 'finance.categories', allowedTiers: BASIC },
  { menuItem: 'finance.transactions', allowedTiers: BASIC },
  { menuItem: 'finance.state', allowedTiers: BASIC },

  // Inventory & analytics — Standart and up.
  { menuItem: 'inventory', allowedTiers: BASIC },
  { menuItem: 'productPerformance', allowedTiers: BASIC },

  // Reports (Hisobotlar) — three levels:
  //   reports            operational reports — Standart (basic) and up
  //   reports.extended   extended analytics  — Business (pro) and up
  //   reports.multibranch multi-branch analytics — Business+ (proplus) only
  { menuItem: 'reports', allowedTiers: BASIC },
  { menuItem: 'reports.extended', allowedTiers: PRO },
  { menuItem: 'reports.multibranch', allowedTiers: PROPLUS },

  // Procurement (suppliers + goods receipts) — Standart and up.
  { menuItem: 'suppliers', allowedTiers: BASIC },
  { menuItem: 'receipts', allowedTiers: BASIC },

  // Team management (role/staff access is further gated to the owner via role
  // permissions) — Standart and up.
  { menuItem: 'team.roles', allowedTiers: BASIC },
  { menuItem: 'team.staff', allowedTiers: BASIC },
  { menuItem: 'team.sales', allowedTiers: BASIC },

  // Subscription + upgrade + settings — reachable on every tier so an expired
  // account can always resubscribe.
  { menuItem: 'subscriptionManagement', allowedTiers: FREE },
  { menuItem: 'upgradePlan', allowedTiers: FREE },
  { menuItem: 'settings', allowedTiers: FREE },
  { menuItem: 'settings.receipts', allowedTiers: FREE },
];

// Menu gating rules are a STATIC mirror of the backend tier gating
// (pimpo-backend: @MinTier + PlanTierGuard). The backend is the AUTHORITATIVE
// gate — it returns 403 PLAN_UPGRADE_REQUIRED regardless of what the UI shows.
// These rules only decide what the sidebar / route guard / search reveal, so they
// are intentionally hardcoded and NOT read from localStorage: a client can no
// longer self-unlock menus by editing stored permissions. The acting tier itself
// comes from the server (SubscriptionContext → GET /subscriptions/current), and
// falls back to the `free` floor on error.
export const getMenuPermissions = (): MenuPermission[] => defaultMenuPermissions;

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
  // Online storefront orders share the same right: whoever runs the till
  // handles incoming online orders too.
  '/online-orders': 'checkout',
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
  // Reports hub + operational reports (/reports/sales, /reports/stock, …)
  // inherit the basic 'reports' menu id via longest-prefix matching. The
  // analytics-heavier reports are mapped explicitly to a higher tier below.
  '/reports': 'reports',
  // Extended analytics — Business (pro) and up.
  '/reports/pnl': 'reports.extended',
  '/reports/abc': 'reports.extended',
  '/reports/assortment': 'reports.extended',
  '/reports/dead-stock': 'reports.extended',
  '/reports/reorder': 'reports.extended',
  '/reports/debt-aging': 'reports.extended',
  '/reports/traffic': 'reports.extended',
  '/reports/transfers': 'reports.extended',
  '/reports/target': 'reports.extended',
  '/reports/customers': 'reports.extended',
  // Multi-branch analytics — Business+ (proplus) only.
  '/reports/branch-comparison': 'reports.multibranch',
  '/reports/transfer-suggestions': 'reports.multibranch',
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
