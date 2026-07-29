"use client";
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { ChevronDownIcon } from "../icons/index";
import {
  LuScanBarcode,
  LuTruck,
  LuLayoutDashboard,
  LuSettings,
  LuChartPie,
  LuChartColumnBig,
  LuBox,
  LuUsersRound,
  LuChevronsLeft,
  LuChevronsRight,
  LuChevronsUpDown,
  LuLogOut,
  LuSunMedium,
  LuMoon,
} from "react-icons/lu";
import { CgProfile } from "react-icons/cg";
import { useTheme } from "@/context/ThemeContext";
import { useTranslations } from "@/hooks/useTranslations";
import { useSubscription } from "@/context/SubscriptionContext";
import { useAuth } from "@/context/AuthContext";
import { getMenuPermissions, isMenuAllowed, getMenuIdFromPath } from "@/data/menuPermissions";
import { selectableLocales, localeNativeNames, type Locale } from "@/i18n/config";
import { getOrderCount } from "@/lib/api";
import { ConfirmModal } from "@/components/ui/confirm-modal";

type SubItem = {
  name: string;
  path: string;
  new?: boolean;
  comingSoon?: boolean;
  count?: number;
};

type NavItem = {
  /** Stable identity for open/close state — never an array index, those shift
   *  when tier/role filtering resolves async. */
  key: string;
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: SubItem[];
};

// Which group is open — persisted so a reload lands where the user left off.
// Single-open accordion: opening a group closes the previous one, and the
// group containing the current page opens itself on navigation.
const OPEN_GROUP_KEY = "sidebar.openGroup.v1";

