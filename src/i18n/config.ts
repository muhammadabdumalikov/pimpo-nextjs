export const locales = ['en', 'ru', 'uz', 'uzc'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

// Locales actually offered in the language switcher. `uzc` (Uzbek Cyrillic)
// stays in `locales`, the type, and the message catalogue for back-compat, but
// is retired from the UI selection.
export const selectableLocales: Locale[] = ['en', 'ru', 'uz'];

// Short labels shown in the language switcher.
// `uz` = Uzbek (Latin), `uzc` = Uzbek (Cyrillic) — the Cyrillic label keeps them distinguishable.
export const localeLabels: Record<Locale, string> = {
  en: 'EN',
  ru: 'RU',
  uz: 'UZ',
  uzc: 'ЎЗ',
};
