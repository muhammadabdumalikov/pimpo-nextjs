'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getTranslations, type Locale, defaultLocale } from '@/i18n';
import { selectableLocales } from '@/i18n/config';

type LocaleContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
};

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export const LocaleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize locale from localStorage. Uzbek Cyrillic (uzc) was retired from
    // the switcher — fold any legacy choice to Latin Uzbek and re-persist.
    const savedLocale = localStorage.getItem('locale') as Locale | null;
    const normalized: Locale | null = savedLocale === 'uzc' ? 'uz' : savedLocale;
    if (normalized && selectableLocales.includes(normalized)) {
      setLocaleState(normalized);
      if (normalized !== savedLocale) localStorage.setItem('locale', normalized);
    }
    setIsInitialized(true);
  }, []);

  // Keep <html lang> in sync with the active UI language (a11y + SEO): the
  // server can't know the localStorage choice, so it's stamped client-side.
  useEffect(() => {
    document.documentElement.lang = locale === 'uzc' ? 'uz-Cyrl' : locale;
  }, [locale]);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('locale', newLocale);
    // Trigger a custom event to notify components
    window.dispatchEvent(new CustomEvent('localechange', { detail: newLocale }));
  };

  const t = getTranslations(locale);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = () => {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
};
