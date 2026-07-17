"use client";
import React, { useEffect, useState } from "react";
import { useSidebar } from "@/context/SidebarContext";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  /** Sticky action bar at the bottom (e.g. Cancel / Save buttons). */
  footer?: React.ReactNode;
  /** Panel width utility (default max-w-md). */
  widthClass?: string;
}

// BiLLZ-style slide-over drawer from the right. Starts below the app header
// (which is sticky at z-99999) so the header's bar stays visible above it —
// mirrors the sale-detail / checkout drawers. Closes on Escape / backdrop click.
export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  widthClass = "max-w-md",
}) => {
  const { headerOpen } = useSidebar();
  useBodyScrollLock(isOpen);

  // Measure the app header's bottom so the drawer opens beneath it (the header
  // sits at a higher z-index; without this it would cover the drawer's top).
  const [headerBottom, setHeaderBottom] = useState(0);
  useEffect(() => {
    if (!isOpen) return;
    const measure = () => {
      if (!headerOpen) {
        setHeaderBottom(0);
        return;
      }
      const header = document.querySelector("header");
      const bottom = header ? header.getBoundingClientRect().bottom : 0;
      setHeaderBottom(Math.max(0, Math.round(bottom)));
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      ro.disconnect();
    };
  }, [isOpen, headerOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop (below the header's z-index so the header stays visible) */}
      <div
        className={`fixed inset-0 z-40 bg-gray-900/50 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        style={{ top: headerBottom, height: `calc(100dvh - ${headerBottom}px)` }}
        className={`fixed right-0 z-50 flex w-full ${widthClass} flex-col bg-white shadow-theme-lg transition-transform duration-300 dark:bg-gray-900 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-6 py-5 dark:border-gray-800">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="×"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200 hover:text-gray-700 dark:bg-white/[0.06] dark:text-gray-400 dark:hover:bg-white/[0.1]"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-800">
            {footer}
          </div>
        )}
      </aside>
    </>
  );
};

export default Drawer;
