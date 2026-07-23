import type { IconType } from "react-icons";
import {
  LuLayoutDashboard,
  LuTags,
  LuPackage,
  LuPackagePlus,
  LuWarehouse,
  LuClipboardList,
  LuShoppingCart,
  LuReceipt,
  LuHandCoins,
  LuCalendarClock,
  LuArrowRightLeft,
  LuChartColumnBig,
  LuWallet,
  LuFolderTree,
  LuScale,
  LuTruck,
  LuPackageCheck,
  LuShieldCheck,
  LuUsers,
  LuUserCheck,
  LuStore,
  LuFileText,
  LuCreditCard,
  LuGlobe,
} from "react-icons/lu";
import { REPORTS } from "./reportsCatalog";

// Single flat catalog of every place the global header search can jump to.
// Mirrors the sidebar tree (AppSidebar) plus every report (reportsCatalog), so a
// user can type any menu or report name and land on the page. `nameKey`/`groupKey`
// resolve against the i18n namespaces; permission gating is applied at render
// time via getMenuIdFromPath + isMenuVisible (same rules as the sidebar).

export interface NavEntry {
  id: string;
  path: string;
  nameKey: string; // translation key for the destination label
  groupKey: string; // translation key for the section heading it belongs to
  icon: IconType;
}

// Top-level + sub-menu destinations, grouped exactly like the sidebar.
const MENU_ENTRIES: NavEntry[] = [
  { id: "dashboard", path: "/dashboard", nameKey: "sidebar.dashboard", groupKey: "sidebar.menu", icon: LuLayoutDashboard },

  // E-commerce
  { id: "categories", path: "/categories", nameKey: "sidebar.categories", groupKey: "sidebar.ecommerceMenu", icon: LuTags },
  { id: "products", path: "/products", nameKey: "sidebar.products", groupKey: "sidebar.ecommerceMenu", icon: LuPackage },
  { id: "add-product", path: "/add-product", nameKey: "sidebar.addProduct", groupKey: "sidebar.ecommerceMenu", icon: LuPackagePlus },
  { id: "inventory", path: "/inventory", nameKey: "inventory.title", groupKey: "sidebar.ecommerceMenu", icon: LuWarehouse },
  { id: "stock-takes", path: "/stock-takes", nameKey: "sidebar.stockTakes", groupKey: "sidebar.ecommerceMenu", icon: LuClipboardList },
  { id: "stock-transfers", path: "/stock-transfers", nameKey: "sidebar.stockTransfers", groupKey: "sidebar.ecommerceMenu", icon: LuArrowRightLeft },

  // Sales
  { id: "cart", path: "/cart", nameKey: "sidebar.checkout", groupKey: "sidebar.sales", icon: LuShoppingCart },
  { id: "sales", path: "/sales", nameKey: "sidebar.allSales", groupKey: "sidebar.sales", icon: LuReceipt },
  { id: "online-orders", path: "/online-orders", nameKey: "sidebar.onlineOrders", groupKey: "sidebar.sales", icon: LuGlobe },
  { id: "user-debt", path: "/user-debt", nameKey: "sidebar.userDebt", groupKey: "sidebar.sales", icon: LuHandCoins },
  { id: "kassa", path: "/kassa", nameKey: "sidebar.kassaShifts", groupKey: "sidebar.sales", icon: LuCalendarClock },
  { id: "kassa-operations", path: "/kassa/operations", nameKey: "sidebar.kassaOperations", groupKey: "sidebar.sales", icon: LuArrowRightLeft },

  // Finance
  { id: "finance-transactions", path: "/finance/transactions", nameKey: "sidebar.financeTransactions", groupKey: "sidebar.finance", icon: LuWallet },
  { id: "finance-categories", path: "/finance/categories", nameKey: "sidebar.financeCategories", groupKey: "sidebar.finance", icon: LuFolderTree },
  { id: "finance-state", path: "/finance/state", nameKey: "sidebar.financeState", groupKey: "sidebar.finance", icon: LuScale },

  // Reports hub
  { id: "reports", path: "/reports", nameKey: "sidebar.reports", groupKey: "sidebar.menu", icon: LuChartColumnBig },

  // Procurement
  { id: "suppliers", path: "/suppliers", nameKey: "sidebar.suppliers", groupKey: "sidebar.procurement", icon: LuTruck },
  { id: "receipts", path: "/receipts", nameKey: "sidebar.goodsReceipts", groupKey: "sidebar.procurement", icon: LuPackageCheck },

  // Team
  { id: "roles", path: "/roles", nameKey: "sidebar.roles", groupKey: "sidebar.team", icon: LuShieldCheck },
  { id: "staff", path: "/staff", nameKey: "sidebar.staff", groupKey: "sidebar.team", icon: LuUsers },
  { id: "staff-sales", path: "/staff-sales", nameKey: "sidebar.staffSales", groupKey: "sidebar.team", icon: LuUserCheck },

  // Settings
  { id: "branches", path: "/settings/branches", nameKey: "sidebar.branches", groupKey: "sidebar.settings", icon: LuStore },
  { id: "online-store", path: "/settings/online-store", nameKey: "sidebar.onlineStore", groupKey: "sidebar.settings", icon: LuGlobe },
  { id: "settings-receipts", path: "/settings/receipts", nameKey: "sidebar.receipts", groupKey: "sidebar.settings", icon: LuFileText },
  { id: "subscription", path: "/subscription-management", nameKey: "sidebar.subscriptionManagement", groupKey: "sidebar.settings", icon: LuCreditCard },
];

// Every report becomes a search destination under the Reports group.
const REPORT_ENTRIES: NavEntry[] = REPORTS.map((r) => ({
  id: `report-${r.id}`,
  path: r.path,
  nameKey: r.nameKey,
  groupKey: "sidebar.reports",
  icon: r.icon,
}));

export const NAV_ENTRIES: NavEntry[] = [...MENU_ENTRIES, ...REPORT_ENTRIES];
