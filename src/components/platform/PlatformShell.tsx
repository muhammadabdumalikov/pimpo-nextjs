"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LuLayoutDashboard, LuStore, LuLogOut } from "react-icons/lu";
import { getPlatformToken, removePlatformToken } from "@/lib/platformApi";

const NAV = [
  { href: "/platform", label: "Boshqaruv paneli", icon: LuLayoutDashboard, exact: true },
  { href: "/platform/businesses", label: "Do'konlar", icon: LuStore, exact: false },
];

/**
 * Chrome for the platform-admin console: a static sidebar + a client-side auth
 * gate. Unlike the tenant app there is no menuKey/tier filtering — a platform
 * admin sees everything. Redirects to /platform/login when the admin token is
 * missing (checked on mount and on every route change).
 */
export default function PlatformShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Nested function (mirrors the house ProtectedRoute pattern) so the token
    // check + state update aren't a bare setState in the effect body.
    const checkAuth = () => {
      if (!getPlatformToken()) {
        router.replace("/platform/login");
        return;
      }
      setReady(true);
    };
    checkAuth();
  }, [pathname, router]);

  const logout = () => {
    removePlatformToken();
    router.replace("/platform/login");
  };

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 xl:flex">
      {/* Sidebar */}
      <aside className="flex w-full shrink-0 flex-col border-b border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900 xl:h-screen xl:w-[260px] xl:border-b-0 xl:border-r xl:sticky xl:top-0">
        <div className="mb-6 flex items-center gap-2 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-lg font-bold text-white">
            P
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-gray-800 dark:text-white/90">Pimpo Admin</p>
            <p className="text-theme-xs text-gray-400">Platforma boshqaruvi</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-brand-50 text-brand-500 dark:bg-brand-500/[0.12] dark:text-brand-400"
                    : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/[0.03]"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={logout}
          className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/[0.03]"
        >
          <LuLogOut className="h-5 w-5" />
          Chiqish
        </button>
      </aside>

      {/* Main */}
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-(--breakpoint-2xl) p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
