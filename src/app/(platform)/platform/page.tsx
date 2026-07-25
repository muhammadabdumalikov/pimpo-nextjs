"use client";
/* eslint-disable react/no-unescaped-entities -- this internal admin panel hardcodes Uzbek copy (with oʻ/gʻ apostrophes) rather than routing through i18n JSON */

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { LuStore, LuCircleCheck, LuBan, LuPackage } from "react-icons/lu";
import { getPlatformStats, type PlatformStats } from "@/lib/platformApi";

const TIER_LABEL: Record<string, string> = {
  free: "Bepul",
  basic: "Standard",
  pro: "Business",
  proplus: "Business+",
};

const TIER_STYLE: Record<string, string> = {
  free: "bg-gray-100 text-gray-600 dark:bg-white/[0.06] dark:text-gray-300",
  basic: "bg-blue-light-50 text-blue-light-600 dark:bg-blue-light-500/10 dark:text-blue-light-400",
  pro: "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400",
  proplus: "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400",
};

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
        {icon}
      </div>
      <p className="text-theme-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">{value}</p>
    </div>
  );
}

export default function PlatformDashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPlatformStats()
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : "Xatolik"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Boshqaruv paneli
          </h1>
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            Platforma bo'yicha umumiy ko'rsatkichlar
          </p>
        </div>
        <Link
          href="/platform/businesses"
          className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600"
        >
          Do'konlarni boshqarish
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
        </div>
      ) : error ? (
        <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          {error}
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={<LuStore className="h-5 w-5 text-brand-500" />}
              tone="bg-brand-50 dark:bg-brand-500/10"
              label="Jami do'konlar"
              value={stats.totalBusinesses}
            />
            <StatCard
              icon={<LuCircleCheck className="h-5 w-5 text-success-500" />}
              tone="bg-success-50 dark:bg-success-500/10"
              label="Faol"
              value={stats.activeBusinesses}
            />
            <StatCard
              icon={<LuBan className="h-5 w-5 text-error-500" />}
              tone="bg-error-50 dark:bg-error-500/10"
              label="Bloklangan"
              value={stats.blockedBusinesses}
            />
            <StatCard
              icon={<LuPackage className="h-5 w-5 text-blue-light-500" />}
              tone="bg-blue-light-50 dark:bg-blue-light-500/10"
              label="Jami tovarlar"
              value={stats.totalProducts.toLocaleString("uz-UZ")}
            />
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <h2 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white/90">
              Tariflar bo'yicha taqsimot
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(["free", "basic", "pro", "proplus"] as const).map((tier) => (
                <div
                  key={tier}
                  className="rounded-xl border border-gray-100 p-4 dark:border-gray-800/60"
                >
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-theme-xs font-medium ${TIER_STYLE[tier]}`}
                  >
                    {TIER_LABEL[tier]}
                  </span>
                  <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
                    {stats.byTier[tier]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
