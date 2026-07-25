"use client";

import { usePathname } from "next/navigation";
import PlatformShell from "@/components/platform/PlatformShell";

/**
 * Route-group layout for the platform-admin console (/platform/*).
 *
 * The login page renders bare (no sidebar); every other route is wrapped in
 * PlatformShell, which enforces the admin-token gate. This group has its own
 * static auth and is marked public in AuthContext so the business-session
 * redirect never hijacks it.
 */
export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/platform/login") {
    return <>{children}</>;
  }

  return <PlatformShell>{children}</PlatformShell>;
}
