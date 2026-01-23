"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getAuthToken } from "@/lib/api";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Public routes that don't require authentication
const publicRoutes = ["/signin", "/signup", "/reset-password"];

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const token = getAuthToken();
      const isPublicRoute = publicRoutes.some((route) => pathname?.startsWith(route));

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
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}
