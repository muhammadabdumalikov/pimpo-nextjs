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

/** Locale-supplied short scale units for `formatCompact`. */
export interface CompactUnits {
  thousand: string; // "ming" / "тыс." / "k"
  million: string; // "mln"
  billion: string; // "mlrd" / "bn"
}

/**
 * Short form for figures that must fit a tight slot — a chart axis label or a
 * stat band — where a fully grouped UZS sum ("1 240 000 000") would wrap or
 * crowd out its neighbours. One decimal, so 1.2 mlrd stays readable while
 * 1 240 000 000 does not. Always pair with the exact value nearby (tooltip or
 * title), since this rounds.
 */
export const formatCompact = (v: number, units: CompactUnits): string => {
  if (!Number.isFinite(v)) return formatNumber(0);
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);
  const one = (n: number) => formatNumber(Math.round(n * 10) / 10);
  if (abs >= 1e9) return `${sign}${one(abs / 1e9)} ${units.billion}`;
  if (abs >= 1e6) return `${sign}${one(abs / 1e6)} ${units.million}`;
  if (abs >= 1e3) return `${sign}${one(abs / 1e3)} ${units.thousand}`;
  return `${sign}${formatNumber(Math.round(abs))}`;
};

// Month names are OUR data, not Intl's: Safari (and some Chromium builds)
// ship no Uzbek CLDR tables, so Intl.DateTimeFormat('uz-…') silently falls
// back to the root locale and renders "M08" instead of "Avgust". Twelve words
// per locale is cheaper than a formatter that lies on some devices.
const MONTHS: Record<string, {long: string[]; short: string[]}> = {
  uz: {
    long: ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'],
    short: ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'],
  },
  uzc: {
    long: ['Январ', 'Феврал', 'Март', 'Апрел', 'Май', 'Июн', 'Июл', 'Август', 'Сентабр', 'Октабр', 'Ноябр', 'Декабр'],
    short: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
  },
  ru: {
    long: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
    short: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
  },
  en: {
    long: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    short: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  },
};

/** Localized month names, Jan→Dec. `format` picks short ("Yan") or long. */
export const monthNames = (
  locale: string,
  format: 'short' | 'long' = 'short',
): string[] => (MONTHS[locale] ?? MONTHS.uz)[format];

/** '2026-07' → 'Iyul 2026' in the given app locale. */
export const periodLabel = (period: string, locale: string): string => {
  const [y, m] = period.split('-').map(Number);
  const name = monthNames(locale, 'long')[m - 1];
  return name ? `${name} ${y}` : period;
};

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

// The store's business timezone — a FIXED +05:00 (Uzbekistan has observed no
// DST since 1992). Mirrors the backend's BUSINESS_UTC_OFFSET
// (pimpo-backend src/common/business-time.ts): the YYYY-MM-DD strings sent to
// the report API denote calendar days in THIS zone, so "today" must come from
// the store clock — a device on another timezone would otherwise shift every
// default range by a day.
const STORE_UTC_OFFSET_MS = 5 * 60 * 60 * 1000;

/** Today's calendar date in the store zone, as a local-midnight Date. */
export const storeToday = (): Date => {
  const shifted = new Date(Date.now() + STORE_UTC_OFFSET_MS);
  return new Date(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
  );
};

// Current-month [first, last] default range used by most reports.
export const currentMonthRange = (): [Date, Date] => {
  const now = storeToday();
  return [
    new Date(now.getFullYear(), now.getMonth(), 1),
    new Date(now.getFullYear(), now.getMonth() + 1, 0),
  ];
};
