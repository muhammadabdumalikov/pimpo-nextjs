// Formats a phone number as "+xxx xx xxx xx xx" (12 digits, grouped 3-2-3-2-2).
// e.g. "998901234567" -> "+998 90 123 45 67". Partial input is grouped as far as
// it goes, so it works for formatting-as-you-type. Non-digits are stripped.
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 12);
  if (!digits) return "";
  const groups = [3, 2, 3, 2, 2];
  const parts: string[] = [];
  let i = 0;
  for (const g of groups) {
    if (i >= digits.length) break;
    parts.push(digits.slice(i, i + g));
    i += g;
  }
  return "+" + parts.join(" ");
}
