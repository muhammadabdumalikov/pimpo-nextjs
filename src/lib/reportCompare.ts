// Period-over-period comparison (Δ%) shared across the range-based reports.
// The comparison is a pure frontend concern: when a mode is active a report
// re-fetches itself for the comparison range and diffs the existing `totals`.
import { toISODate } from "./reportFormat";

export type CompareMode = "off" | "prev" | "yoy";

// The comparison range for a given active range and mode:
//  - prev: the same-length window immediately before it (Jul → Jun).
//  - yoy:  the same calendar dates one year earlier (Jul 2026 → Jul 2025).
export function comparisonRange(
  range: [Date | null, Date | null],
  mode: CompareMode,
): [Date, Date] | null {
  const [a, b] = range;
  if (mode === "off" || !a || !b) return null;

  if (mode === "yoy") {
    const f = new Date(a);
    f.setFullYear(f.getFullYear() - 1);
    const t = new Date(b);
    t.setFullYear(t.getFullYear() - 1);
    return [f, t];
  }

  const DAY = 86_400_000;
  const lenDays = Math.round((b.getTime() - a.getTime()) / DAY) + 1;
  const prevTo = new Date(a.getTime() - DAY);
  const prevFrom = new Date(prevTo.getTime() - (lenDays - 1) * DAY);
  return [prevFrom, prevTo];
}

// Comparison range as ISO date strings, ready for a report fetcher.
export function comparisonISO(
  range: [Date | null, Date | null],
  mode: CompareMode,
): [string, string] | null {
  const cr = comparisonRange(range, mode);
  return cr ? [toISODate(cr[0]), toISODate(cr[1])] : null;
}

// Δ% of current vs previous. null = "not comparable" (previous was zero but
// current is not — an infinite jump we render as "new" rather than a number).
export function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}
