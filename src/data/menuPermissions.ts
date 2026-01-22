import { MenuPermission, SubscriptionTier } from '@/types/subscription';

// Default menu permissions - can be managed from admin page
export const defaultMenuPermissions: MenuPermission[] = [
  // Dashboard menus
  { menuItem: 'dashboard.ecommerce', allowedTiers: ['basic', 'pro', 'enterprise'] },
  { menuItem: 'dashboard.ecommerceV2', allowedTiers: ['free', 'pro', 'enterprise'] },
  
  // E-commerce menus
  { menuItem: 'ecommerce.products', allowedTiers: ['basic', 'pro', 'enterprise'] },
  { menuItem: 'ecommerce.productsV2', allowedTiers: ['free', 'pro', 'enterprise'] },
  { menuItem: 'ecommerce.addProduct', allowedTiers: ['basic', 'pro', 'enterprise'] },
  { menuItem: 'ecommerce.addProductV2', allowedTiers: ['pro', 'enterprise'] },
  
  // User Debt
  { menuItem: 'userDebt', allowedTiers: ['free', 'pro', 'enterprise'] },
  
  // Calendar
  { menuItem: 'calendar', allowedTiers: ['basic', 'pro', 'enterprise'] },
  
  // User Profile
  { menuItem: 'userProfile', allowedTiers: ['basic', 'pro', 'enterprise'] },
  
  // Forms
  { menuItem: 'forms.formElements', allowedTiers: ['basic', 'pro', 'enterprise'] },
  
  // Tables
  { menuItem: 'tables.basicTables', allowedTiers: ['basic', 'pro', 'enterprise'] },
  
  // Pages
  { menuItem: 'pages.blankPage', allowedTiers: ['basic', 'pro', 'enterprise'] },
  { menuItem: 'pages.error404', allowedTiers: ['basic', 'pro', 'enterprise'] },
  
  // Charts
  { menuItem: 'charts.lineChart', allowedTiers: ['pro', 'enterprise'] },
  { menuItem: 'charts.barChart', allowedTiers: ['pro', 'enterprise'] },
  
  // UI Elements
  { menuItem: 'uiElements.alerts', allowedTiers: ['basic', 'pro', 'enterprise'] },
  { menuItem: 'uiElements.avatar', allowedTiers: ['basic', 'pro', 'enterprise'] },
  { menuItem: 'uiElements.badge', allowedTiers: ['basic', 'pro', 'enterprise'] },
  { menuItem: 'uiElements.buttons', allowedTiers: ['basic', 'pro', 'enterprise'] },
  { menuItem: 'uiElements.images', allowedTiers: ['basic', 'pro', 'enterprise'] },
  { menuItem: 'uiElements.videos', allowedTiers: ['basic', 'pro', 'enterprise'] },
  
  // Authentication
  { menuItem: 'authentication.signIn', allowedTiers: ['free', 'basic', 'pro', 'enterprise'] },
  { menuItem: 'authentication.signUp', allowedTiers: ['free', 'basic', 'pro', 'enterprise'] },
  
  // Subscription Management (typically admin only, but configurable)
  // Made accessible to all tiers for easier management
  { menuItem: 'subscriptionManagement', allowedTiers: ['free', 'basic', 'pro', 'enterprise'] },
  
  // Upgrade Plan (accessible to all tiers)
  { menuItem: 'upgradePlan', allowedTiers: ['free', 'basic', 'pro', 'enterprise'] },
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
