"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { LuWallet, LuReceipt, LuBadgePercent, LuPhone } from "react-icons/lu";
import { useTranslations } from "@/hooks/useTranslations";
import { useAuth } from "@/context/AuthContext";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";
import { formatMoney, formatDate } from "@/lib/reportFormat";
import {
  getBillingInfo,
  getCurrentSubscription,
  type BillingInfo,
  type CurrentSubscription,
} from "@/lib/api";
import { SITE_CONTACT } from "@/lib/siteContact";

// Current-subscription status hero + billing details, shown above the plan
// comparison table on /subscription-management. Mirrors the BiLLZ "Tarif"
// page in KPOS's own visual language (see SOZLAMALAR.md §1.3).
export default function SubscriptionStatus() {
  const { t } = useTranslations();
  const { account } = useAuth();
  const [sub, setSub] = useState<CurrentSubscription | null>(null);
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [topUpOpen, setTopUpOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, b] = await Promise.all([
          getCurrentSubscription(),
          getBillingInfo(),
        ]);
        if (!cancelled) {
          setSub(s);
          setBilling(b);
        }
      } catch {
        // Status hero is progressive enhancement over the comparison table —
        // on fetch failure just stay hidden instead of blocking the page.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white py-12 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
      </div>
    );
  }
  if (!sub || !billing) return null;

  const som = t("upgradePlan.som");
  const isPaid = sub.tier !== "free";
  const status: "active" | "trial" | "expired" | "none" = !isPaid
    ? sub.isExpired
      ? "expired"
      : "none"
    : sub.isTrial
      ? "trial"
      : "active";

  const statusStyles: Record<typeof status, string> = {
    active:
      "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500",
    trial:
      "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-500",
    expired:
      "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500",
    none: "bg-gray-100 text-gray-500 dark:bg-white/[0.06] dark:text-gray-400",
  };

  const planLabel = isPaid
    ? t(`upgradePlan.${sub.tier}`)
    : t("subscriptionStatus.noPlan");

  const infoRows: { label: string; value: React.ReactNode }[] = [
    {
      label: t("subscriptionStatus.legalName"),
      value: billing.legalName || account?.name || "—",
    },
    { label: t("subscriptionStatus.inn"), value: billing.inn || "—" },
    {
      label: t("subscriptionStatus.contractNumber"),
      value: billing.contractNumber || "—",
    },
    {
      label: t("subscriptionStatus.contractDate"),
      value: billing.contractDate ? formatDate(billing.contractDate) : "—",
    },
  ];

  const m = billing.monthly;

  return (
    <div className="space-y-6">
      {/* Hero: current plan + status on the left, balance + top-up on the right */}
      <div className="rounded-2xl border border-gray-200 bg-white px-4 py-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1.5 text-theme-xs font-medium uppercase tracking-wide text-gray-400">
              {t("subscriptionStatus.currentPlan")}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white/90">
                {planLabel}
              </h2>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-theme-xs font-medium ${statusStyles[status]}`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {t(`subscriptionStatus.status.${status}`)}
              </span>
            </div>
            <p className="mt-1.5 text-theme-sm text-gray-500 dark:text-gray-400">
              {sub.endDate ? (
                <>
                  {t("subscriptionStatus.activeUntil")}{" "}
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {formatDate(sub.endDate)}
                  </span>
                </>
              ) : isPaid ? (
                t("subscriptionStatus.noEndDate")
              ) : (
                t("subscriptionStatus.pickPlanHint")
              )}
            </p>
          </div>

          <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-2">
            <div className="sm:text-right">
              <p className="mb-0.5 flex items-center gap-1.5 text-theme-xs font-medium uppercase tracking-wide text-gray-400 sm:justify-end">
                <LuWallet size={14} />
                {t("subscriptionStatus.balance")}
              </p>
              <p className="text-xl font-bold tabular-nums text-gray-800 dark:text-white/90">
                {formatMoney(billing.balance, som)}
              </p>
            </div>
            <Button size="sm" onClick={() => setTopUpOpen(true)}>
              {t("subscriptionStatus.topUp")}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Account / legal details */}
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("subscriptionStatus.accountInfo")}
          </h3>
          <dl>
            {infoRows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-4 border-b border-gray-100 py-3 last:border-b-0 dark:border-gray-800/60"
              >
                <dt className="text-theme-sm text-gray-500 dark:text-gray-400">
                  {row.label}
                </dt>
                <dd className="text-right text-theme-sm font-medium text-gray-800 dark:text-white/90">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
          <Link
            href="/terms"
            target="_blank"
            className="mt-4 inline-flex items-center gap-1.5 text-theme-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
          >
            {t("subscriptionStatus.offer")} →
          </Link>
        </div>

        {/* Monthly payment breakdown + active discounts */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-white/90">
                <LuReceipt size={18} className="text-gray-400" />
                {t("subscriptionStatus.monthly")}
              </h3>
              <span className="text-xl font-bold tabular-nums text-brand-500 dark:text-brand-400">
                {formatMoney(m.total, som)}
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between gap-4 border-b border-gray-100 py-3 dark:border-gray-800/60">
                <span className="text-theme-sm text-gray-500 dark:text-gray-400">
                  {t("subscriptionStatus.planLine")}
                  {m.planName ? ` — ${planLabel}` : ""}
                </span>
                <span className="text-theme-sm font-medium tabular-nums text-gray-800 dark:text-white/90">
                  {formatMoney(m.planPrice, som)}
                </span>
              </div>
              {m.extraBranches > 0 && (
                <div className="flex items-center justify-between gap-4 border-b border-gray-100 py-3 dark:border-gray-800/60">
                  <span className="text-theme-sm text-gray-500 dark:text-gray-400">
                    {t("subscriptionStatus.extraBranches")} ×{m.extraBranches}
                  </span>
                  <span className="text-theme-sm font-medium tabular-nums text-gray-800 dark:text-white/90">
                    {formatMoney(m.extraBranchesTotal, som)}
                  </span>
                </div>
              )}
              {m.discountPercent > 0 && (
                <div className="flex items-center justify-between gap-4 py-3">
                  <span className="text-theme-sm text-gray-500 dark:text-gray-400">
                    {t("subscriptionStatus.discount")} −{m.discountPercent}%
                  </span>
                  <span className="text-theme-sm font-medium tabular-nums text-success-600 dark:text-success-500">
                    −{formatMoney(m.discountAmount, som)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {billing.discounts.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-white/90">
                <LuBadgePercent size={18} className="text-success-500" />
                {t("subscriptionStatus.activeDiscounts")}
              </h3>
              <ul className="space-y-3">
                {billing.discounts.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-4"
                  >
                    <div>
                      <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                        {d.label}
                      </p>
                      {d.validUntil && (
                        <p className="text-theme-xs text-gray-400">
                          {t("subscriptionStatus.validUntil")}{" "}
                          {formatDate(d.validUntil)}
                        </p>
                      )}
                    </div>
                    <span className="rounded-full bg-success-50 px-2.5 py-0.5 text-theme-xs font-medium text-success-600 dark:bg-success-500/15 dark:text-success-500">
                      −{d.percent}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Top-up: no payment provider wired yet — show the manual channel */}
      <Modal
        isOpen={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        className="max-w-md p-6"
      >
        <h3 className="mb-2 pr-10 text-lg font-semibold text-gray-800 dark:text-white/90">
          {t("subscriptionStatus.topUpTitle")}
        </h3>
        <p className="mb-4 text-theme-sm text-gray-500 dark:text-gray-400">
          {t("subscriptionStatus.topUpHint")}
        </p>
        {SITE_CONTACT.phone && (
          <a
            href={`tel:${SITE_CONTACT.phone.replace(/\s/g, "")}`}
            className="mb-5 inline-flex items-center gap-2 text-theme-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
          >
            <LuPhone size={16} />
            {SITE_CONTACT.phone}
          </a>
        )}
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={() => setTopUpOpen(false)}>
            {t("subscriptionStatus.close")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
