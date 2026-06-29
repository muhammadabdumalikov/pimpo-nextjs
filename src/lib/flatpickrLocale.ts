import type flatpickr from 'flatpickr';
import { Russian } from 'flatpickr/dist/l10n/ru.js';
import { Uzbek } from 'flatpickr/dist/l10n/uz.js';
import { UzbekLatin } from 'flatpickr/dist/l10n/uz_latn.js';

// Maps our app locales to flatpickr's localizations. 'en' has no entry, so it
// returns undefined and flatpickr falls back to its built-in English default.
const flatpickrLocales: Record<string, flatpickr.CustomLocale> = {
  ru: Russian,
  uz: UzbekLatin,
  uzc: Uzbek,
};

export function getFlatpickrLocale(locale: string): flatpickr.CustomLocale | undefined {
  return flatpickrLocales[locale];
}
