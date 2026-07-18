"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "@/hooks/useTranslations";
import LandingHeader from "./LandingHeader";
import PricingCompare from "./PricingCompare";
import Reveal from "./Reveal";
import HeroPreview from "./HeroPreview";
import { ArrowIcon, CheckIcon, ChevronIcon, featureIcons } from "./icons";

// Design identity: a light canvas punctuated by indigo "ledger-blocks" (hero,
// credit cell, diff, CTA). Money is set in mono numerals; one live ledger
// marquee. Radius (locked): buttons = pill, cards/panels = 2xl, inner = xl.
// Accent (locked): brand indigo #465fff only.

const FEATURES: {
  icon: keyof typeof featureIcons;
  key: string;
  variant: "hero" | "chart" | "tint" | "plain";
}[] = [
  { icon: "pos", key: "pos", variant: "hero" },
  { icon: "credit", key: "credit", variant: "tint" },
  { icon: "box", key: "inventory", variant: "plain" },
  { icon: "chart", key: "reports", variant: "chart" },
  { icon: "truck", key: "suppliers", variant: "plain" },
  { icon: "team", key: "team", variant: "plain" },
];

// Neutral checkout mini-visual for the large POS feature cell (brand product
// names; illustrative prices in so'm).
const SALE = [
  { name: "Coca-Cola 1.5L", price: "12 000" },
  { name: "Nescafé Gold 250g", price: "34 000" },
];
const SALE_TOTAL = "46 000";

const PLANS: {
  id: string;
  accent: boolean;
  popular: boolean;
  freeFirstMonth?: boolean;
}[] = [
  { id: "basic", accent: false, popular: false, freeFirstMonth: true },
  { id: "pro", accent: true, popular: true },
  { id: "proplus", accent: false, popular: false },
];

// Operational layer shipped since launch — rendered as a framed hairline matrix
// (deliberately not the bento card family used above).
const OPS: { key: string; icon: keyof typeof featureIcons }[] = [
  { key: "shift", icon: "shift" },
  { key: "finance", icon: "wallet" },
  { key: "stocktake", icon: "clipboard" },
  { key: "offline", icon: "cloud" },
  { key: "currency", icon: "exchange" },
  { key: "returns", icon: "undo" },
];

const STATS = ["install", "credit", "trial"] as const;
const FAQ_KEYS = ["free", "install", "credit", "branches", "data"] as const;
const CHART_BARS = [42, 60, 48, 78, 64, 92, 74];
const YEARLY_DISCOUNT = 0.2; // 20% off when billed annually

// Space-grouped integer, e.g. 79200 -> "79 200".
const nf = (n: number) => n.toLocaleString("en-US").replace(/,/g, " ");


