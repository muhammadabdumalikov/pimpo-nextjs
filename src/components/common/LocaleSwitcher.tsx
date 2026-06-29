'use client';

import { useState } from 'react';
import { useTranslations } from '@/hooks/useTranslations';
import { locales, type Locale } from '@/i18n/config';
import { Dropdown } from '@/components/ui/dropdown/Dropdown';
import { DropdownItem } from '@/components/ui/dropdown/DropdownItem';

export default function LocaleSwitcher() {
  const { locale, setLocale } = useTranslations();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="dropdown-toggle flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-gray-200 bg-white text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
      >
        {locale.toUpperCase()}
      </button>

      <Dropdown isOpen={open} onClose={() => setOpen(false)} className="w-28 p-1.5">
        {locales.map((loc) => {
          const isSelected = loc === locale;
          return (
            <DropdownItem
              key={loc}
              onItemClick={() => {
                setLocale(loc as Locale);
                setOpen(false);
              }}
              baseClassName="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition"
              className={
                isSelected
                  ? 'bg-brand-50 font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.05]'
              }
            >
              {loc.toUpperCase()}
            </DropdownItem>
          );
        })}
      </Dropdown>
    </div>
  );
}
