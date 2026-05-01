'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import FlagIcon from '@/components/common/FlagIcon';

const availableLocales = [
  { code: 'ru', name: 'Русский' },
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'it', name: 'Italiano' },
  { code: 'ja', name: '日本語' },
  { code: 'zh', name: '中文' },
];

export default function LanguageSelector() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const locale = (params.locale as string) || 'ru';
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLocale = availableLocales.find(l => l.code === locale);

  const handleLanguageChange = (newLocale: string) => {
    const currentPathSegments = pathname.split('/');
    currentPathSegments[1] = newLocale;
    const newPath = currentPathSegments.join('/');
    router.push(newPath);
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
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-10 w-14 bg-white border-2 border-gray-400 rounded-lg flex items-center justify-center text-sm font-semibold text-black focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-gray-50 transition shadow-sm"
        title={`Выбор языка интерфейса - ${currentLocale?.name}`}
        style={{ color: '#000000' }}
      >
        <FlagIcon code={locale} className="w-6 h-4 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {availableLocales.map((loc) => (
            <button
              key={loc.code}
              onClick={() => handleLanguageChange(loc.code)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-black font-medium hover:bg-gray-100 transition ${
                loc.code === locale ? 'bg-blue-50 font-bold' : ''
              }`}
              style={{ color: '#000000' }}
            >
              <FlagIcon code={loc.code} className="w-6 h-4 shrink-0" />
              <span className="text-black font-medium" style={{ color: '#000000' }}>{loc.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
