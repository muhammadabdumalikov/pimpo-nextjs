'use client';

import { useTranslations } from '@/hooks/useTranslations';
import { locales, type Locale } from '@/i18n/config';

export default function LocaleSwitcher() {
  const { locale, setLocale } = useTranslations();

  return (
    <div className="relative flex items-center">
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="h-11 w-11 cursor-pointer appearance-none rounded-full border border-gray-200 bg-white px-3 text-center text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
      >
        {locales.map((loc) => (
          <option key={loc} value={loc} className="text-gray-700 dark:bg-gray-900 dark:text-gray-400">
            {loc.toUpperCase()}
          </option>
        ))}
      </select>
    </div>
  );
}
