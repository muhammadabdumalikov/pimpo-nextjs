"use client";
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getAuthToken, removeAuthToken } from "@/lib/api";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Public routes that don't require authentication
const publicRoutes = ["/signin", "/signup", "/reset-password"];

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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
      } else if (token) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    };

    checkAuth();

    // Listen for storage changes (e.g., when token is removed in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "accessToken") {
        checkAuth();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [pathname, router]);

  const logout = () => {
    removeAuthToken();
    setIsAuthenticated(false);
    router.push("/signin");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, logout }}>
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
