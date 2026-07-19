import type { IconType } from "react-icons";
import {
  LuTrendingUp,
  LuChartBar,
  LuBoxes,
  LuArrowLeftRight,
  LuChartPie,
  LuClipboardCheck,
  LuTruck,
  LuUndo2,
  LuUsers,
  LuUserRound,
} from "react-icons/lu";

// Single source of truth for the reports listing, favorites and card grid.
// `nameKey`/`descKey` resolve against the `reportsPage`/`sidebar` i18n namespaces.

export type ReportCategory =
  | 'store'
  | 'products'
  | 'sellers'
  | 'customers'
  | 'finance';

export interface ReportMeta {
  id: string;
  path: string;
  category: ReportCategory;
  nameKey: string; // sidebar.* key
  descKey: string; // reportsPage.* key
  icon: IconType;
}

export const REPORTS: ReportMeta[] = [
  // Finance
  {
    id: 'pnl',
    path: '/reports/pnl',
    category: 'finance',
    nameKey: 'sidebar.reportsPnl',
    descKey: 'reportsPage.pnlDesc',
    icon: LuTrendingUp,
  },
  // Products
  {
    id: 'product-performance',
    path: '/reports/product-performance',
    category: 'products',
    nameKey: 'sidebar.productPerformance',
    descKey: 'reportsPage.productPerformanceDesc',
    icon: LuChartBar,
  },
  {
    id: 'stock',
    path: '/reports/stock',
    category: 'products',
    nameKey: 'sidebar.reportsStock',
    descKey: 'reportsPage.stockDesc',
    icon: LuBoxes,
  },
  {
    id: 'product-movement',
    path: '/reports/product-movement',
    category: 'products',
    nameKey: 'sidebar.reportsProductMovement',
    descKey: 'reportsPage.movementDesc',
    icon: LuArrowLeftRight,
  },
  {
    id: 'abc',
    path: '/reports/abc',
    category: 'products',
    nameKey: 'sidebar.reportsAbc',
    descKey: 'reportsPage.abcDesc',
    icon: LuChartPie,
  },
  {
    id: 'stock-takes',
    path: '/reports/stock-takes',
    category: 'products',
    nameKey: 'sidebar.reportsStockTakes',
    descKey: 'reportsPage.stockTakesDesc',
    icon: LuClipboardCheck,
  },
  {
    id: 'imports',
    path: '/reports/imports',
    category: 'products',
    nameKey: 'sidebar.reportsImports',
    descKey: 'reportsPage.importsDesc',
    icon: LuTruck,
  },
  {
    id: 'supplier-returns',
    path: '/reports/supplier-returns',
    category: 'products',
    nameKey: 'sidebar.reportsSupplierReturns',
    descKey: 'reportsPage.supplierReturnsDesc',
    icon: LuUndo2,
  },
  // Sellers
  {
    id: 'sellers',
    path: '/reports/sellers',
    category: 'sellers',
    nameKey: 'sidebar.reportsSellers',
    descKey: 'reportsPage.sellersDesc',
    icon: LuUsers,
  },
  // Customers
  {
    id: 'customers',
    path: '/reports/customers',
    category: 'customers',
    nameKey: 'sidebar.reportsCustomers',
    descKey: 'reportsPage.customersDesc',
    icon: LuUserRound,
  },
];

export const REPORT_CATEGORIES: { key: ReportCategory; labelKey: string }[] = [
  { key: 'finance', labelKey: 'reportsPage.catFinance' },
  { key: 'products', labelKey: 'reportsPage.catProducts' },
  { key: 'sellers', labelKey: 'reportsPage.catSellers' },
  { key: 'customers', labelKey: 'reportsPage.catCustomers' },
];

// Per-category accent tokens. Locked mapping (a category always gets the same
// hue) so the color coding reads as a taxonomy, not decoration.
export const CATEGORY_ACCENT: Record<
  ReportCategory,
  { tile: string; link: string; hoverBorder: string }
> = {
  finance: {
    tile: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
    link: 'text-emerald-600 dark:text-emerald-400',
    hoverBorder: 'hover:border-emerald-300 dark:hover:border-emerald-500/40',
  },
  products: {
    tile: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
    link: 'text-blue-600 dark:text-blue-400',
    hoverBorder: 'hover:border-blue-300 dark:hover:border-blue-500/40',
  },
  sellers: {
    tile: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
    link: 'text-violet-600 dark:text-violet-400',
    hoverBorder: 'hover:border-violet-300 dark:hover:border-violet-500/40',
  },
  customers: {
    tile: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
    link: 'text-amber-600 dark:text-amber-400',
    hoverBorder: 'hover:border-amber-300 dark:hover:border-amber-500/40',
  },
  store: {
    tile: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
    link: 'text-rose-600 dark:text-rose-400',
    hoverBorder: 'hover:border-rose-300 dark:hover:border-rose-500/40',
  },
};
