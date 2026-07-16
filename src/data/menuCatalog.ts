// Single source of truth for sidebar menu identifiers.
//
// The `key` strings match the menu ids used in AppSidebar's getMenuIdFromPath()
// and the subscription tier permissions in menuPermissions.ts. Roles store a
// subset of these keys (role.menuKeys) to control which menus a staff member
// sees. `labelKey` points at an existing `sidebar.*` i18n key.

export interface MenuCatalogItem {
  key: string;
  labelKey: string; // i18n key, e.g. "sidebar.products"
  group: MenuGroup;
  /** Owner-only menus (team management) are never granted to staff roles. */
  ownerOnly?: boolean;
}

export type MenuGroup =
  | "dashboard"
  | "catalog"
  | "sales"
  | "customers"
  | "team"
  | "settings"
  | "other";

export const menuCatalog: MenuCatalogItem[] = [
  // Dashboard
  { key: "dashboard.ecommerce", labelKey: "sidebar.dashboard", group: "dashboard" },

  // Catalog
  { key: "ecommerce.categories", labelKey: "sidebar.categories", group: "catalog" },
  { key: "ecommerce.products", labelKey: "sidebar.products", group: "catalog" },
  { key: "ecommerce.addProduct", labelKey: "sidebar.addProduct", group: "catalog" },
  { key: "inventory", labelKey: "sidebar.inventory", group: "catalog" },
  { key: "suppliers", labelKey: "sidebar.suppliers", group: "catalog" },
  { key: "receipts", labelKey: "sidebar.goodsReceipts", group: "catalog" },

  // Sales
  { key: "checkout", labelKey: "sidebar.checkout", group: "sales" },
  { key: "kassa", labelKey: "sidebar.kassa", group: "sales" },
  { key: "productPerformance", labelKey: "sidebar.productPerformance", group: "sales" },

  // Customers
  { key: "userDebt", labelKey: "sidebar.userDebt", group: "customers" },

  // Team (owner-only management surfaces)
  { key: "team.roles", labelKey: "sidebar.roles", group: "team", ownerOnly: true },
  { key: "team.staff", labelKey: "sidebar.staff", group: "team", ownerOnly: true },

  // Settings
  { key: "subscriptionManagement", labelKey: "sidebar.subscriptionManagement", group: "settings" },
  { key: "settings.receipts", labelKey: "sidebar.receipts", group: "settings" },
];

/** Menu keys staff roles are allowed to be granted (excludes owner-only). */
export const assignableMenuItems = menuCatalog.filter((m) => !m.ownerOnly);

export const menuGroupLabelKeys: Record<MenuGroup, string> = {
  dashboard: "roles.groups.dashboard",
  catalog: "roles.groups.catalog",
  sales: "roles.groups.sales",
  customers: "roles.groups.customers",
  team: "roles.groups.team",
  settings: "roles.groups.settings",
  other: "roles.groups.other",
};
