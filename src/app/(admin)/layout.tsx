"use client";

import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import MenuAccessGuard from "@/components/auth/MenuAccessGuard";
import React from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Header visibility is toggled from the sidebar (next to the logo).
  const { isExpanded, isHovered, isMobileOpen, headerOpen } = useSidebar();

  // Dynamic class for main content margin based on sidebar state
  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[290px]"
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
        {/* Header (toggled from the sidebar gear). Always mounted and collapsed
            via an animated grid row so show/hide slides smoothly. */}
        <div
          className={`sticky top-0 z-99999 grid transition-all duration-300 ease-in-out ${
            headerOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <AppHeader />
          </div>
        </div>
        {/* Page Content */}
        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">
          <MenuAccessGuard>{children}</MenuAccessGuard>
        </div>
      </div>
    </div>
    </ProtectedRoute>
  );
}
