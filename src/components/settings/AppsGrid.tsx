"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { RiTelegram2Fill } from "react-icons/ri";
import { LuSettings, LuSparkles, LuGlobe } from "react-icons/lu";
import { useTranslations } from "@/hooks/useTranslations";
import { useSubscription } from "@/context/SubscriptionContext";
import { useAuth } from "@/context/AuthContext";
import { isMenuVisible } from "@/data/menuPermissions";
import Badge from "@/components/ui/badge/Badge";
import { getAiSettings, getTelegramLinks, getCurrentUser } from "@/lib/api";

// The BiLLZ asset is a wide lockup (1576×438) — a square brand mark on the
// left, then the wordmark. Only the mark belongs on a 48px tile, and its
// rounded corners have WHITE baked in (the PNG has no alpha), so showing the
// bare 438px square would put white nubs on the tile corners. Cropping 36px
// further in lands inside the blue, so the tile reads as a solid colour square
// like the other three. Percentages (not pixels) so it holds at any tile size.
//
//   visible region = 366px of the original  →  438 − 2×36
const BILLZ_MARK: React.CSSProperties = {
  width: "430.6%", // 1576 / 366
  height: "119.7%", //  438 / 366
  left: "-9.84%", //   -36 / 366
  top: "-9.84%",
  maxWidth: "none", // beat the global img { max-width: 100% } reset
};

// Registry of integration apps shown on the grid. Add new entries here and a
// matching detail page under /settings/applications/<id>.
interface AppEntry {
  id: string;
  /** Brand names (Telegram, BiLLZ) stay verbatim; anything the shop reads as
   *  an ordinary noun is translated via `nameKey` instead. */
  name?: string;
  nameKey?: string;
  descriptionKey: string;
  href: string;
  icon: React.ReactNode;
  /** Show the connected/not-connected badge (apps with a live status). */
  hasStatus?: boolean;
  /** Menu id gating this app's detail page. Cards whose page MenuAccessGuard
   *  would bounce are hidden here, so the grid never offers a dead door.
   *  Apps with no entry (BiLLZ, AI) reach a page open to every tier. */
  menuId?: string;
}

const APPS: AppEntry[] = [
  {
    id: "telegram",
    name: "Telegram",
    descriptionKey: "integrations.telegramSubtitle",
    href: "/settings/applications/telegram",
    hasStatus: true,
    menuId: "settings.telegram",
    icon: (
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-light-50 text-blue-light-500 dark:bg-blue-light-500/10">
        <RiTelegram2Fill className="h-7 w-7" />
      </span>
    ),
  },
  {
    id: "billz",
    name: "BiLLZ",
    descriptionKey: "integrations.billz.subtitle",
    href: "/settings/applications/billz",
    icon: (
      <span className="relative block h-12 w-12 overflow-hidden rounded-xl">
        <Image
          src="/images/integrations/billz.png"
          alt=""
          aria-hidden
          width={1576}
          height={438}
          sizes="208px"
          className="absolute"
          style={BILLZ_MARK}
        />
      </span>
    ),
  },
  {
    id: "ai",
    name: "AI yordamchi",
    descriptionKey: "integrations.aiSubtitle",
    href: "/settings/applications/ai",
    hasStatus: true,
    icon: (
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
        <LuSparkles className="h-7 w-7" />
      </span>
    ),
  },
  {
    id: "online-store",
    nameKey: "onlineStore.title",
    // A one-line card subtitle, not the page's full paragraph.
    descriptionKey: "onlineStore.subtitle",
    href: "/settings/applications/online-store",
    hasStatus: true,
    menuId: "settings.onlineStore",
    icon: (
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400">
        <LuGlobe className="h-7 w-7" />
      </span>
    ),
  },
];

export default function AppsGrid() {
  const { t } = useTranslations();
  const { currentTier, isLoading: tierLoading } = useSubscription();
  const { hasMenuAccess } = useAuth();

  // Per-app connection status; undefined = still loading (skeleton shown).
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [statusLoaded, setStatusLoaded] = useState(false);

  // Same rules the sidebar and the route guard apply. While the tier is still
  // loading, show everything rather than flashing cards away and back.
  const visibleApps = useMemo(
    () =>
      APPS.filter(
        (app) =>
          tierLoading ||
          isMenuVisible(app.menuId ?? null, currentTier, hasMenuAccess),
      ),
    [currentTier, tierLoading, hasMenuAccess],
  );

  useEffect(() => {
    let active = true;
    (async () => {
      // Fetched independently (allSettled) so one failing doesn't hide the
      // other's badge — e.g. AI returns 403 on non-pro plans, which simply
      // shows as "not connected". Status is decorative on this page — the
      // detail pages surface real errors.
      const [tg, ai, me] = await Promise.allSettled([
        getTelegramLinks(),
        getAiSettings(),
        getCurrentUser(),
      ]);
      if (!active) return;
      setConnected({
        telegram: tg.status === "fulfilled" && tg.value.length > 0,
        ai: ai.status === "fulfilled" && ai.value.enabled && ai.value.hasKey,
        // "Connected" means the storefront is actually live: a slug alone is
        // just a reserved address until the switch is on.
        "online-store":
          me.status === "fulfilled" &&
          Boolean(me.value.business.storeEnabled) &&
          Boolean(me.value.business.storeSlug),
      });
      setStatusLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-fill overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-5 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="mb-6">
        <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
          {t("settingsPages.integrations.title")}
        </h3>
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">
          {t("settingsPages.integrations.description")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visibleApps.map((app) => (
          <Link
            key={app.id}
            href={app.href}
            className="group flex flex-col rounded-xl border border-gray-200 transition hover:border-brand-300 hover:shadow-theme-xs dark:border-gray-800 dark:hover:border-brand-500/40"
          >
            <div className="flex-1 p-4 sm:p-5">
              {app.icon}
              <h4 className="mt-4 font-semibold text-gray-800 dark:text-white/90">
                {app.nameKey ? t(app.nameKey) : app.name}
              </h4>
              <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
                {t(app.descriptionKey)}
              </p>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 dark:border-gray-800 sm:px-5">
              <span className="inline-flex items-center gap-2 text-theme-sm font-medium text-gray-500 transition-colors group-hover:text-brand-500 dark:text-gray-400 dark:group-hover:text-brand-400">
                <LuSettings className="h-4 w-4" />
                {t("integrations.manage")}
              </span>
              {app.hasStatus &&
                (statusLoaded ? (
                  connected[app.id] ? (
                    <Badge size="sm" color="success">
                      {t("integrations.statusConnected")}
                    </Badge>
                  ) : (
                    <Badge size="sm" color="light">
                      {t("integrations.statusNotConnected")}
                    </Badge>
                  )
                ) : (
                  <span className="h-5 w-20 animate-pulse rounded-full bg-gray-100 dark:bg-white/5" />
                ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
