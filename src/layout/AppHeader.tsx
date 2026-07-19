"use client";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import LocaleSwitcher from "@/components/common/LocaleSwitcher";
import NotificationDropdown from "@/components/header/NotificationDropdown";
import UserDropdown from "@/components/header/UserDropdown";
import GlobalSearch from "@/components/header/GlobalSearch";
import { useSidebar } from "@/context/SidebarContext";
import Link from "next/link";
import React, { useState } from "react";
import { LuX, LuMenu, LuEllipsis } from "react-icons/lu";

const AppHeader: React.FC = () => {
  const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false);

  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();

  const handleToggle = () => {
    if (window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  const toggleApplicationMenu = () => {
    setApplicationMenuOpen(!isApplicationMenuOpen);
  };

  return (
    <header className="sticky top-0 flex w-full bg-white border-gray-200 z-99999 dark:border-gray-800 dark:bg-gray-900 lg:border-b">
      <div className="flex flex-col items-center justify-between grow lg:flex-row lg:px-6">
        <div className="flex items-center justify-between w-full gap-2 px-3 py-3 border-b border-gray-200 dark:border-gray-800 sm:gap-4 lg:justify-normal lg:border-b-0 lg:px-0 lg:py-4">
          <button
            className="items-center justify-center w-10 h-10 text-gray-500 border-gray-200 rounded-lg z-99999 dark:border-gray-800 lg:flex dark:text-gray-400 lg:h-11 lg:w-11 lg:border"
            onClick={handleToggle}
            aria-label="Toggle Sidebar"
          >
            {isMobileOpen ? <LuX size={24} /> : <LuMenu size={24} />}
          </button>

          <Link href="/dashboard" className="flex items-center lg:hidden" aria-label="KPOS">
            <span className="rounded-lg bg-brand-500 px-2.5 py-1 text-lg font-bold tracking-tight text-white">
              KPOS
            </span>
          </Link>

          <button
            onClick={toggleApplicationMenu}
            className="flex items-center justify-center w-10 h-10 text-gray-700 rounded-lg z-99999 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 lg:hidden"
          >
            <LuEllipsis size={24} />
          </button>

          <div className="hidden lg:block">
            <GlobalSearch />
          </div>
        </div>
        <div
          className={`${
            isApplicationMenuOpen ? "flex" : "hidden"
          } items-center justify-between w-full gap-4 px-5 py-4 lg:flex shadow-theme-md lg:justify-end lg:px-0 lg:shadow-none`}
        >
          <div className="flex items-center gap-2 2xsm:gap-3">
            {/* <!-- Dark Mode Toggler --> */}
            <ThemeToggleButton />
            {/* <!-- Dark Mode Toggler --> */}

            {/* <!-- Locale Switcher --> */}
            <LocaleSwitcher />
            {/* <!-- Locale Switcher --> */}

           <NotificationDropdown /> 
            {/* <!-- Notification Menu Area --> */}
          </div>
          {/* <!-- User Area --> */}
          <UserDropdown /> 
    
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
