export const locales = ['en', 'ru', 'uz', 'uzc'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'uz';

// Locales actually offered in the language switcher — Uzbek and Russian, the
// two languages this market runs on, and the same pair the landing offers.
// `en` and `uzc` (Uzbek Cyrillic) stay in `locales`, the type, and the message
// catalogues for back-compat, but are retired from the UI selection; a session
// still holding one is folded to `uz` in LocaleContext.
export const selectableLocales: Locale[] = ['uz', 'ru'];

// Short labels shown in the language switcher.
// `uz` = Uzbek (Latin), `uzc` = Uzbek (Cyrillic) — the Cyrillic label keeps them distinguishable.
export const localeLabels: Record<Locale, string> = {
  en: 'EN',
  ru: 'RU',
  uz: 'UZ',
  uzc: 'ЎЗ',
};

// Each language named in itself — how a language picker should read, since the
// person hunting for their language may not read the one currently active.
export const localeNativeNames: Record<Locale, string> = {
  en: 'English',
  ru: 'Русский',
  uz: "O'zbekcha",
  uzc: 'Ўзбекча',
};
