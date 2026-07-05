"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "@/hooks/useTranslations";
import LandingHeader from "./LandingHeader";
import {
  ArrowIcon,
  CheckIcon,
  ChevronIcon,
  featureIcons,
} from "./icons";

const FEATURES: {
  icon: keyof typeof featureIcons;
  key: string;
  highlight?: boolean;
}[] = [
  { icon: "credit", key: "credit", highlight: true },
  { icon: "pos", key: "pos" },
  { icon: "box", key: "inventory" },
  { icon: "chart", key: "reports" },
  { icon: "truck", key: "suppliers" },
  { icon: "team", key: "team" },
];

const PLANS = [
  { id: "free", accent: false, popular: false },
  { id: "basic", accent: true, popular: true },
  { id: "pro", accent: false, popular: false },
] as const;

const STATS = ["install", "credit", "trial"] as const;
const FAQ_KEYS = ["free", "install", "credit", "branches", "data"] as const;

export default function LandingPage() {
  const { t } = useTranslations();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // t() returns the raw JSON value; feature/plan lists are stored as arrays.
  const list = (key: string): string[] => {
    const value = t(key) as unknown;
    return Array.isArray(value) ? (value as string[]) : [];
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-white">
      <LandingHeader />

      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-28">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(70,95,255,0.12),transparent_70%)]"
        />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white sm:text-5xl lg:text-6xl">
              {t("landing.hero.title")}{" "}
              <span className="text-brand-500">{t("landing.hero.titleHighlight")}</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 dark:text-gray-300">
              {t("landing.hero.subtitle")}
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-7 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 sm:w-auto"
              >
                {t("landing.hero.ctaPrimary")}
                <ArrowIcon />
              </Link>
              <a
                href="#pricing"
                className="inline-flex w-full items-center justify-center rounded-full border border-gray-300 px-7 py-3.5 text-base font-semibold text-gray-800 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-white/5 sm:w-auto"
              >
                {t("landing.hero.ctaSecondary")}
              </a>
            </div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              {t("landing.hero.note")}
            </p>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-16 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3">
            {STATS.map((s) => (
              <div
                key={s}
                className="rounded-2xl border border-gray-200 bg-gray-50/60 p-6 text-center dark:border-gray-800 dark:bg-white/[0.03]"
              >
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {t(`landing.stats.${s}.value`)}
                </div>
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {t(`landing.stats.${s}.label`)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Features ===== */}
      <section id="features" className="scroll-mt-20 border-t border-gray-100 bg-gray-50/50 py-20 dark:border-gray-800/60 dark:bg-transparent sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              {t("landing.features.title")}
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              {t("landing.features.subtitle")}
            </p>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = featureIcons[f.icon];
              return (
                <div
                  key={f.key}
                  className={`group relative rounded-2xl border p-7 transition-shadow hover:shadow-lg ${
                    f.highlight
                      ? "border-brand-200 bg-brand-50/60 dark:border-brand-500/30 dark:bg-brand-500/[0.06]"
                      : "border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]"
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                      f.highlight
                        ? "bg-brand-500 text-white"
                        : "bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400"
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                    {t(`landing.features.${f.key}.title`)}
                    {f.highlight && (
                      <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                        {t("landing.features.badge")}
                      </span>
                    )}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                    {t(`landing.features.${f.key}.desc`)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== Differentiator (Nasiya) ===== */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-3xl bg-brand-950 px-6 py-14 sm:px-14 sm:py-16">
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-brand-200">
                  {t("landing.diff.badge")}
                </span>
                <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  {t("landing.diff.title")}
                </h2>
                <p className="mt-4 text-lg text-brand-100/80">
                  {t("landing.diff.desc")}
                </p>
                <Link
                  href="/signup"
                  className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-base font-semibold text-brand-700 transition-colors hover:bg-brand-50"
                >
                  {t("landing.diff.cta")}
                  <ArrowIcon />
                </Link>
              </div>
              <ul className="space-y-4">
                {list("landing.diff.points").map((point, i) => (
                  <li key={i} className="flex items-start gap-3 rounded-2xl bg-white/[0.06] p-4">
                    <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-brand-500 text-white">
                      <CheckIcon className="h-4 w-4" />
                    </span>
                    <span className="text-brand-50">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Pricing ===== */}
      <section id="pricing" className="scroll-mt-20 border-t border-gray-100 bg-gray-50/50 py-20 dark:border-gray-800/60 dark:bg-transparent sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              {t("landing.pricing.title")}
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              {t("landing.pricing.subtitle")}
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-3xl border p-8 ${
                  plan.accent
                    ? "border-brand-500 bg-white shadow-xl ring-1 ring-brand-500/20 dark:bg-white/[0.03]"
                    : "border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                    {t("landing.pricing.popular")}
                  </span>
                )}
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t(`landing.pricing.${plan.id}.name`)}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t(`landing.pricing.${plan.id}.desc`)}
                </p>
                <div className="mt-6 flex items-end gap-1.5">
                  <span className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
                    {t(`landing.pricing.${plan.id}.price`)}
                  </span>
                  <span className="mb-1 text-sm text-gray-500 dark:text-gray-400">
                    {t(`landing.pricing.${plan.id}.period`)}
                  </span>
                </div>
                <Link
                  href="/signup"
                  className={`mt-6 inline-flex w-full items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-colors ${
                    plan.accent
                      ? "bg-brand-500 text-white hover:bg-brand-600"
                      : "border border-gray-300 text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-white/5"
                  }`}
                >
                  {t(`landing.pricing.${plan.id}.cta`)}
                </Link>
                <ul className="mt-8 space-y-3.5">
                  {list(`landing.pricing.${plan.id}.features`).map((feat, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                      <CheckIcon className="mt-0.5 h-5 w-5 flex-none text-brand-500" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="mt-10 text-center text-sm text-gray-500 dark:text-gray-400">
            {t("landing.pricing.annualNote")}
          </p>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="scroll-mt-20 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              {t("landing.faq.title")}
            </h2>
          </div>
          <div className="mt-12 divide-y divide-gray-200 dark:divide-gray-800">
            {FAQ_KEYS.map((key, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={key} className="py-2">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-4 py-4 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="text-base font-medium text-gray-900 dark:text-white">
                      {t(`landing.faq.${key}.q`)}
                    </span>
                    <ChevronIcon
                      className={`h-5 w-5 flex-none text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isOpen && (
                    <p className="pb-5 pr-8 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                      {t(`landing.faq.${key}.a`)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== CTA band ===== */}
      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 px-6 py-14 text-center sm:py-16">
          <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {t("landing.cta.title")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-brand-50/90">
            {t("landing.cta.subtitle")}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-base font-semibold text-brand-700 transition-colors hover:bg-brand-50 sm:w-auto"
            >
              {t("landing.cta.primary")}
              <ArrowIcon />
            </Link>
            <Link
              href="/signin"
              className="inline-flex w-full items-center justify-center rounded-full border border-white/40 px-7 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto"
            >
              {t("landing.cta.secondary")}
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-gray-200 py-10 dark:border-gray-800">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 md:flex-row">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-brand-500">KPOS</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t("landing.footer.tagline")}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("landing.footer.rights")}
          </p>
        </div>
      </footer>
    </div>
  );
}
