// Helpers for user-friendly amount inputs: show grouped thousands while typing
// (e.g. "100000" -> "100 000") but keep a clean raw value in state/props.

/** Digits only — strips grouping separators (spaces, commas, etc.). */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Drop insignificant leading zeros so typing a digit after a lone "0" doesn't
 * strand it: "0" + "5" → "5", not "05". Keeps a single zero for pure-zero and
 * decimal inputs ("0", "00" → "0", "0.25" stays, "0." stays). Only the integer
 * part is touched; any decimal portion is preserved verbatim.
 */
export function stripLeadingZeros(value: string): string {
  const dot = value.indexOf(".");
  const whole = (dot === -1 ? value : value.slice(0, dot)).replace(/^0+(?=\d)/, "");
  return dot === -1 ? whole : whole + value.slice(dot);
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
