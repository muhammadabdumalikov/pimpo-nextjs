"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getAuthToken } from "@/lib/api";
import { useTranslations } from "@/hooks/useTranslations";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Public routes that don't require authentication. "/" is the marketing landing
// and must match exactly (startsWith("/") would swallow every route).
const publicRoutes = ["/signin", "/signup", "/reset-password"];
const isPublicPath = (pathname: string | null) =>
  pathname === "/" || publicRoutes.some((route) => pathname?.startsWith(route));

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { t } = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const token = getAuthToken();
      const isPublicRoute = isPublicPath(pathname);

      if (!token && !isPublicRoute) {
        // No token and not on a public route - redirect to login
        router.push("/signin");
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [pathname, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
      </div>
    );
  }

  return <>{children}</>;
}
