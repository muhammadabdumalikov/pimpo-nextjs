'use client';

import { useLocale } from '@/context/LocaleContext';

export function useTranslations() {
  const { locale, setLocale, t } = useLocale();
  return { t, locale, setLocale };
}
