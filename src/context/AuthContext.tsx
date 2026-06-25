"use client";
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getAuthToken, removeAuthToken, clearAccount, getStoredAccount, type AccountInfo } from "@/lib/api";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  account: AccountInfo | null;
  /** Allowed sidebar menu keys ("*" entry means full access). */
  menuKeys: string[];
  /** True if the acting account may see the given menu key. */
  hasMenuAccess: (menuKey: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Public routes that don't require authentication
const publicRoutes = ["/signin", "/signup", "/reset-password"];

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = () => {
      const token = getAuthToken();
      const isPublicRoute = publicRoutes.some((route) => pathname?.startsWith(route));

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
      value={{ isAuthenticated, isLoading, account, menuKeys, hasMenuAccess, logout }}
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