export default function LandingPage() {
  const { t } = useTranslations();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [yearly, setYearly] = useState(false);

  // t() returns the raw JSON value; feature/plan lists are stored as arrays.
  const list = (key: string): string[] => {
    const value = t(key) as unknown;
    return Array.isArray(value) ? (value as string[]) : [];
  };

  // Copy is preserved from i18n; strip the trailing em/en dash so the headline
  // reads clean (em-dash is not used as a design element).
  const heroTitle = String(t("landing.hero.title")).replace(/\s*[—–]\s*$/, "");
  const audience = list("landing.audience.items");

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-white">
      <LandingHeader />

      {/* ===== Hero (dark editorial ledger-block) ===== */}
      <section className="relative overflow-hidden bg-brand-950 text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 right-0 h-[520px] w-[820px] rounded-full bg-brand-500/20 blur-[120px]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:52px_52px] [mask-image:radial-gradient(80%_60%_at_50%_0%,black,transparent)]" />
        </div>

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pt-24 pb-0 sm:px-6 lg:grid-cols-12 lg:gap-8 lg:px-8">
          {/* Left: copy */}
          <div className="lg:col-span-7">
            <Reveal>
              <h1 className="text-[2.6rem] font-extrabold leading-[1.02] tracking-tight sm:text-6xl lg:text-[4.2rem]">
                {heroTitle}{" "}
                <span className="relative inline-block">
                  <span
                    aria-hidden
                    className="absolute inset-x-[-0.06em] bottom-[0.06em] top-[0.5em] -z-0 -skew-x-6 rounded-[2px] bg-brand-500/40"
                  />
                  <span className="relative text-white">{t("landing.hero.titleHighlight")}</span>
                </span>
              </h1>
            </Reveal>
            <Reveal delay={120}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-brand-100/70">
                {t("landing.hero.subtitle")}
              </p>
            </Reveal>
            <Reveal delay={180}>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-base font-semibold text-brand-700 shadow-lg shadow-brand-950/30 transition-all hover:bg-brand-50 active:translate-y-px"
                >
                  {t("landing.hero.ctaPrimary")}
                  <ArrowIcon />
                </Link>
                <a
                  href="#pricing"
                  className="inline-flex items-center justify-center rounded-full border border-white/25 px-7 py-3.5 text-base font-semibold text-white transition-all hover:bg-white/10 active:translate-y-px"
                >
                  {t("landing.hero.ctaSecondary")}
                </a>
              </div>
            </Reveal>
          </div>

          {/* Right: layered live ledger preview */}
          <div className="lg:col-span-5">
            <Reveal delay={220}>
              <HeroPreview t={t} />
            </Reveal>
          </div>
        </div>

        {/* "Built for every kind of shop" marquee (the page's single marquee) */}
        <div className="landing-marquee relative mt-16 flex overflow-hidden border-t border-white/10 py-5">
          <div className="landing-marquee-track flex w-max shrink-0 items-center">
            {[...audience, ...audience].map((label, i) => (
              <span
                key={i}
                className="mx-2 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.04] px-5 py-2 text-sm font-medium text-white/70"
              >
                {label}
              </span>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-brand-950 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-brand-950 to-transparent" />
        </div>
      </section>

      {/* ===== Trust strip (stats, divided — not cards) ===== */}
      <section className="border-b border-gray-100 bg-white py-10 dark:border-gray-800/60 dark:bg-gray-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 divide-y divide-gray-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0 dark:divide-gray-800">
            {STATS.map((s) => (
              <div key={s} className="px-2 py-4 text-center sm:py-1">
                <div className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                  {t(`landing.stats.${s}.value`)}
                </div>
                <div className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">
                  {t(`landing.stats.${s}.label`)}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            {t("landing.hero.note")}
          </p>
        </div>
      </section>

      {/* ===== Features (bento, editorial left header) ===== */}
      <section id="features" className="scroll-mt-20 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="max-w-2xl">
            <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-[2.6rem] sm:leading-[1.1]">
              {t("landing.features.title")}
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              {t("landing.features.subtitle")}
            </p>
          </Reveal>

          <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:auto-rows-fr lg:grid-cols-3">
            {FEATURES.map((f, i) => {
              const Icon = featureIcons[f.icon];

              if (f.variant === "hero") {
                return (
                  <Reveal key={f.key} delay={i * 50} className="lg:col-span-2 lg:row-span-2">
                    <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-brand-950 p-8 text-white">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500 text-white">
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="mt-6 text-xl font-bold">
                        {t(`landing.features.${f.key}.title`)}
                      </h3>
                      <p className="mt-3 max-w-md text-base leading-relaxed text-brand-100/80">
                        {t(`landing.features.${f.key}.desc`)}
                      </p>
                      <div className="mt-auto grid gap-2 pt-8">
                        {SALE.map((s) => (
                          <div
                            key={s.name}
                            className="flex items-center justify-between rounded-xl bg-white/[0.06] px-4 py-3"
                          >
                            <span className="text-sm font-medium text-brand-50">{s.name}</span>
                            <span className="font-mono text-sm tabular-nums text-white">
                              {s.price}
                            </span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between px-4 pt-1">
                          <span className="text-sm text-brand-100/70">
                            {t("landing.heroPreview.total")}
                          </span>
                          <span className="font-mono text-base font-semibold tabular-nums text-white">
                            {SALE_TOTAL}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Reveal>
                );
              }

              if (f.variant === "chart") {
                return (
                  <Reveal key={f.key} delay={i * 50} className="h-full">
                    <div className="flex h-full flex-col rounded-2xl border border-brand-100 bg-brand-50/50 p-7 dark:border-brand-500/20 dark:bg-brand-500/[0.05]">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-5 text-lg font-semibold text-gray-900 dark:text-white">
                        {t(`landing.features.${f.key}.title`)}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                        {t(`landing.features.${f.key}.desc`)}
                      </p>
                      <div className="mt-auto flex h-16 items-end gap-1.5 pt-6" aria-hidden>
                        {CHART_BARS.map((h, j) => (
                          <div
                            key={j}
                            className="flex-1 rounded-sm bg-brand-500/70"
                            style={{ height: `${h}%` }}
                          />
                        ))}
                      </div>
                    </div>
                  </Reveal>
                );
              }

              const tinted = f.variant === "tint";
              return (
                <Reveal key={f.key} delay={i * 50} className="h-full">
                  <div
                    className={`flex h-full flex-col rounded-2xl border p-7 transition-shadow hover:shadow-md dark:hover:shadow-none ${
                      tinted
                        ? "border-brand-100 bg-brand-50/50 dark:border-brand-500/20 dark:bg-brand-500/[0.05]"
                        : "border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 text-lg font-semibold text-gray-900 dark:text-white">
                      {t(`landing.features.${f.key}.title`)}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                      {t(`landing.features.${f.key}.desc`)}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== Operational layer (framed hairline matrix — not the bento) ===== */}
      <section className="scroll-mt-20 border-t border-gray-100 py-20 dark:border-gray-800/60 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="max-w-2xl">
            <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-[2.6rem] sm:leading-[1.1]">
              {t("landing.ops.title")}
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              {t("landing.ops.subtitle")}
            </p>
          </Reveal>

          <Reveal className="mt-12">
            {/* One framed panel; 1px gap over a tinted bg draws the hairlines. */}
            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-gray-200 bg-gray-200 sm:grid-cols-2 lg:grid-cols-3 dark:border-gray-800 dark:bg-gray-800">
              {OPS.map((o) => {
                const Icon = featureIcons[o.icon];
                return (
                  <div
                    key={o.key}
                    className="flex gap-4 bg-white p-7 dark:bg-gray-950"
                  >
                    <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                        {t(`landing.ops.${o.key}.title`)}
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                        {t(`landing.ops.${o.key}.desc`)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== Differentiator (Nasiya ledger-block) ===== */}
      <section className="pb-20 sm:pb-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="relative overflow-hidden rounded-2xl bg-brand-950 px-6 py-14 sm:px-14 sm:py-16">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand-500/20 blur-[90px]"
              />
              <div className="relative grid items-center gap-10 lg:grid-cols-2">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-brand-200">
                    {t("landing.diff.badge")}
                  </span>
                  <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                    {t("landing.diff.title")}
                  </h2>
                  <p className="mt-4 text-lg leading-relaxed text-brand-100/80">
                    {t("landing.diff.desc")}
                  </p>
                  <Link
                    href="/signup"
                    className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-base font-semibold text-brand-700 transition-all hover:bg-brand-50 active:translate-y-px"
                  >
                    {t("landing.diff.cta")}
                    <ArrowIcon />
                  </Link>
                </div>
                <ul className="grid gap-3">
                  {list("landing.diff.points").map((point, i) => (
                    <li key={i} className="flex items-start gap-3 rounded-xl bg-white/[0.06] p-4">
                      <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-brand-500 text-white">
                        <CheckIcon className="h-4 w-4" />
                      </span>
                      <span className="text-brand-50">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== Pricing ===== */}
      <section
        id="pricing"
        className="scroll-mt-20 border-t border-gray-100 bg-gray-50/50 py-20 dark:border-gray-800/60 dark:bg-white/[0.02] sm:py-28"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              {t("landing.pricing.title")}
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              {t("landing.pricing.subtitle")}
            </p>
          </Reveal>

          {/* Monthly / yearly billing toggle (-20% on yearly) */}
          <div className="mt-8 flex justify-center">
            <div
              role="tablist"
              aria-label={t("landing.pricing.title")}
              className="inline-flex items-center rounded-full border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-white/[0.03]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={!yearly}
                onClick={() => setYearly(false)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  !yearly
                    ? "bg-brand-500 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                }`}
              >
                {t("landing.pricing.billing.monthly")}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={yearly}
                onClick={() => setYearly(true)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  yearly
                    ? "bg-brand-500 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                }`}
              >
                {t("landing.pricing.billing.yearly")}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    yearly
                      ? "bg-white/20 text-white"
                      : "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"
                  }`}
                >
                  -20%
                </span>
              </button>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {PLANS.map((plan, i) => (
              <Reveal key={plan.id} delay={i * 70} className="h-full">
                <div
                  className={`relative flex h-full flex-col rounded-2xl border p-8 ${
                    plan.accent
                      ? "border-brand-500 bg-white shadow-xl ring-1 ring-brand-500/20 dark:bg-white/[0.04] lg:-mt-4 lg:pb-12"
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
                  {(() => {
                    const rawPrice = String(t(`landing.pricing.${plan.id}.price`));
                    const introRaw = String(t(`landing.pricing.${plan.id}.introPrice`));
                    const monthly = Number(rawPrice.replace(/\D/g, ""));
                    const intro = Number(introRaw.replace(/\D/g, ""));
                    const paid = monthly > 0;
                    // First 2 months at the intro price (monthly billing only);
                    // yearly keeps its own −20% treatment so they never stack.
                    const introActive = paid && intro > 0 && intro < monthly && !yearly;
                    const shown = introActive
                      ? intro
                      : paid && yearly
                        ? Math.round(monthly * (1 - YEARLY_DISCOUNT))
                        : monthly;
                    // First month free is a standing offer on the entry plan.
                    const freeMonth = Boolean(plan.freeFirstMonth) && !yearly;
                    return (
                      <>
                        <div className="mt-6 flex items-end gap-1.5">
                          <span
                            className={`text-4xl font-extrabold tabular-nums tracking-tight ${
                              freeMonth
                                ? "text-brand-600 dark:text-brand-400"
                                : "text-gray-900 dark:text-white"
                            }`}
                          >
                            {freeMonth
                              ? t("landing.pricing.promo.free")
                              : paid
                                ? nf(shown)
                                : rawPrice}
                          </span>
                          {!freeMonth && (
                            <div className="mb-1 flex flex-col leading-tight">
                              {introActive && (
                                <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">
                                  {t("landing.pricing.promo.intro")}
                                </span>
                              )}
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {t(`landing.pricing.${plan.id}.period`)}
                              </span>
                            </div>
                          )}
                        </div>
                        {freeMonth && (
                          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                            <span className="font-medium text-brand-600 dark:text-brand-400">
                              {t("landing.pricing.promo.fromMonth2")}
                            </span>{" "}
                            · {nf(monthly)} {t("landing.pricing.promo.perMonth")}
                          </p>
                        )}
                        {introActive && (
                          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                            {t("landing.pricing.promo.then")} {nf(monthly)}{" "}
                            {t("landing.pricing.promo.perMonth")}
                          </p>
                        )}
                        {paid && yearly && (
                          <div className="mt-1.5 flex items-center gap-2 text-sm">
                            <span className="text-gray-400 line-through dark:text-gray-500">
                              {nf(monthly)} {t("landing.pricing.promo.perMonth")}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">
                              {t("landing.pricing.billing.perYear")}
                            </span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                  <Link
                    href="/signup"
                    className={`mt-6 inline-flex w-full items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-all active:translate-y-px ${
                      plan.accent
                        ? "bg-brand-500 text-white hover:bg-brand-600"
                        : "border border-gray-300 text-gray-800 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-white/5"
                    }`}
                  >
                    {t(`landing.pricing.${plan.id}.cta`)}
                  </Link>
                  <ul className="mt-8 grid gap-3.5">
                    {list(`landing.pricing.${plan.id}.features`).map((feat, j) => (
                      <li
                        key={j}
                        className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300"
                      >
                        <CheckIcon className="mt-0.5 h-5 w-5 flex-none text-brand-500" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>

          <p className="mt-10 text-center text-sm text-gray-500 dark:text-gray-400">
            {t("landing.pricing.annualNote")}
          </p>

          <PricingCompare />
        </div>
      </section>

      {/* ===== FAQ (editorial left header) ===== */}
      <section id="faq" className="scroll-mt-20 py-20 sm:py-28">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:gap-16 lg:px-8">
          <Reveal className="lg:col-span-4">
            <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              {t("landing.faq.title")}
            </h2>
          </Reveal>
          <div className="lg:col-span-8">
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
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
                        className={`h-5 w-5 flex-none text-gray-400 transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    <div
                      className={`grid transition-all duration-300 ease-out ${
                        isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <p className="pb-5 pr-8 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                          {t(`landing.faq.${key}.a`)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA band ===== */}
      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-7xl">
          <div className="relative overflow-hidden rounded-2xl bg-brand-950 px-6 py-14 text-center sm:py-16">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-brand-500/20 blur-[90px]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-brand-500/15 blur-[90px]"
            />
            <h2 className="relative mx-auto max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {t("landing.cta.title")}
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-lg text-brand-50/90">
              {t("landing.cta.subtitle")}
            </p>
            <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-base font-semibold text-brand-700 transition-all hover:bg-brand-50 active:translate-y-px sm:w-auto"
              >
                {t("landing.cta.primary")}
                <ArrowIcon />
              </Link>
              <Link
                href="/signin"
                className="inline-flex w-full items-center justify-center rounded-full border border-white/40 px-7 py-3.5 text-base font-semibold text-white transition-all hover:bg-white/10 active:translate-y-px sm:w-auto"
              >
                {t("landing.cta.secondary")}
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-gray-200 py-10 dark:border-gray-800">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:px-6 md:flex-row lg:px-8">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-brand-500 px-2.5 py-1 text-base font-bold tracking-tight text-white">
              KPOS
            </span>
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
