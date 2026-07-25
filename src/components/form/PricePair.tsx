"use client";

import React, { useRef } from "react";
import Input from "@/components/form/input/InputField";
import { formatNumberInput, digitsOnly, stripLeadingZeros } from "@/lib/number";

// A selling-price tier is a twin: the absolute amount (the only thing submitted)
// and its markup-% vs a cost base (priceIn), kept in sync both ways. `driver`
// records which side the user last typed — that side wins when the cost changes.
// Shared by the goods-receipt form and the product form.
export type PriceMode = "sum" | "pct";

/** Percent input: digits plus one decimal separator ("12,5" → "12.5"). */
function sanitizePct(value: string): string {
  const cleaned = value.replace(/,/g, ".").replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  if (dot === -1) return cleaned;
  return cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, "");
}

/** Markup implied by an absolute amount vs the cost, rounded to one decimal. */
export function impliedPct(sum: number, base: number): number {
  return Math.round((sum / base - 1) * 1000) / 10;
}

/** Amount produced by a markup-% on the cost; null when it can't be computed. */
export function pctToSum(pct: string, base: number): number | null {
  const p = Number(pct);
  if (!pct.trim() || !Number.isFinite(p) || base <= 0) return null;
  return Math.round(base * (1 + p / 100));
}

/** Re-sync one tier pair to a new cost price, honoring the side last typed. */
export function rebaseTier(
  value: string,
  pct: string,
  driver: PriceMode,
  base: number,
): { value: string; pct: string } {
  if (driver === "pct" && pct.trim()) {
    const sum = pctToSum(pct, base);
    return { value: sum != null ? String(sum) : "", pct };
  }
  const v = Number(value) || 0;
  return { value, pct: base > 0 && v > 0 ? String(impliedPct(v, base)) : "" };
}

interface PricePairProps {
  /** Absolute amount — the only thing submitted. */
  value: string;
  /** Markup-% twin vs the cost price. */
  pct: string;
  /** Cost base the % is measured against (priceIn). */
  base: number;
  onChange: (patch: { value: string; pct: string; driver: PriceMode }) => void;
  inputRef?: (el: HTMLInputElement | null) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  /** Marks the amount input invalid (red), mirroring InputField. */
  error?: boolean;
}

/**
 * Twin inputs for one selling-price tier: amount + markup-%. Typing either side
 * fills the other live (15 000 with cost 12 000 shows 25, and typing 30 in the %
 * box writes 15 600). Pressing "%" in the amount field jumps to the % box. Only
 * the amount reaches the API.
 */
export function PricePair({
  value,
  pct,
  base,
  onChange,
  inputRef,
  onKeyDown,
  error,
}: PricePairProps) {
  const pctRef = useRef<HTMLInputElement | null>(null);

  const onSumChange = (raw: string) => {
    const v = digitsOnly(raw);
    const n = Number(v) || 0;
    onChange({
      value: v,
      pct: base > 0 && n > 0 ? String(impliedPct(n, base)) : "",
      driver: "sum",
    });
  };

  const onPctChange = (raw: string) => {
    // stripLeadingZeros keeps "0.5"/"0." intact but turns "05" → "5" — the % box
    // sits at "0" on a 0% markup, so typing a digit shouldn't strand the zero.
    const p = stripLeadingZeros(sanitizePct(raw));
    if (!p.trim()) {
      // Clearing the % just detaches it — the typed amount survives.
      onChange({ value, pct: "", driver: "sum" });
      return;
    }
    const sum = pctToSum(p, base);
    onChange({ value: sum != null ? String(sum) : "", pct: p, driver: "pct" });
  };

  return (
    <div className="flex gap-1.5">
      <div className="min-w-0 flex-1">
        <Input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          placeholder="0"
          error={error}
          value={formatNumberInput(value)}
          onChange={(e) => onSumChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "%") {
              e.preventDefault();
              pctRef.current?.focus();
              pctRef.current?.select();
              return;
            }
            onKeyDown?.(e);
          }}
        />
      </div>
      {/* Raw input (not the shared Input) — needs tighter padding than px-4
          allows, plus the fixed % suffix. Styles mirror InputField's normal
          state. */}
      <div className="relative w-16 shrink-0">
        <input
          ref={pctRef}
          type="text"
          inputMode="decimal"
          placeholder="0"
          value={pct}
          onChange={(e) => onPctChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "%") {
              e.preventDefault();
              return;
            }
            onKeyDown?.(e);
          }}
          className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent py-2.5 pl-2 pr-5 text-right text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
        />
        <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-theme-xs text-gray-400 dark:text-gray-500">
          %
        </span>
      </div>
    </div>
  );
}
