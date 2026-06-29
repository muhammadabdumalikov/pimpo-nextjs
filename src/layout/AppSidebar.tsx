"use client";
import React, { useEffect, useRef, useState,useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import {
  AccountSettingsIcon,
  BoxIcon,
  BoxIconLine,
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  PieChartIcon,
  PlugInIcon,
  UserCircleIcon,
} from "../icons/index";
import { useTranslations } from "@/hooks/useTranslations";
import { useSubscription } from "@/context/SubscriptionContext";
import { useAuth } from "@/context/AuthContext";
import { getMenuPermissions, isMenuAllowed } from "@/data/menuPermissions";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean; comingSoon?: boolean }[];
};

const AppSidebar: React.FC = () => {
  const { t } = useTranslations();
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, toggleMobileSidebar } = useSidebar();

  // On mobile the sidebar is an overlay — close it once a destination is picked.
  const handleNavClick = () => {
    if (isMobileOpen) toggleMobileSidebar();
  };
  const { currentTier } = useSubscription();
  const { hasMenuAccess } = useAuth();
  const pathname = usePathname();
  const menuPermissions = getMenuPermissions();

  // Helper function to map path to menu identifier
  const getMenuIdFromPath = (path: string): string | null => {
    const pathMap: Record<string, string> = {
      '/': 'dashboard.ecommerce',
      '/categories': 'ecommerce.categories',
      '/products': 'ecommerce.products',
      '/product': 'ecommerce.productsList',
      '/add-product': 'ecommerce.addProduct',
      '/user-debt': 'userDebt',
      '/subscription-management': 'subscriptionManagement',
      '/settings': 'settings',
      '/settings/receipts': 'settings.receipts',
      '/cart': 'checkout',
      '/inventory': 'inventory',
      '/suppliers': 'suppliers',
      '/receipts': 'receipts',
      '/product-performance': 'productPerformance',
      '/roles': 'team.roles',
      '/staff': 'team.staff',
    };
    return pathMap[path] || null;
  };

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
      icon: <GridIcon />,
      name: t('sidebar.dashboard'),
      path: "/",
    },
    {
      icon: <BoxIcon />,
      name: t('sidebar.ecommerceMenu'),
      subItems: [
        { name: t('sidebar.categories'), path: "/categories", pro: false },
        { name: t('sidebar.products'), path: "/products", pro: false },
        { name: t('sidebar.addProduct'), path: "/add-product", pro: false },
        { name: t('sidebar.checkout'), path: "/cart", pro: false },
      ],
    },
    {
      icon: <UserCircleIcon />,
      name: t('sidebar.userDebt'),
      path: "/user-debt",
    },
    {
      icon: <BoxIconLine />,
      name: t('sidebar.inventory'),
      path: "/inventory",
    },
    {
      icon: <BoxIcon />,
      name: t('sidebar.procurement'),
      subItems: [
        { name: t('sidebar.suppliers'), path: "/suppliers", pro: false },
        { name: t('sidebar.goodsReceipts'), path: "/receipts", pro: false, comingSoon: true },
      ],
    },
    {
      icon: <PieChartIcon />,
      name: t('sidebar.productPerformance'),
      path: "/product-performance",
    },
    {
      icon: <PlugInIcon />,
      name: t('sidebar.subscriptionManagement'),
      path: "/subscription-management",
    },
    {
      icon: <UserCircleIcon />,
      name: t('sidebar.team'),
      subItems: [
        { name: t('sidebar.roles'), path: "/roles", pro: false },
        { name: t('sidebar.staff'), path: "/staff", pro: false },
      ],
    },
    {
      icon: <AccountSettingsIcon />,
      name: t('sidebar.settings'),
      subItems: [
        { name: t('sidebar.receipts'), path: "/settings/receipts", pro: false },
      ],
    },
  ]);

  const renderMenuItems = (
    navItems: NavItem[],
    menuType: "main" | "others"
  ) => (
    <ul className="flex flex-col gap-4">
      {navItems.map((nav, index) => (
        <li key={nav.name}>
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
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
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
          )}
        </li>
      ))}
    </ul>
  );

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // const isActive = (path: string) => path === pathname;
   const isActive = useCallback((path: string) => path === pathname, [pathname]);

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
  }, [pathname,isActive]);

  useEffect(() => {
    // Set the height of the submenu items when the submenu is opened
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

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
        className={`py-8 flex  ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link href="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <Image
                className="h-8 w-auto dark:hidden"
                src="/images/logo/logo.svg"
                alt="Logo"
                width={154}
                height={32}
              />
              <Image
                className="hidden h-8 w-auto dark:block"
                src="/images/logo/logo-dark.svg"
                alt="Logo"
                width={154}
                height={32}
              />
            </>
          ) : (
            <Image
              src="/images/logo/logo-icon.svg"
              alt="Logo"
              width={32}
              height={32}
            />
          )}
        </Link>
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
