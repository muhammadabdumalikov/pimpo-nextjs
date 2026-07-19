"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LuSearch, LuCornerDownLeft } from "react-icons/lu";
import { useTranslations } from "@/hooks/useTranslations";
import { useSubscription } from "@/context/SubscriptionContext";
import { useAuth } from "@/context/AuthContext";
import { getMenuIdFromPath, isMenuVisible } from "@/data/menuPermissions";
import { NAV_ENTRIES, type NavEntry } from "@/lib/navCatalog";
import { getMessages, locales } from "@/i18n";

// Resolve a dotted i18n key against a specific locale's message tree.
function resolveKey(messages: unknown, key: string): string {
  const value = key.split(".").reduce<unknown>(
    (acc, k) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[k] : undefined),
    messages,
  );
  return typeof value === "string" ? value : "";
}

// Every locale's translation of an entry name, so the search matches whatever
// language the user types in (uz/ru/en/uzc) regardless of the active locale.
const HAYSTACKS: Record<string, string> = Object.fromEntries(
  NAV_ENTRIES.map((e) => [
    e.id,
    [...locales.map((l) => resolveKey(getMessages(l), e.nameKey)), e.path]
      .join(" ")
      .toLowerCase(),
  ]),
);

const normalize = (s: string) => s.trim().toLowerCase();

export default function GlobalSearch() {
  const { t } = useTranslations();
  const { currentTier } = useSubscription();
  const { hasMenuAccess } = useAuth();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Destinations the current account may actually reach (tier + role gated),
  // mirroring the sidebar's visibility rules.
  const visibleEntries = useMemo(
    () =>
      NAV_ENTRIES.filter((e) =>
        isMenuVisible(getMenuIdFromPath(e.path), currentTier, hasMenuAccess),
      ),
    [currentTier, hasMenuAccess],
  );

  const results = useMemo(() => {
    const q = normalize(query);
    if (!q) return [] as NavEntry[];
    const tokens = q.split(/\s+/).filter(Boolean);

    const matched = visibleEntries.filter((e) => {
      const hay = HAYSTACKS[e.id] ?? "";
      return tokens.every((tok) => hay.includes(tok));
    });

    // Rank whole-word/prefix hits on the active-locale name above loose matches.
    const rank = (e: NavEntry) => {
      const name = normalize(t(e.nameKey));
      if (name === q) return 0;
      if (name.startsWith(q)) return 1;
      if (name.includes(q)) return 2;
      return 3;
    };
    return matched.sort((a, b) => rank(a) - rank(b)).slice(0, 12);
  }, [query, visibleEntries, t]);

  // Update the query and reset the highlight to the top result together, so the
  // active row never points past the freshly-filtered list.
  const updateQuery = (value: string) => {
    setQuery(value);
    setActiveIndex(0);
  };

  // ⌘K / Ctrl+K focuses and opens the search from anywhere.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close the dropdown when clicking outside the search.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const go = (entry: NavEntry) => {
    router.push(entry.path);
    setIsOpen(false);
    setQuery("");
    inputRef.current?.blur();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const target = results[activeIndex];
      if (target) go(target);
    } else if (event.key === "Escape") {
      if (query) updateQuery("");
      else {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    }
  };

  const showDropdown = isOpen && query.trim().length > 0;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <span className="absolute -translate-y-1/2 left-4 top-1/2 pointer-events-none text-gray-500 dark:text-gray-400">
          <LuSearch size={20} />
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="global-search-listbox"
          autoComplete="off"
          placeholder={t("common.searchCommand")}
          onChange={(e) => {
            updateQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 pr-14 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 xl:w-[430px]"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => inputRef.current?.focus()}
          className="absolute right-2.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 px-[7px] py-[4.5px] text-xs -tracking-[0.2px] text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400"
        >
          <span> ⌘ </span>
          <span> K </span>
        </button>
      </div>

      {showDropdown && (
        <div
          id="global-search-listbox"
          role="listbox"
          className="absolute left-0 right-0 z-40 mt-2 max-h-[420px] overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark custom-scrollbar"
        >
          {results.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              {t("common.noResults")}
            </div>
          ) : (
            <ul className="flex flex-col">
              {results.map((entry, index) => {
                const Icon = entry.icon;
                const active = index === activeIndex;
                return (
                  <li key={entry.id} role="option" aria-selected={active}>
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => go(entry)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                        active
                          ? "bg-brand-50 dark:bg-white/[0.06]"
                          : "hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          active
                            ? "bg-brand-500 text-white"
                            : "bg-gray-100 text-gray-500 dark:bg-white/[0.06] dark:text-gray-400"
                        }`}
                      >
                        <Icon size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-gray-800 dark:text-white/90">
                          {t(entry.nameKey)}
                        </span>
                        <span className="block truncate text-xs text-gray-400 dark:text-gray-500">
                          {t(entry.groupKey)}
                        </span>
                      </span>
                      {active && (
                        <LuCornerDownLeft
                          size={15}
                          className="shrink-0 text-brand-500 dark:text-brand-400"
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
