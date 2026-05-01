'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';
import { locales, type Locale } from '@/i18n/routing';
import { useTransition, useState, useRef, useEffect } from 'react';
import FlagIcon from '@/components/common/FlagIcon';

const localeNames: Record<Locale, string> = {
  ru: 'Русский',
  en: 'English',
  zh: '中文',
  ja: '日本語',
  de: 'Deutsch',
  es: 'Español',
  it: 'Italiano',
  fr: 'Français',
};

interface LanguageSelectorProps {
  /**
   * Available content locales from restaurant settings
   * Only show languages that are available for the restaurant's menu
   */
  availableLocales?: string[];
  /**
   * Show only UI locales (all 8 languages) regardless of content availability
   */
  showAllUILocales?: boolean;
  className?: string;
}

export default function LanguageSelector({ 
  availableLocales, 
  showAllUILocales = false,
  className = '' 
}: LanguageSelectorProps) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Determine which locales to show
  const displayLocales = showAllUILocales 
    ? locales 
    : (availableLocales && availableLocales.length > 0
        ? locales.filter(l => availableLocales.includes(l))
        : locales);

  // Don't show selector if only one locale is available
  if (displayLocales.length <= 1) {
    return null;
  }

  const handleLocaleChange = (newLocale: Locale) => {
    startTransition(() => {
      router.replace(pathname, { locale: newLocale });
      
      // Save locale preference to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('preferred-locale', newLocale);
      }
    });
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="h-10 w-14 bg-white border-2 border-gray-400 rounded-lg flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 cursor-pointer hover:bg-gray-50 transition shadow-sm"
        style={{ color: '#000000' }}
      >
        <FlagIcon code={locale} className="w-6 h-4 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {displayLocales.map((loc) => (
            <button
              key={loc}
              onClick={() => handleLocaleChange(loc)}
              disabled={isPending}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-black font-medium hover:bg-gray-100 transition disabled:opacity-50 ${
                loc === locale ? 'bg-blue-50 font-bold' : ''
              }`}
              style={{ color: '#000000' }}
            >
              <FlagIcon code={loc} className="w-6 h-4 shrink-0" />
              <span className="text-black font-medium" style={{ color: '#000000' }}>{localeNames[loc]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
