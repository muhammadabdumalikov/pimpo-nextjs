import { defaultLocale, locales, type Locale } from './config';
import enMessages from './messages/en.json';
import ruMessages from './messages/ru.json';
import uzMessages from './messages/uz.json';

const messages = {
  en: enMessages,
  ru: ruMessages,
  uz: uzMessages,
} as const;

export function getMessages(locale: Locale) {
  return messages[locale] || messages[defaultLocale];
}

export function getTranslations(locale: Locale) {
  const t = (key: string) => {
    const keys = key.split('.');
    let value: any = messages[locale] || messages[defaultLocale];
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        // Fallback to default locale
        value = messages[defaultLocale];
        for (const k2 of keys) {
          value = value?.[k2];
        }
        break;
      }
    }
    
    return value || key;
  };
  
  return t;
}

export { locales, defaultLocale, type Locale };
