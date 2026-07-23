"use client";
import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import {
  ChevronDownIcon,
  HorizontaLDots,
} from "../icons/index";
import {
  LuScanBarcode,
  LuTruck,
  LuLayoutDashboard,
  LuSettings,
  LuChartPie,
  LuChartColumnBig,
  LuBox,
} from "react-icons/lu";
import { CgProfile } from "react-icons/cg";
import { useTranslations } from "@/hooks/useTranslations";
import { useSubscription } from "@/context/SubscriptionContext";
import { useAuth } from "@/context/AuthContext";
import { getMenuPermissions, isMenuAllowed, getMenuIdFromPath } from "@/data/menuPermissions";
import { getOrderCount } from "@/lib/api";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  disabled?: boolean;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean; comingSoon?: boolean; count?: number }[];
};

const AppSidebar: React.FC = () => {
  const { t } = useTranslations();
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, toggleMobileSidebar, headerOpen, toggleHeader } = useSidebar();

  // On mobile the sidebar is an overlay — close it once a destination is picked.
  const handleNavClick = () => {
    if (isMobileOpen) toggleMobileSidebar();
  };
  const { currentTier } = useSubscription();
  const { hasMenuAccess } = useAuth();
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
  const isVisible = (menuId: string | null): boolean => {
    if (!menuId) return true;
    return isMenuAllowed(menuId, currentTier, menuPermissions) && hasMenuAccess(menuId);
  };

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
      icon: <LuLayoutDashboard size={24} />,
      name: t('sidebar.dashboard'),
      path: "/dashboard",
    },
    {
      icon: <LuBox size={24} />,
      name: t('sidebar.ecommerceMenu'),
      subItems: [
        { name: t('sidebar.categories'), path: "/categories", pro: false },
        { name: t('sidebar.products'), path: "/products", pro: false },
        { name: t('sidebar.addProduct'), path: "/add-product", pro: false },
        { name: t('inventory.title'), path: "/inventory", pro: false },
        { name: t('sidebar.stockTakes'), path: "/stock-takes", pro: false },
        { name: t('sidebar.stockTransfers'), path: "/stock-transfers", pro: false },
      ],
    },
    {
      icon: <LuScanBarcode size={24} />,
      name: t('sidebar.sales'),
      subItems: [
        { name: t('sidebar.checkout'), path: "/cart", pro: false },
        { name: t('sidebar.allSales'), path: "/sales", pro: false },
        { name: t('sidebar.onlineOrders'), path: "/online-orders", pro: false, count: pendingStoreOrders },
        { name: t('sidebar.userDebt'), path: "/user-debt", pro: false },
        { name: t('sidebar.kassaShifts'), path: "/kassa", pro: false },
        { name: t('sidebar.kassaOperations'), path: "/kassa/operations", pro: false },
      ],
    },
    {
      icon: <LuChartPie size={24} />,
      name: t('sidebar.finance'),
      subItems: [
        { name: t('sidebar.financeTransactions'), path: "/finance/transactions", pro: false },
        { name: t('sidebar.financeCategories'), path: "/finance/categories", pro: false },
        { name: t('sidebar.financeState'), path: "/finance/state", pro: false },
      ],
    },
    {
      icon: <LuChartColumnBig size={24} />,
      name: t('sidebar.reports'),
      path: "/reports",
    },
    {
      icon: <LuTruck size={24} />,
      name: t('sidebar.procurement'),
      subItems: [
        { name: t('sidebar.suppliers'), path: "/suppliers", pro: false },
        { name: t('sidebar.goodsReceipts'), path: "/receipts", pro: false },
      ],
    },
    {
      icon: <CgProfile size={24} />,
      name: t('sidebar.team'),
      subItems: [
        { name: t('sidebar.roles'), path: "/roles", pro: false },
        { name: t('sidebar.staff'), path: "/staff", pro: false },
        { name: t('sidebar.staffSales'), path: "/staff-sales", pro: false },
      ],
    },
    {
      icon: <LuSettings size={24} />,
      name: t('sidebar.settings'),
      subItems: [
        { name: t('sidebar.branches'), path: "/settings/branches", pro: false },
        { name: t('sidebar.receipts'), path: "/settings/receipts", pro: false },
        { name: t('sidebar.paymentMethods'), path: "/settings/payment-methods", pro: false },
        { name: t('sidebar.units'), path: "/settings/units", pro: false },
        { name: t('sidebar.catalogSettings'), path: "/settings/catalog", pro: false },
        { name: t('sidebar.onlineStore'), path: "/settings/online-store", pro: false },
        { name: t('sidebar.profileSettings'), path: "/settings/profile", pro: false },
        { name: t('sidebar.subscriptionManagement'), path: "/subscription-management", pro: false },
      ],
    },
  ]);

  const renderMenuItems = (
    navItems: NavItem[],
    menuType: "main" | "others"
  ) => (
    <ul className="flex flex-col gap-4">
      {navItems.map((nav, index) => (
        <li key={`${menuType}-${index}`}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group  ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } cursor-pointer ${
                !isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
              }`}
            >
              <span
                className={` ${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className={`menu-item-text`}>{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200  ${
                    openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                      ? "rotate-180 text-brand-500"
                      : ""
                  }`}
                />
              )}
            </button>
          ) : nav.disabled ? (
            <span
              className="menu-item group menu-item-inactive cursor-not-allowed opacity-60"
              aria-disabled="true"
            >
              <span className="menu-item-icon-inactive">{nav.icon}</span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className={`menu-item-text`}>{nav.name}</span>
              )}
            </span>
          ) : (
            nav.path && (
              <Link
                href={nav.path}
                onClick={handleNavClick}
                className={`menu-item group ${
                  isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={`${
                    isActive(nav.path)
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className={`menu-item-text`}>{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            // Animated with grid-rows (like the header toggle in the admin
            // layout) instead of a measured pixel height — measuring broke
            // whenever navItems refiltered async (tier/role load) and left a
            // stale height cached for the wrong submenu.
            <div
              className={`grid transition-all duration-300 ease-in-out ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
              <ul className="mt-2 space-y-1 ml-9">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    {subItem.comingSoon ? (
                      <span
                        className="menu-dropdown-item menu-dropdown-item-inactive cursor-not-allowed opacity-60"
                        aria-disabled="true"
                        title={t('sidebar.comingSoon')}
                      >
                        {subItem.name}
                        <span className="flex items-center gap-1 ml-auto">
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
                      <span className="flex items-center gap-1 ml-auto">
                        {typeof subItem.count === "number" && subItem.count > 0 && (
                          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1.5 text-xs font-semibold text-white">
                            {subItem.count > 99 ? "99+" : subItem.count}
                          </span>
                        )}
                        {subItem.new && (
                          <span
                            className={`ml-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge `}
                          >
                            {t('sidebar.new')}
                          </span>
                        )}
                        {subItem.pro && (
                          <span
                            className={`ml-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge `}
                          >
                            {t('sidebar.pro')}
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
      ))}
    </ul>
  );

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);

  // Exact match or a sub-route of the item (e.g. "/reports" stays highlighted
  // on "/reports/sales", "/kassa" on "/kassa/[id]").
  const isActive = useCallback(
    (path: string) =>
      path === pathname || (path !== "/" && pathname.startsWith(path + "/")),
    [pathname],
  );

  // navItems is refiltered when the subscription tier / role permissions load
  // (async, after mount) — the matched submenu index shifts with it, so the
  // open-on-load effect must re-run on shape changes, not just on navigation.
  const menuSignature = navItems
    .map((nav) => nav.subItems?.map((s) => s.path).join(",") ?? nav.path ?? "")
    .join("|");

  useEffect(() => {
    // Check if the current path matches any submenu item
    let submenuMatched = false;
    navItems.forEach((nav, index) => {
      if (nav.subItems) {
        nav.subItems.forEach((subItem) => {
          if (isActive(subItem.path)) {
            setOpenSubmenu({ type: "main", index });
            submenuMatched = true;
          }
        });
      }
    });

    // If no submenu item matches, close the open submenu
    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, isActive, menuSignature]);

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex items-center ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-between"
        }`}
      >
        <Link href="/dashboard" className="flex items-center" aria-label="KPOS">
          {isExpanded || isHovered || isMobileOpen ? (
            <span className="rounded-lg bg-brand-500 px-3 py-1.5 text-xl font-bold tracking-tight text-white">
              KPOS
            </span>
          ) : (
            <span className="rounded-lg bg-brand-500 px-2 py-1 text-xs font-bold tracking-tight text-white">
              KPOS
            </span>
          )}
        </Link>
        {/* Header show/hide — a "top panel" toggle: the top bar of the panel
            fills when the header is shown and empties when it's hidden. */}
        {(isExpanded || isHovered || isMobileOpen) && (
          <button
            type="button"
            onClick={toggleHeader}
            aria-label={headerOpen ? "Hide header" : "Show header"}
            className="flex items-center justify-center text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <rect
                x="3"
                y="4"
                width="18"
                height="16"
                rx="2.5"
                stroke="currentColor"
                strokeWidth="2"
              />
              {/* Top bar: solid when shown, hollow line when hidden */}
              <path
                d="M3 9h18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <rect
                x="4.5"
                y="5.5"
                width="15"
                height="2"
                rx="1"
                fill="currentColor"
                className={`origin-center transition-all duration-300 ease-in-out ${
                  headerOpen ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0"
                }`}
              />
            </svg>
          </button>
        )}
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  t('sidebar.menu')
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(navItems, "main")}
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
