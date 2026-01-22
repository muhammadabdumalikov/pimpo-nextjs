"use client";
import React, { useEffect, useRef, useState,useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import {
  BoxCubeIcon,
  BoxIcon,
  BoxIconLine,
  CalenderIcon,
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
  PageIcon,
  PieChartIcon,
  PlugInIcon,
  TableIcon,
  UserCircleIcon,
} from "../icons/index";
import SidebarWidget from "./SidebarWidget";
import { useTranslations } from "@/hooks/useTranslations";
import { useSubscription } from "@/context/SubscriptionContext";
import { getMenuPermissions, isMenuAllowed } from "@/data/menuPermissions";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

const AppSidebar: React.FC = () => {
  const { t } = useTranslations();
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const { currentTier } = useSubscription();
  const pathname = usePathname();
  const menuPermissions = getMenuPermissions();

  // Helper function to map path to menu identifier
  const getMenuIdFromPath = (path: string): string | null => {
    const pathMap: Record<string, string> = {
      '/': 'dashboard.ecommerce',
      '/dashboard-v2': 'dashboard.ecommerceV2',
      '/products': 'ecommerce.products',
      '/product-v2': 'ecommerce.productsV2',
      '/add-product': 'ecommerce.addProduct',
      '/add-product-v2': 'ecommerce.addProductV2',
      '/user-debt': 'userDebt',
      '/calendar': 'calendar',
      '/profile': 'userProfile',
      '/form-elements': 'forms.formElements',
      '/basic-tables': 'tables.basicTables',
      '/blank': 'pages.blankPage',
      '/error-404': 'pages.error404',
      '/line-chart': 'charts.lineChart',
      '/bar-chart': 'charts.barChart',
      '/alerts': 'uiElements.alerts',
      '/avatars': 'uiElements.avatar',
      '/badge': 'uiElements.badge',
      '/buttons': 'uiElements.buttons',
      '/images': 'uiElements.images',
      '/videos': 'uiElements.videos',
      '/signin': 'authentication.signIn',
      '/signup': 'authentication.signUp',
      '/subscription-management': 'subscriptionManagement',
    };
    return pathMap[path] || null;
  };

  // Filter menu items based on subscription
  const filterMenuItems = (items: NavItem[]): NavItem[] => {
    return items
      .map(item => {
        if (item.subItems) {
          const filteredSubItems = item.subItems.filter(subItem => {
            const menuId = getMenuIdFromPath(subItem.path);
            return menuId ? isMenuAllowed(menuId, currentTier, menuPermissions) : true;
          });
          
          // Only show parent menu if it has at least one allowed sub-item
          if (filteredSubItems.length === 0) return null;
          
          return { ...item, subItems: filteredSubItems };
        } else if (item.path) {
          const menuId = getMenuIdFromPath(item.path);
          if (menuId && !isMenuAllowed(menuId, currentTier, menuPermissions)) {
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
      subItems: [
        { name: t('sidebar.ecommerce'), path: "/", pro: false },
        { name: t('sidebar.ecommerceV2'), path: "/dashboard-v2", pro: false },
      ],
    },
    {
      icon: <BoxIcon />,
      name: t('sidebar.ecommerceMenu'),
      subItems: [
        { name: t('sidebar.products'), path: "/products", pro: false },
        { name: t('sidebar.productsV2'), path: "/product-v2", pro: false },
        { name: t('sidebar.addProduct'), path: "/add-product", pro: false },
        { name: t('sidebar.addProductV2'), path: "/add-product-v2", pro: false },
      ],
    },
    {
      icon: <CalenderIcon />,
      name: t('sidebar.calendar'),
      path: "/calendar",
    },
    {
      icon: <UserCircleIcon />,
      name: t('sidebar.userProfile'),
      path: "/profile",
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
      name: t('sidebar.forms'),
      icon: <ListIcon />,
      subItems: [{ name: t('sidebar.formElements'), path: "/form-elements", pro: false }],
    },
    {
      name: t('sidebar.tables'),
      icon: <TableIcon />,
      subItems: [{ name: t('sidebar.basicTables'), path: "/basic-tables", pro: false }],
    },
    {
      name: t('sidebar.pages'),
      icon: <PageIcon />,
      subItems: [
        { name: t('sidebar.blankPage'), path: "/blank", pro: false },
        { name: t('sidebar.error404'), path: "/error-404", pro: false },
      ],
    },
  ]);

  const othersItems: NavItem[] = filterMenuItems([
    {
      icon: <PieChartIcon />,
      name: t('sidebar.charts'),
      subItems: [
        { name: t('sidebar.lineChart'), path: "/line-chart", pro: false },
        { name: t('sidebar.barChart'), path: "/bar-chart", pro: false },
      ],
    },
    {
      icon: <BoxCubeIcon />,
      name: t('sidebar.uiElements'),
      subItems: [
        { name: t('sidebar.alerts'), path: "/alerts", pro: false },
        { name: t('sidebar.avatar'), path: "/avatars", pro: false },
        { name: t('sidebar.badge'), path: "/badge", pro: false },
        { name: t('sidebar.buttons'), path: "/buttons", pro: false },
        { name: t('sidebar.images'), path: "/images", pro: false },
        { name: t('sidebar.videos'), path: "/videos", pro: false },
      ],
    },
    {
      icon: <PlugInIcon />,
      name: t('sidebar.authentication'),
      subItems: [
        { name: t('sidebar.signIn'), path: "/signin", pro: false },
        { name: t('sidebar.signUp'), path: "/signup", pro: false },
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
                    <Link
                      href={subItem.path}
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
    ["main", "others"].forEach((menuType) => {
      const items = menuType === "main" ? navItems : othersItems;
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({
                type: menuType as "main" | "others",
                index,
              });
              submenuMatched = true;
            }
          });
        }
      });
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
                className="dark:hidden"
                src="/images/logo/logo.svg"
                alt="Logo"
                width={150}
                height={40}
              />
              <Image
                className="hidden dark:block"
                src="/images/logo/logo-dark.svg"
                alt="Logo"
                width={150}
                height={40}
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

            <div className="">
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  t('sidebar.others')
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(othersItems, "others")}
            </div>
          </div>
        </nav>
        {isExpanded || isHovered || isMobileOpen ? <SidebarWidget /> : null}
      </div>
    </aside>
  );
};

export default AppSidebar;
