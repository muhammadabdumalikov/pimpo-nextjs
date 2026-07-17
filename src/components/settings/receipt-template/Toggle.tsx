"use client";
import React from "react";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}

/**
 * Controlled toggle styled like the app's Switch. Unlike Switch (which is
 * uncontrolled via defaultChecked), this reflects `checked` directly so the
 * template editor's state stays the single source of truth.
 */
export default function Toggle({
  checked,
  onChange,
  disabled = false,
  label,
}: ToggleProps) {
  return (
    <label
      className={`flex cursor-pointer select-none items-center gap-3 text-sm font-medium ${
        disabled ? "text-gray-400" : "text-gray-700 dark:text-gray-300"
      }`}
      onClick={() => !disabled && onChange(!checked)}
    >
      <div className="relative">
        <div
          className={`block h-6 w-11 rounded-full transition duration-150 ease-linear ${
            disabled
              ? "bg-gray-100 dark:bg-gray-800"
              : checked
                ? "bg-brand-500"
                : "bg-gray-200 dark:bg-white/10"
          }`}
        />
        <div
          className={`absolute left-0.5 top-0.5 h-5 w-5 transform rounded-full bg-white shadow-theme-sm duration-150 ease-linear ${
            checked ? "translate-x-full" : "translate-x-0"
          }`}
        />
      </div>
      {label ? <span>{label}</span> : null}
    </label>
  );
}
