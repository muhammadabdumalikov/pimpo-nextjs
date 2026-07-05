"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSubscription } from "@/context/SubscriptionContext";
import { useAuth } from "@/context/AuthContext";
import { getMenuIdFromPath, isMenuVisible } from "@/data/menuPermissions";

// Route-level enforcement of the same tier + role rules the sidebar uses to
// show/hide sections. A section that isn't permitted must not be *reachable*
// either: visiting it directly redirects to the dashboard instead of rendering
// the page (so it never flashes and never throws a permission error on click).
export default function MenuAccessGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentTier, isLoading } = useSubscription();
  const { hasMenuAccess } = useAuth();

  const menuId = getMenuIdFromPath(pathname ?? "");
  // Wait for the subscription to load before judging — otherwise the default
  // 'free' tier could wrongly block a paid user's page on first paint.
  const allowed = isLoading || isMenuVisible(menuId, currentTier, hasMenuAccess);
  // The dashboard is the redirect target, so never block it (avoids a loop).
  const blocked = !allowed && pathname !== "/dashboard";

  useEffect(() => {
    if (blocked) {
      router.replace("/dashboard");
    }
  }, [blocked, router]);

  if (blocked) return null;
  return <>{children}</>;
}
