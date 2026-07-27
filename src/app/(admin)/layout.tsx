"use client";

import { useSidebar } from "@/context/SidebarContext";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import MenuAccessGuard from "@/components/auth/MenuAccessGuard";
import React from "react";
import { LuMenu } from "react-icons/lu";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen, toggleMobileSidebar } =
    useSidebar();

  // Dynamic class for main content margin based on sidebar state
  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[272px]"
    : "lg:ml-[90px]";

  return (
    <ProtectedRoute>
    <div className="min-h-screen xl:flex">
      {/* Sidebar and Backdrop */}
      <AppSidebar />
      <Backdrop />
      {/* Main Content Area */}
      <div
        className={`min-w-0 flex-1 transition-all  duration-300 ease-in-out ${mainContentMargin}`}
      >
        {/* Page Content */}
        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">
          <MenuAccessGuard>{children}</MenuAccessGuard>
        </div>
      </div>

      {/* Mobile menu button. There is no app header anymore, so this floating
          button is the phone/tablet way into the sidebar. Bottom-left: thumb
          reachable and clear of content actions, which live bottom-right. z-30
          keeps it under every backdrop (z-40), so an open sidebar or drawer
          dims and covers it instead of floating on top. */}
      <button
        type="button"
        onClick={toggleMobileSidebar}
        aria-label="Menu"
        className="fixed bottom-5 left-5 z-30 flex h-13 w-13 items-center justify-center rounded-full bg-brand-500 text-white shadow-theme-lg transition hover:bg-brand-600 active:scale-95 lg:hidden"
      >
        <LuMenu size={24} />
      </button>
    </div>
    </ProtectedRoute>
  );
}
