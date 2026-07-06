// Helpers for user-friendly amount inputs: show grouped thousands while typing
// (e.g. "100000" -> "100 000") but keep a clean raw value in state/props.

/** Digits only — strips grouping separators (spaces, commas, etc.). */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Group an amount for display inside a text input, e.g. "100000" -> "100 000".
 * Handles stored decimals ("100000.00") and returns "" for empty input so the
 * placeholder still shows.
 */
export function formatNumberInput(value: string | number | undefined | null): string {
  const raw = String(value ?? "").replace(/[^\d.]/g, "");
  if (raw === "") return "";
  return new Intl.NumberFormat("uz-UZ").format(Math.round(parseFloat(raw) || 0));
}
