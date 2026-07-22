"use client";
import { useEffect, useRef, useState } from "react";
import { comparisonISO, type CompareMode } from "@/lib/reportCompare";

// Re-fetches a report for its comparison period so a report can show Δ% on its
// headline totals. `fetchFor` is captured in a ref so it can be an inline arrow
// (that closes over branchId, groupBy, …) without retriggering the effect.
export function useReportComparison<T>(
  mode: CompareMode,
  range: [Date | null, Date | null],
  deps: unknown[],
  fetchFor: (fromISO: string, toISO: string) => Promise<T>,
): { prev: T | null; loading: boolean } {
  const [prev, setPrev] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const fetchRef = useRef(fetchFor);
  fetchRef.current = fetchFor;

  useEffect(() => {
    const iso = comparisonISO(range, mode);
    if (!iso) {
      setPrev(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    fetchRef
      .current(iso[0], iso[1])
      .then((d) => { if (active) setPrev(d); })
      .catch(() => { if (active) setPrev(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, range, ...deps]);

  return { prev, loading };
}
