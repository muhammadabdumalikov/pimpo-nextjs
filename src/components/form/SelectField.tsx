"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDownIcon, CheckLineIcon } from "@/icons/index";
import { useTranslations } from "@/hooks/useTranslations";

interface Option {
  value: string;
  label: string;
  disabled?: boolean;
  /** Extra text matched by the search box but not shown (e.g. barcode/SKU). */
  keywords?: string;
}

interface SelectFieldProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Disable the whole control (e.g. while options load). */
  disabled?: boolean;
  /** Show a filter box in the dropdown — use for long, API-driven lists. */
  searchable?: boolean;
  /** Placeholder for the search box (defaults to "Search..."). */
  searchPlaceholder?: string;
  /**
   * Backend search: called (debounced) with the typed query. When provided the
   * component does NOT filter locally — the parent fetches and supplies the
   * matching `options`. Implies `searchable`. Pair with `loading`.
   */
  onSearch?: (query: string) => void;
  /** Debounce for `onSearch`, ms (default 300). */
  searchDebounceMs?: number;
  /** Show a loading state in the dropdown (for backend search). */
  loading?: boolean;
  /** Wrapper class — use for width (e.g. "w-full", "min-w-[160px]"). */
  className?: string;
  /** Override the trigger button (e.g. height "h-9" for inline use). */
  buttonClassName?: string;
  /** Focus the trigger and open the menu on mount (e.g. a freshly added row). */
  autoFocus?: boolean;
  /** Called when the menu opens — use to lazy-load options on first open. */
  onOpen?: () => void;
}

/**
 * Custom, fully styleable select that matches the app's UI system.
 *
 * A native <select> renders its open option list with the OS, so CSS can't
 * theme it (the gray default dropdown). This builds the list from buttons
 * instead, so it picks up our rounded corners, brand colors, and dark mode.
 * Pass `searchable` to add a type-to-filter box for long lists.
 */
export default function SelectField({
  options,
  value,
  onChange,
  placeholder = "Select",
  disabled = false,
  searchable = false,
  searchPlaceholder,
  onSearch,
  searchDebounceMs = 300,
  loading = false,
  className = "",
  buttonClassName = "",
  autoFocus = false,
  onOpen,
}: SelectFieldProps) {
  const { t } = useTranslations();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep the latest onOpen without re-running the mount effect.
  const onOpenRef = useRef(onOpen);
  useEffect(() => {
    onOpenRef.current = onOpen;
  }, [onOpen]);

  // Backend mode: parent supplies already-filtered options, so don't filter here.
  const isAsync = !!onSearch;
  const showSearch = searchable || isAsync;
  // Keep the latest onSearch without re-arming the debounce timer.
  const onSearchRef = useRef(onSearch);
  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  // Open + focus on mount when requested (rapid keyboard-driven row entry).
  useEffect(() => {
    if (!autoFocus) return;
    buttonRef.current?.focus();
    setOpen(true);
    onOpenRef.current?.();
    if (isAsync) onSearchRef.current?.(""); // load the default list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runSearch = (val: string) => {
    setQuery(val);
    if (!isAsync) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearchRef.current?.(val), searchDebounceMs);
  };

  // Clear any pending debounce on unmount.
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Focus the search box when the dropdown opens.
  useEffect(() => {
    if (open && showSearch) searchRef.current?.focus();
  }, [open, showSearch]);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    // In backend mode the parent already filtered; only filter locally.
    if (isAsync || !searchable || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.keywords ?? "").toLowerCase().includes(q),
    );
  }, [options, query, searchable, isAsync]);

  // Best option for a typed/scanned query: an exact label/keyword (code/barcode)
  // match wins, otherwise the first available result.
  const bestMatch = (raw: string): Option | undefined => {
    const q = raw.trim().toLowerCase();
    if (!q) return undefined;
    const pool = isAsync ? options : filtered;
    const exact = pool.find(
      (o) =>
        !o.disabled &&
        (o.label.toLowerCase() === q ||
          (o.keywords ?? "").toLowerCase().split(/\s+/).includes(q)),
    );
    return exact ?? pool.find((o) => !o.disabled);
  };

  // A scanned barcode pending resolution: in backend mode the matching results
  // may not have arrived when Enter fires, so we remember the query and pick
  // once fresh options land (see the effect below).
  const pendingPickRef = useRef<string | null>(null);

  // Enter in the search box picks a match — enables barcode scanners (which type
  // the code then send Enter): pick immediately if we already have a match,
  // otherwise (backend mode) flush a search now and pick when results return.
  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const raw = e.currentTarget.value.trim();
    if (!raw) return;
    const pick = bestMatch(raw);
    if (pick) {
      onChange(pick.value);
      setOpen(false);
      return;
    }
    if (isAsync) {
      pendingPickRef.current = raw;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      onSearchRef.current?.(raw);
    }
  };

  // Resolve a pending scan once new options arrive (backend mode).
  useEffect(() => {
    const raw = pendingPickRef.current;
    if (!raw) return;
    pendingPickRef.current = null;
    const pick = bestMatch(raw);
    if (pick) {
      onChange(pick.value);
      setOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => {
          if (!open) {
            setQuery(""); // clear the filter each time we reopen
            if (isAsync) onSearchRef.current?.(""); // reset to the default list
            onOpenRef.current?.(); // lazy-load options on open
          }
          setOpen((v) => !v);
        }}
        className={`flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm shadow-theme-xs transition focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 ${
          selected ? "text-gray-700 dark:text-white/90" : "text-gray-400 dark:text-gray-400"
        } ${buttonClassName}`}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDownIcon
          className={`shrink-0 text-gray-400 transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-40 mt-1.5 rounded-xl border border-gray-200 bg-white p-1.5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
        >
          {showSearch && (
            <div className="relative mb-1.5">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M3.04 9.374a6.333 6.333 0 1 1 11.318 3.92l2.82 2.82a.75.75 0 1 1-1.06 1.06l-2.82-2.82A6.333 6.333 0 0 1 3.04 9.374Zm6.333-4.832a4.833 4.833 0 1 0 0 9.666 4.833 4.833 0 0 0 0-9.666Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => runSearch(e.target.value)}
                onKeyDown={onSearchKeyDown}
                placeholder={searchPlaceholder || t("common.search")}
                className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
              />
            </div>
          )}

          <div className="max-h-60 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-400">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
                <span>{t("common.searching")}</span>
              </div>
            ) : filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-gray-400">
                {query.trim() ? t("common.noResults") : t("common.noOptions")}
              </p>
            ) : (
              filtered.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={option.disabled}
                    disabled={option.disabled}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                      option.disabled
                        ? "cursor-not-allowed text-gray-300 dark:text-gray-600"
                        : isSelected
                          ? "bg-brand-50 font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                          : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.05]"
                    }`}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected && !option.disabled && <CheckLineIcon className="shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
