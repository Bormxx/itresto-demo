'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import LanguageSelector from '@/components/supervisor/LanguageSelector';
import HomeIcon from '@/components/icons/HomeIcon';
import CalendarIcon from '@/components/icons/CalendarIcon';
import MenuIcon from '@/components/icons/MenuIcon';
import EditIcon from '@/components/icons/EditIcon';
import OrdersIcon from '@/components/icons/OrdersIcon';
import ReportsIcon from '@/components/icons/ReportsIcon';
import ActionsIcon from '@/components/icons/ActionsIcon';
import TableIcon from '@/components/icons/TableIcon';

interface ManagerNavProps {
  restaurant: string;
  locale: string;
  userName: string;
  restaurantName?: string;
  logoUrl?: string | null;
}

export default function ManagerNav({ restaurant, locale, userName, restaurantName, logoUrl }: ManagerNavProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const t = useTranslations('manager.nav');

  const baseUrl = `/${locale}/${restaurant}/manager`;

  const navItems = [
    { href: baseUrl, label: t('home'), iconComponent: HomeIcon },
    { href: `${baseUrl}/shifts`, label: t('shifts'), iconComponent: CalendarIcon },
    { href: `${baseUrl}/menu`, label: t('menu'), iconComponent: MenuIcon },
    { href: `${baseUrl}/menu/manage`, label: t('menuManagement'), iconComponent: EditIcon },
    { href: `${baseUrl}/orders`, label: t('orders'), iconComponent: OrdersIcon },
    { href: `${baseUrl}/reports`, label: t('reports'), iconComponent: ReportsIcon },
    { href: `${baseUrl}/conflicts`, label: t('conflicts'), iconComponent: ActionsIcon },
    { href: `${baseUrl}/reservations`, label: t('reservations'), iconComponent: TableIcon },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white shadow">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Логотип и название ресторана */}
          <div className="flex items-center gap-4">
            <Link href={baseUrl} className="flex items-center gap-2">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt={restaurantName || t('title')}
                  className="h-10 w-auto max-w-[150px] object-contain"
                />
              ) : (
                <>
                  <div className="text-2xl">🍽️</div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900 truncate max-w-50">
                      {restaurantName || t('title')}
                    </div>
                    <div className="text-xs text-gray-500">{t('currentShift')}</div>
                  </div>
                </>
              )}
            </Link>
          </div>

          {/* Desktop Navigation - только иконки */}
          <div className="hidden md:flex items-center gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={`
                    flex h-10 w-10 items-center justify-center rounded-full transition
                    ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  {item.iconComponent && <item.iconComponent className="w-5 h-5" />}
                </Link>
              );
            })}
          </div>

          {/* Правая часть - профиль, язык и выход */}
          <div className="flex items-center gap-3">
            <Link
              href={`${baseUrl}/profile`}
              className="flex h-10 w-10 min-h-10 min-w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition hover:bg-gray-200"
              aria-label="Личный кабинет"
              title={userName || 'Личный кабинет'}
            >
              <svg 
                className="h-5 w-5" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                strokeWidth={2}
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                />
              </svg>
            </Link>
            <LanguageSelector />
            
            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition hover:bg-gray-200"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    rounded-lg px-3 py-2 text-sm font-medium transition flex items-center gap-3
                    ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  {item.iconComponent && <item.iconComponent className="w-5 h-5" />}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
