export const locales = ['en', 'ru', 'uz', 'uzc'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

// Short labels shown in the language switcher.
// `uz` = Uzbek (Latin), `uzc` = Uzbek (Cyrillic) — the Cyrillic label keeps them distinguishable.
export const localeLabels: Record<Locale, string> = {
  en: 'EN',
  ru: 'RU',
  uz: 'UZ',
  uzc: 'ЎЗ',
};
