"use client";
import React, { useEffect, useRef, useState } from "react";
import { ChevronDownIcon, CheckLineIcon } from "@/icons/index";

interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectFieldProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Disable the whole control (e.g. while options load). */
  disabled?: boolean;
  /** Wrapper class — use for width (e.g. "w-full", "min-w-[160px]"). */
  className?: string;
  /** Override the trigger button (e.g. height "h-9" for inline use). */
  buttonClassName?: string;
}

/**
 * Custom, fully styleable select that matches the app's UI system.
 *
 * A native <select> renders its open option list with the OS, so CSS can't
 * theme it (the gray default dropdown). This builds the list from buttons
 * instead, so it picks up our rounded corners, brand colors, and dark mode.
 */
export default function SelectField({
  options,
  value,
  onChange,
  placeholder = "Select",
  disabled = false,
  className = "",
  buttonClassName = "",
}: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
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
          className="absolute left-0 right-0 z-40 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1.5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
        >
          {options.map((option) => {
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
          })}
        </div>
      )}
    </div>
  );
}
