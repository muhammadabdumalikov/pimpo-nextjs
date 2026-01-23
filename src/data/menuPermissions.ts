import { MenuPermission, SubscriptionTier } from '@/types/subscription';

// Default menu permissions - can be managed from admin page
export const defaultMenuPermissions: MenuPermission[] = [
  // Dashboard menus
  { menuItem: 'dashboard.ecommerce', allowedTiers: ['free', 'basic', 'pro', ] },
  
  // E-commerce menus
  { menuItem: 'ecommerce.products', allowedTiers: ['free', 'basic', 'pro', ] },
  { menuItem: 'ecommerce.addProduct', allowedTiers: ['pro', ] },
  
  // User Debt
  { menuItem: 'userDebt', allowedTiers: ['free', 'pro', ] },
  
  // Calendar
  { menuItem: 'calendar', allowedTiers: ['basic', 'pro', ] },
  
  // User Profile
  { menuItem: 'userProfile', allowedTiers: ['basic', 'pro', ] },
  
  // Forms
  { menuItem: 'forms.formElements', allowedTiers: ['basic', 'pro', ] },
  
  // Tables
  { menuItem: 'tables.basicTables', allowedTiers: ['basic', 'pro', ] },
  
  // Pages
  { menuItem: 'pages.blankPage', allowedTiers: ['basic', 'pro'] },
  { menuItem: 'pages.error404', allowedTiers: ['basic', 'pro', ] },
  
  // Charts
  { menuItem: 'charts.lineChart', allowedTiers: ['pro', ] },
  { menuItem: 'charts.barChart', allowedTiers: ['pro', ] },
  
  // UI Elements
  { menuItem: 'uiElements.alerts', allowedTiers: ['basic', 'pro', ] },
  { menuItem: 'uiElements.avatar', allowedTiers: ['basic', 'pro', ] },
  { menuItem: 'uiElements.badge', allowedTiers: ['basic', 'pro', ] },
  { menuItem: 'uiElements.buttons', allowedTiers: ['basic', 'pro', ] },
  { menuItem: 'uiElements.images', allowedTiers: ['basic', 'pro', ] },
  { menuItem: 'uiElements.videos', allowedTiers: ['basic', 'pro', ] },
  
  // Authentication
  { menuItem: 'authentication.signIn', allowedTiers: ['free', 'basic', 'pro', ] },
  { menuItem: 'authentication.signUp', allowedTiers: ['free', 'basic', 'pro', ] },
  
  // Subscription Management (typically admin only, but configurable)
  // Made accessible to all tiers for easier management
  { menuItem: 'subscriptionManagement', allowedTiers: ['free', 'basic', 'pro', ] },
  
  // Upgrade Plan (accessible to all tiers)
  { menuItem: 'upgradePlan', allowedTiers: ['free', 'basic', 'pro', ] },
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
