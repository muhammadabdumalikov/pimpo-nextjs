"use client";
import React, { createContext, useContext, useCallback, useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getAuthToken, removeAuthToken, clearAccount, getStoredAccount, setAccount as persistAccount, getCurrentUser, type AccountInfo } from "@/lib/api";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  account: AccountInfo | null;
  /** Allowed sidebar menu keys ("*" entry means full access). */
  menuKeys: string[];
  /** True if the acting account may see the given menu key. */
  hasMenuAccess: (menuKey: string) => boolean;
  /** Manually re-fetch the account + permissions from the backend. */
  refreshAccount: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Public routes that don't require authentication. "/" is the marketing landing
// and must match exactly (startsWith("/") would swallow every route).
const publicRoutes = ["/signin", "/signup", "/reset-password", "/terms", "/privacy"];
const isPublicPath = (pathname: string | null) =>
  pathname === "/" || publicRoutes.some((route) => pathname?.startsWith(route));

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Pull the latest account + permissions from the backend and keep the cache
  // (localStorage) + state in sync. Silently ignores failures — the cached
  // account stays in effect (getCurrentUser handles 401 → logout itself).
  // Exposed via context so screens can trigger a manual refresh on demand.
  const refreshAccount = useCallback(async () => {
    if (!getAuthToken()) return;
    try {
      const { account: fresh } = await getCurrentUser();
      persistAccount(fresh);
      setAccount(fresh);
    } catch {
      // offline / transient error — keep the cached account
    }
  }, []);

  // Auth gate: runs on mount and on every route change. Redirects unauthenticated
  // users off protected routes and hydrates the account from the local cache.
  // Does NOT hit the backend — that's the mount-only refresh below.
  useEffect(() => {
    const checkAuth = () => {
      const token = getAuthToken();
      const isPublicRoute = isPublicPath(pathname);

      if (!token && !isPublicRoute) {
        // No token and not on a public route - redirect to login
        router.push("/signin");
        setIsAuthenticated(false);
        setAccount(null);
      } else if (token) {
        setIsAuthenticated(true);
        setAccount(getStoredAccount());
      } else {
        setIsAuthenticated(false);
        setAccount(null);
      }
      setIsLoading(false);
    };

    checkAuth();

    // Listen for storage changes (e.g., when token is removed in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "accessToken" || e.key === "account") {
        checkAuth();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [pathname, router]);

  // Fetch fresh permissions/menuKeys from the backend once when the app opens
  // (this also covers a hard refresh, which remounts the provider). Manual
  // refreshes go through the exposed refreshAccount().
  useEffect(() => {
    void (async () => {
      await refreshAccount();
    })();
  }, [refreshAccount]);

  const logout = () => {
    removeAuthToken();
    clearAccount();
    setIsAuthenticated(false);
    setAccount(null);
    router.push("/signin");
  };

  // Owner accounts get ["*"]; absence of any stored account also implies the
  // owner (e.g. tokens issued before staff support) — fail open to full access.
  const menuKeys = account ? account.menuKeys : ["*"];
  const hasMenuAccess = (menuKey: string): boolean =>
    menuKeys.includes("*") || menuKeys.includes(menuKey);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isLoading, account, menuKeys, hasMenuAccess, refreshAccount, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
