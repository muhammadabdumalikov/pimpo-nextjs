import type { ReconRow } from "@/lib/api";

/** Group a number with thousands separators for display. */
export function fmt(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("uz-UZ").format(Math.round(n));
}

/** i18n label key for a payment method. */
export function methodLabelKey(method: ReconRow["method"]): string {
  if (method === "cash") return "kassa.naqd";
  if (method === "card") return "kassa.karta";
  return "kassa.nasiya";
}