const AppSidebar: React.FC = () => {
  const { t, locale, setLocale } = useTranslations();
  const {
    isExpanded,
    isMobileOpen,
    isHovered,
    setIsHovered,
    toggleSidebar,
    toggleMobileSidebar,
  } = useSidebar();

  // On mobile the sidebar is an overlay — close it once a destination is picked.
  const handleNavClick = () => {
    if (isMobileOpen) toggleMobileSidebar();
  };
  const { currentTier } = useSubscription();
  const { hasMenuAccess, account, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // "Demo Market" → "DM" for the account squircle.
  const accountInitials =
    (account?.name || "")
      .trim()
      .split(/\s+/)
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  // Labels are hidden on the collapsed desktop rail (unless hover-peeking).
  const showLabels = isExpanded || isHovered || isMobileOpen;

  // Account panel (footer drop-up): name, language and sign-out live here now
  // that there is no app header.
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!accountOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAccountOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [accountOpen]);
  const pathname = usePathname();
  const menuPermissions = getMenuPermissions();

  // New (Pending) storefront orders — numeric badge on the "Online orders"
  // menu item, refreshed every minute and on navigation (so acting on orders
  // clears it promptly).
  const [pendingStoreOrders, setPendingStoreOrders] = useState(0);
  useEffect(() => {
    let alive = true;
    const poll = () => {
      getOrderCount({ status: "Pending", source: "store" })
        .then((count) => {
          if (alive) setPendingStoreOrders(count);
        })
        .catch(() => {
          /* sidebar badge is best-effort */
        });
    };
    poll();
    const id = setInterval(poll, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [pathname]);

  // A menu is shown only when allowed by BOTH the subscription tier and the
  // acting account's role. The business owner has menuKeys ["*"] so the role
  // check always passes for them.
  const isVisible = useCallback(
    (menuId: string | null): boolean => {
      if (!menuId) return true;
      return isMenuAllowed(menuId, currentTier, menuPermissions) && hasMenuAccess(menuId);
    },
    [currentTier, menuPermissions, hasMenuAccess],
  );

  // Filter menu items based on subscription tier + role permissions
  const filterMenuItems = (items: NavItem[]): NavItem[] => {
    return items
      .map(item => {
        if (item.subItems) {
          const filteredSubItems = item.subItems.filter(subItem =>
            isVisible(getMenuIdFromPath(subItem.path)),
          );

          // Only show parent menu if it has at least one allowed sub-item
          if (filteredSubItems.length === 0) return null;

          return { ...item, subItems: filteredSubItems };
        } else if (item.path) {
          if (!isVisible(getMenuIdFromPath(item.path))) {
            return null;
          }
        }
        return item;
      })
      .filter((item): item is NavItem => item !== null);
  };

  const navItems: NavItem[] = filterMenuItems([
    {
      key: "dashboard",
      icon: <LuLayoutDashboard size={22} />,
      name: t('sidebar.dashboard'),
      path: "/dashboard",
    },
    {
      key: "catalog",
      icon: <LuBox size={22} />,
      name: t('sidebar.ecommerceMenu'),
      subItems: [
        { name: t('sidebar.categories'), path: "/categories" },
        { name: t('sidebar.products'), path: "/products" },
        { name: t('sidebar.addProduct'), path: "/add-product" },
        { name: t('inventory.title'), path: "/inventory" },
        { name: t('sidebar.stockTakes'), path: "/stock-takes" },
        { name: t('sidebar.stockTransfers'), path: "/stock-transfers" },
      ],
    },
    {
      key: "sales",
      icon: <LuScanBarcode size={22} />,
      name: t('sidebar.sales'),
      subItems: [
        { name: t('sidebar.checkout'), path: "/cart" },
        { name: t('sidebar.allSales'), path: "/sales" },
        { name: t('sidebar.onlineOrders'), path: "/online-orders", count: pendingStoreOrders },
        { name: t('sidebar.kassaShifts'), path: "/kassa" },
        { name: t('sidebar.kassaOperations'), path: "/kassa/operations" },
      ],
    },
    {
      key: "clients",
      icon: <LuUsersRound size={22} />,
      name: t('sidebar.clients'),
      subItems: [
        { name: t('sidebar.customers'), path: "/customers" },
        { name: t('sidebar.userDebt'), path: "/user-debt" },
        { name: t('sidebar.loyalty'), path: "/loyalty" },
      ],
    },
    {
      key: "finance",
      icon: <LuChartPie size={22} />,
      name: t('sidebar.finance'),
      subItems: [
        { name: t('sidebar.financeTransactions'), path: "/finance/transactions" },
        { name: t('sidebar.financeCategories'), path: "/finance/categories" },
        { name: t('sidebar.financeState'), path: "/finance/state" },
        { name: t('sidebar.financePayroll'), path: "/finance/payroll" },
      ],
    },
    {
      key: "reports",
      icon: <LuChartColumnBig size={22} />,
      name: t('sidebar.reports'),
      path: "/reports",
    },
    {
      key: "procurement",
      icon: <LuTruck size={22} />,
      name: t('sidebar.procurement'),
      subItems: [
        { name: t('sidebar.suppliers'), path: "/suppliers" },
        { name: t('sidebar.goodsReceipts'), path: "/receipts" },
      ],
    },
    {
      key: "team",
      icon: <CgProfile size={22} />,
      name: t('sidebar.team'),
      subItems: [
        { name: t('sidebar.roles'), path: "/roles" },
        { name: t('sidebar.staff'), path: "/staff" },
        { name: t('sidebar.staffSales'), path: "/staff-sales" },
      ],
    },
    {
      key: "settings",
      icon: <LuSettings size={22} />,
      name: t('sidebar.settings'),
      subItems: [
        { name: t('sidebar.branches'), path: "/settings/branches" },
        { name: t('sidebar.receipts'), path: "/settings/receipts" },
        { name: t('sidebar.paymentMethods'), path: "/settings/payment-methods" },
        { name: t('sidebar.units'), path: "/settings/units" },
        { name: t('sidebar.catalogSettings'), path: "/settings/catalog" },
        { name: t('sidebar.onlineStore'), path: "/settings/online-store" },
        { name: t('sidebar.profileSettings'), path: "/settings/profile" },
        { name: t('sidebar.integrations'), path: "/settings/applications" },
        { name: t('sidebar.subscriptionManagement'), path: "/subscription-management" },
      ],
    },
  ]);

  // Exact match or a sub-route of the item (e.g. "/reports" stays highlighted
  // on "/reports/sales", "/kassa" on "/kassa/[id]").
  const isActive = useCallback(
    (path: string) =>
      path === pathname || (path !== "/" && pathname.startsWith(path + "/")),
    [pathname],
  );

  // ── Open group: single-open accordion, persisted ──────────────────────────
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [logoutAsk, setLogoutAsk] = useState(false);
  // Persist only after the stored value has been read, so the initial null
  // never overwrites a saved group.
  const hydrated = useRef(false);

  const activeGroupKey = useMemo(
    () =>
      navItems.find((nav) => nav.subItems?.some((s) => isActive(s.path)))?.key ??
      null,
    [navItems, isActive],
  );

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      let stored: string | null = null;
      try {
        stored = localStorage.getItem(OPEN_GROUP_KEY);
      } catch {
        /* private mode — start closed */
      }
      // localStorage is client-only, so hydrating here (not in the lazy
      // initializer) is what keeps the SSR and first client render identical —
      // same trade-off ThemeContext makes. The current page's group wins over
      // the stored one.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpenGroup(activeGroupKey ?? stored);
      return;
    }
    // Navigating into a section opens it (and, accordion, closes the other).
    if (activeGroupKey) setOpenGroup(activeGroupKey);
  }, [activeGroupKey]);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      if (openGroup) {
        localStorage.setItem(OPEN_GROUP_KEY, openGroup);
      } else {
        localStorage.removeItem(OPEN_GROUP_KEY);
      }
    } catch {
      /* private mode — open state just won't persist */
    }
  }, [openGroup]);

  const toggleGroup = (key: string) =>
    setOpenGroup((prev) => (prev === key ? null : key));

  const renderMenuItems = (items: NavItem[]) => (
    <ul className="flex flex-col gap-1">
      {items.map((nav) => {
        const isOpen = openGroup === nav.key;
        const containsActive =
          nav.subItems?.some((s) => isActive(s.path)) ?? false;
        // A closed group holding the current page still answers "where am I":
        // it takes the active treatment until it's opened (then the child
        // carries it and the parent goes quiet).
        const parentActive = nav.subItems
          ? containsActive && (!isOpen || !showLabels)
          : nav.path
            ? isActive(nav.path)
            : false;
        // Badge signal must survive a closed group / the icon rail — a hidden
        // "3 new online orders" is a missed sale.
        const groupCount =
          nav.subItems?.reduce((sum, s) => sum + (s.count ?? 0), 0) ?? 0;

        return (
          <li key={nav.key}>
            {nav.subItems ? (
              <button
                onClick={() => toggleGroup(nav.key)}
                aria-expanded={isOpen}
                className={`menu-item group ${
                  parentActive ? "menu-item-active" : "menu-item-inactive"
                } cursor-pointer ${
                  !showLabels ? "lg:justify-center" : "lg:justify-start"
                }`}
              >
                <span
                  className={`relative ${
                    parentActive || containsActive
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                  {!showLabels && groupCount > 0 && (
                    <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-brand-500" />
                  )}
                </span>
                {showLabels && (
                  <span className="truncate">{nav.name}</span>
                )}
                {showLabels && (
                  <span className="ml-auto flex items-center gap-1.5">
                    {!isOpen && groupCount > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1.5 text-xs font-semibold text-white">
                        {groupCount > 99 ? "99+" : groupCount}
                      </span>
                    )}
                    <ChevronDownIcon
                      className={`h-4 w-4 text-gray-400 transition-transform duration-200 dark:text-gray-500 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </span>
                )}
              </button>
            ) : (
              nav.path && (
                <Link
                  href={nav.path}
                  onClick={handleNavClick}
                  className={`menu-item group ${
                    parentActive ? "menu-item-active" : "menu-item-inactive"
                  } ${!showLabels ? "lg:justify-center" : "lg:justify-start"}`}
                >
                  <span
                    className={
                      parentActive
                        ? "menu-item-icon-active"
                        : "menu-item-icon-inactive"
                    }
                  >
                    {nav.icon}
                  </span>
                  {showLabels && (
                    <span className="truncate">{nav.name}</span>
                  )}
                </Link>
              )
            )}
            {nav.subItems && showLabels && (
              // Animated with grid-rows (like the header toggle in the admin
              // layout) instead of a measured pixel height — measuring broke
              // whenever navItems refiltered async (tier/role load) and left a
              // stale height cached for the wrong submenu.
              <div
                className={`grid transition-all duration-300 ease-in-out ${
                  isOpen
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  {/* Tree hairline sits on the icon axis (px-3 + half of the
                      22px glyph = 22px); pl-3 lands child text on the same
                      x as the parent label. */}
                  <ul className="mb-1 ml-[22px] mt-1 space-y-0.5 border-l border-gray-200 pl-3 dark:border-gray-800">
                    {nav.subItems.map((subItem) => (
                      <li key={subItem.name}>
                        {subItem.comingSoon ? (
                          <span
                            className="menu-dropdown-item menu-dropdown-item-inactive cursor-not-allowed opacity-60"
                            aria-disabled="true"
                            title={t('sidebar.comingSoon')}
                          >
                            {subItem.name}
                            <span className="ml-auto flex items-center gap-1">
                              <span className="menu-dropdown-badge menu-dropdown-badge-inactive">
                                {t('sidebar.comingSoon')}
                              </span>
                            </span>
                          </span>
                        ) : (
                          <Link
                            href={subItem.path}
                            onClick={handleNavClick}
                            className={`menu-dropdown-item ${
                              isActive(subItem.path)
                                ? "menu-dropdown-item-active"
                                : "menu-dropdown-item-inactive"
                            }`}
                          >
                            {subItem.name}
                            <span className="ml-auto flex items-center gap-1">
                              {typeof subItem.count === "number" &&
                                subItem.count > 0 && (
                                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1.5 text-xs font-semibold text-white">
                                    {subItem.count > 99 ? "99+" : subItem.count}
                                  </span>
                                )}
                              {subItem.new && (
                                <span
                                  className={`${
                                    isActive(subItem.path)
                                      ? "menu-dropdown-badge-active"
                                      : "menu-dropdown-badge-inactive"
                                  } menu-dropdown-badge`}
                                >
                                  {t('sidebar.new')}
                                </span>
                              )}
                            </span>
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
    <aside
      className={`fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-gray-200 bg-white px-4 text-gray-900 transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900
        ${
          isExpanded || isMobileOpen
            ? "w-[272px]"
            : isHovered
            ? "w-[272px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`flex items-center py-6 ${
          !showLabels ? "lg:justify-center" : "justify-between"
        }`}
      >
        <Link href="/dashboard" className="flex items-center" aria-label="KPOS">
          {showLabels ? (
            <span className="rounded-lg bg-brand-500 px-3 py-1.5 text-xl font-bold tracking-tight text-white">
              KPOS
            </span>
          ) : (
            <span className="rounded-lg bg-brand-500 px-2 py-1 text-xs font-bold tracking-tight text-white">
              KPOS
            </span>
          )}
        </Link>
        {/* Sidebar collapse (the old header hamburger's job) — desktop only,
            since mobile closes via the backdrop. Theme lives in the account
            panel below, with the other personal preferences. */}
        {showLabels && (
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
            className="hidden h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white lg:flex"
          >
            {isExpanded ? (
              <LuChevronsLeft size={18} />
            ) : (
              <LuChevronsRight size={18} />
            )}
          </button>
        )}
      </div>

      <div className="no-scrollbar flex flex-1 flex-col overflow-y-auto duration-300 ease-linear">
        <nav className="mb-6">{renderMenuItems(navItems)}</nav>
      </div>

      {/* ── Account footer ─────────────────────────────────────────────────
          The old header's user menu and locale switcher, consolidated into one
          bottom-pinned row (the Linear/Notion pattern). The account is the
          BUSINESS (shop), so the mark is a brand-tinted squircle — the same
          icon-tile vocabulary the rest of the app uses — not a person-circle
          in a name-hashed color. */}
      <div
        ref={accountRef}
        className="relative -mx-4 mt-auto border-t border-gray-200 px-3 py-3 dark:border-gray-800"
      >
        <button
          type="button"
          onClick={() => setAccountOpen((v) => !v)}
          aria-expanded={accountOpen}
          aria-haspopup="true"
          className={`flex w-full items-center gap-2.5 rounded-lg p-1.5 transition-colors ${
            accountOpen
              ? "bg-gray-100 dark:bg-white/5"
              : "hover:bg-gray-100 dark:hover:bg-white/5"
          } ${!showLabels ? "lg:justify-center" : ""}`}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-xs font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
            {accountInitials}
          </span>
          {showLabels && (
            <>
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-medium text-gray-800 dark:text-white/90">
                  {account?.name || "—"}
                </span>
                <span className="block truncate text-theme-xs text-gray-400 dark:text-gray-500">
                  {account?.type === "staff"
                    ? account?.roleName ?? ""
                    : account?.login ?? ""}
                </span>
              </span>
              {/* The account-switcher affordance — without it this row reads
                  as a static label, not a control. */}
              <LuChevronsUpDown
                size={15}
                className="shrink-0 text-gray-400 dark:text-gray-500"
              />
            </>
          )}
        </button>

        {accountOpen && (
          <div
            className={`absolute bottom-full z-50 mb-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark ${
              showLabels ? "left-3 right-3" : "left-3 w-64"
            }`}
          >
            {/* Who is signed in — so the actions below have a subject. */}
            <div className="flex items-center gap-2.5 border-b border-gray-100 px-3 py-2.5 dark:border-gray-800">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-[11px] font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                {accountInitials}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-gray-800 dark:text-white/90">
                  {account?.name || "—"}
                </span>
                <span className="block truncate text-theme-xs text-gray-400 dark:text-gray-500">
                  {account?.type === "staff"
                    ? account?.roleName ?? ""
                    : account?.login ?? ""}
                </span>
              </span>
            </div>

            {/* Personal preferences — language and theme as matching segmented
                controls. Languages are named in themselves (the person hunting
                for one may not read the active one); switching keeps the panel
                open — the whole UI flipping IS the feedback. */}
            <div className="space-y-1 p-1.5">
              <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-white/[0.06]">
                {selectableLocales.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    aria-pressed={loc === locale}
                    onClick={() => setLocale(loc as Locale)}
                    className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                      loc === locale
                        ? "bg-white text-gray-900 shadow-theme-xs dark:bg-white/10 dark:text-white"
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    }`}
                  >
                    {localeNativeNames[loc]}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-white/[0.06]">
                {(
                  [
                    { value: "light", label: t("sidebar.themeLight"), icon: <LuSunMedium size={14} /> },
                    { value: "dark", label: t("sidebar.themeDark"), icon: <LuMoon size={14} /> },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={theme === opt.value}
                    onClick={() => {
                      if (theme !== opt.value) toggleTheme();
                    }}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                      theme === opt.value
                        ? "bg-white text-gray-900 shadow-theme-xs dark:bg-white/10 dark:text-white"
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    }`}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 p-1.5 dark:border-gray-800">
              <button
                type="button"
                onClick={() => {
                  setAccountOpen(false);
                  setLogoutAsk(true);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-theme-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
              >
                <LuLogOut size={16} className="text-gray-400 dark:text-gray-500" />
                {t("auth.signOut")}
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>

    {/* Rendered OUTSIDE the <aside> — the sidebar's transform (transition-all)
        would otherwise trap this fixed-position modal inside it instead of
        centering it on the viewport. */}
    <ConfirmModal
      isOpen={logoutAsk}
      onClose={() => setLogoutAsk(false)}
      onConfirm={() => {
        setLogoutAsk(false);
        logout();
      }}
      title={t("auth.signOut")}
      message={t("auth.signOutConfirm")}
      confirmLabel={t("auth.signOut")}
      cancelLabel={t("common.cancel")}
      variant="danger"
    />
    </>
  );
};

export default AppSidebar;
