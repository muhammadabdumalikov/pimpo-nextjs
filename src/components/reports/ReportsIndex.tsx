"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { LuLayoutGrid, LuArrowRight, LuLock } from "react-icons/lu";
import { useTranslations } from "@/hooks/useTranslations";
import {
  REPORTS,
  REPORT_CATEGORIES,
  CATEGORY_ACCENT,
  type ReportCategory,
  type ReportMeta,
} from "@/lib/reportsCatalog";
import { useSubscription } from "@/context/SubscriptionContext";
import {
  getMenuPermissions,
  getMenuIdFromPath,
} from "@/data/menuPermissions";
import {
  TIER_RANK,
  type SubscriptionTier,
} from "@/types/subscription";

type Tab = "all" | ReportCategory;

// Marketing name of the lowest tier that unlocks a menu id, or null if the
// current tier already has access. Drives the lock badge on gated report cards.
const TIER_LABEL: Record<SubscriptionTier, string> = {
  free: "Free",
  basic: "Standart",
  pro: "Biznes",
  proplus: "Biznes+",
};

function ReportCard({
  report,
  lockedTier,
}: {
  report: ReportMeta;
  lockedTier: SubscriptionTier | null;
}) {
  const { t } = useTranslations();
  const accent = CATEGORY_ACCENT[report.category];
  const Icon = report.icon;

  if (lockedTier) {
    return (
      <Link
        href="/upgrade-plan"
        className="group relative flex flex-col rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 transition duration-200 ease-out hover:border-brand-400 dark:border-gray-700 dark:bg-white/[0.02]"
      >
        <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-brand-500/10 px-2 py-0.5 text-xs font-medium text-brand-500">
          <LuLock size={12} />
          {TIER_LABEL[lockedTier]}
        </span>
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gray-200 text-gray-400 dark:bg-white/[0.06]">
          <Icon size={22} strokeWidth={1.9} />
        </div>
        <h4 className="mb-1.5 text-base font-semibold text-gray-500 dark:text-gray-400">
          {t(report.nameKey)}
        </h4>
        <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-gray-400 dark:text-gray-500">
          {t(report.descKey)}
        </p>
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-500">
          {t("reportsPage.upgradeToUnlock")}
          <LuArrowRight size={16} />
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={report.path}
      className={`group relative flex flex-col rounded-2xl border border-gray-200 bg-white p-5 transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-theme-md active:translate-y-0 dark:border-gray-800 dark:bg-white/[0.03] ${accent.hoverBorder}`}
    >
      <div
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${accent.tile}`}
      >
        <Icon size={22} strokeWidth={1.9} />
      </div>

      <h4 className="mb-1.5 text-base font-semibold text-gray-800 dark:text-white/90">
        {t(report.nameKey)}
      </h4>
      <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
        {t(report.descKey)}
      </p>

      <span
        className={`mt-4 inline-flex items-center gap-1.5 text-sm font-medium ${accent.link}`}
      >
        {t("reportsPage.openReport")}
        <LuArrowRight
          size={16}
          className="transition-transform duration-200 group-hover:translate-x-1"
        />
      </span>
    </Link>
  );
}

function CardGrid({
  items,
  lockedTierFor,
}: {
  items: ReportMeta[];
  lockedTierFor: (r: ReportMeta) => SubscriptionTier | null;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((r) => (
        <ReportCard key={r.id} report={r} lockedTier={lockedTierFor(r)} />
      ))}
    </div>
  );
}

export default function ReportsIndex() {
  const { t } = useTranslations();
  const [tab, setTab] = useState<Tab>("all");
  const { currentTier } = useSubscription();

  // For each report, the lowest tier that unlocks it — or null if the current
  // tier already qualifies. Gated cards render locked and point to /upgrade-plan.
  const lockedTierFor = useMemo(() => {
    const permissions = getMenuPermissions();
    return (r: ReportMeta): SubscriptionTier | null => {
      const menuId = getMenuIdFromPath(r.path);
      const perm = menuId
        ? permissions.find((p) => p.menuItem === menuId)
        : undefined;
      if (!perm || perm.allowedTiers.includes(currentTier)) return null;
      // Lowest-ranked tier that is allowed = the upgrade target to show.
      return perm.allowedTiers.reduce<SubscriptionTier | null>(
        (min, tier) =>
          min === null || TIER_RANK[tier] < TIER_RANK[min] ? tier : min,
        null,
      );
    };
  }, [currentTier]);

  const tabs: { key: Tab; label: string; count: number; icon?: React.ReactNode }[] = [
    {
      key: "all",
      label: t("reportsPage.allReports"),
      count: REPORTS.length,
      icon: <LuLayoutGrid size={15} />,
    },
    ...REPORT_CATEGORIES.map((c) => ({
      key: c.key as Tab,
      label: t(c.labelKey),
      count: REPORTS.filter((r) => r.category === c.key).length,
    })),
  ];

  return (
    <div className="space-y-7">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
          {t("reportsPage.title")}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
          {t("reportsPage.subtitle")}
        </p>
      </div>

      {/* Category segment control */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {tabs.map((tItem) => {
          const active = tab === tItem.key;
          return (
            <button
              key={tItem.key}
              onClick={() => setTab(tItem.key)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-brand-500 text-white shadow-theme-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/[0.04] dark:text-gray-300 dark:hover:bg-white/[0.08]"
              }`}
            >
              {tItem.icon}
              {tItem.label}
              <span
                className={`rounded-full px-1.5 text-xs tabular-nums ${
                  active
                    ? "bg-white/20 text-white"
                    : "bg-gray-200 text-gray-500 dark:bg-white/[0.08] dark:text-gray-400"
                }`}
              >
                {tItem.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {tab === "all" ? (
        <div className="space-y-8">
          {REPORT_CATEGORIES.map((cat) => {
            const items = REPORTS.filter((r) => r.category === cat.key);
            if (items.length === 0) return null;
            return (
              <section key={cat.key}>
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${CATEGORY_ACCENT[cat.key].link} bg-current`}
                  />
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {t(cat.labelKey)}
                  </h3>
                </div>
                <CardGrid items={items} lockedTierFor={lockedTierFor} />
              </section>
            );
          })}
        </div>
      ) : (
        <CardGrid
          items={REPORTS.filter((r) => r.category === tab)}
          lockedTierFor={lockedTierFor}
        />
      )}
    </div>
  );
}
