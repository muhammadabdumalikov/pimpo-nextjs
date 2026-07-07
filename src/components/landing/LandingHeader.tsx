"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { useTranslations } from "@/hooks/useTranslations";
import { useTheme } from "@/context/ThemeContext";
import LangSwitcher from "./LangSwitcher";
import { ChevronIcon } from "./icons";

const navLinks = [
  { href: "#features", key: "landing.nav.features" },
  { href: "#pricing", key: "landing.nav.pricing" },
  { href: "#faq", key: "landing.nav.faq" },
];

export default function LandingHeader() {
  const { t, locale, setLocale } = useTranslations();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const hiddenRef = useRef(false);
  const scrolledRef = useRef(false);

  // billz-style auto-hide: slide the header up when scrolling down, reveal it on
  // scroll up (always shown near the top / when the mobile menu is open). Also
  // tracks `scrolled` so the header is transparent over the dark hero at the top
  // and turns solid once you scroll. rAF-throttled; state only flips on change.
  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const update = () => {
      const y = window.scrollY;
      const next = y > 120 && y > lastY && !mobileOpen;
      if (next !== hiddenRef.current) {
        hiddenRef.current = next;
        setHidden(next);
      }
      const scrolledNext = y > 24;
      if (scrolledNext !== scrolledRef.current) {
        scrolledRef.current = scrolledNext;
        setScrolled(scrolledNext);
      }
      lastY = y;
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [mobileOpen]);

  // The landing only offers Uzbek and Russian — fall back to Uzbek if the
  // active locale is anything else (e.g. the app default "en").
  useEffect(() => {
    if (locale !== "uz" && locale !== "ru") {
      setLocale("uz");
    }
  }, [locale, setLocale]);

  // Smooth-scroll to in-page anchors (sections carry scroll-mt-20 so they clear
  // the fixed header). Falls back to an instant jump under reduced-motion.
  const handleNavClick = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    setMobileOpen(false);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", href);
  };

  // Transparent + light text over the dark hero at the very top; solid once
  // scrolled (or when the mobile menu is open).
  const solid = scrolled || mobileOpen;
  const onDark = !solid;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 ease-out motion-reduce:transition-none ${
        solid
          ? "border-gray-200 bg-white/85 shadow-sm backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/85"
          : "border-transparent bg-transparent"
      } ${hidden ? "-translate-y-full" : "translate-y-0"}`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center" aria-label="KPOS">
          <span className="rounded-lg bg-brand-500 px-2.5 py-1 text-lg font-bold tracking-tight text-white">
            KPOS
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className={`text-sm font-medium transition-colors ${
                onDark
                  ? "text-white/75 hover:text-white"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              }`}
            >
              {t(link.key)}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Theme"
            className={`hidden h-11 w-11 items-center justify-center rounded-full border transition-colors sm:flex ${
              onDark
                ? "border-white/20 text-white/80 hover:bg-white/10"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
            }`}
          >
            {theme === "dark" ? (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></svg>
            )}
          </button>
          <LangSwitcher allowed={["uz", "ru"]} onDark={onDark} />
          <Link
            href="/signin"
            className={`hidden rounded-full px-4 py-2.5 text-sm font-medium transition-colors sm:inline-flex ${
              onDark
                ? "text-white/80 hover:text-white"
                : "text-gray-700 hover:text-brand-600 dark:text-gray-200 dark:hover:text-brand-400"
            }`}
          >
            {t("landing.nav.login")}
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center rounded-full bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-brand-600 active:translate-y-px"
          >
            {t("landing.nav.start")}
          </Link>
          <button
            type="button"
            aria-label="Menu"
            onClick={() => setMobileOpen((v) => !v)}
            className={`flex h-11 w-11 items-center justify-center rounded-full border md:hidden ${
              onDark
                ? "border-white/25 text-white"
                : "border-gray-200 text-gray-700 dark:border-gray-800 dark:text-gray-300"
            }`}
          >
            <ChevronIcon className={`h-5 w-5 transition-transform ${mobileOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900 md:hidden">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/5"
              >
                {t(link.key)}
              </a>
            ))}
            <Link
              href="/signin"
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/5"
            >
              {t("landing.nav.login")}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
