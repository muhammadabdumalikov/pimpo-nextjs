"use client";

import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import MenuAccessGuard from "@/components/auth/MenuAccessGuard";
import React, { useState } from "react";

const HEADER_OPEN_KEY = "kpos-header-open";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  // The top header can be tucked away (e.g. on the POS screen) to free up
  // vertical space; a small handle at the top edge brings it back. The
  // preference persists across sessions.
  // Lazy init from localStorage is hydration-safe here: ProtectedRoute renders
  // only a loading placeholder until its client-side auth check completes, so
  // this subtree never has server HTML to mismatch against.
  const [headerOpen, setHeaderOpen] = useState(
    () =>
      typeof window === "undefined" ||
      localStorage.getItem(HEADER_OPEN_KEY) !== "0",
  );
  const toggleHeader = () => {
    setHeaderOpen((v) => {
      localStorage.setItem(HEADER_OPEN_KEY, v ? "0" : "1");
      return !v;
    });
  };

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
        {/* Header */}
        {headerOpen && <AppHeader />}
        {/* Show/hide handle — a small tab pinned to the top edge */}
        <button
          type="button"
          onClick={toggleHeader}
          aria-label={headerOpen ? "Hide header" : "Show header"}
          className="fixed left-1/2 top-0 z-99999 flex h-6 w-14 -translate-x-1/2 items-center justify-center rounded-b-xl border border-t-0 border-gray-200 bg-white text-gray-400 shadow-theme-xs transition hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-500 dark:hover:text-gray-300"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`transition-transform duration-300 ${headerOpen ? "" : "rotate-180"}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m6 12 4-4 4 4" />
          </svg>
        </button>
        {/* Page Content */}
        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">
          <MenuAccessGuard>{children}</MenuAccessGuard>
        </div>
      </div>
    </div>
    </ProtectedRoute>
  );
}
