// Shared formatting helpers for reports.

export const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;

// UZS money, matching the dashboard style. `som` is passed in so it can be
// localized by the caller (t('reportsPage.som')).
export const formatMoney = (amount: number, som = "so'm") =>
  `${new Intl.NumberFormat('uz-UZ').format(Math.round(amount))} ${som}`;

export const formatNumber = (n: number) =>
  new Intl.NumberFormat('uz-UZ').format(n);

export const formatDate = (iso: string | Date | null) => {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  return `${String(d.getDate()).padStart(2, '0')}.${String(
    d.getMonth() + 1,
  ).padStart(2, '0')}.${d.getFullYear()}`;
};

// "01.07.2026 – 31.07.2026" summary for a report's active date range.
export const rangeLabel = (range: [Date | null, Date | null]) => {
  const [a, b] = range;
  if (!a && !b) return "";
  return `${formatDate(a)} – ${formatDate(b)}`;
};

// Current-month [first, last] default range used by most reports.
export const currentMonthRange = (): [Date, Date] => {
  const now = new Date();
  return [
    new Date(now.getFullYear(), now.getMonth(), 1),
    new Date(now.getFullYear(), now.getMonth() + 1, 0),
  ];
};
