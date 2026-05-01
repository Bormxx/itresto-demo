'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { SignOutButton } from '@/components/SignOutButton';
import LanguageSelector from './LanguageSelector';
import LanguageSettingsModal from './LanguageSettingsModal';
import TableIcon from '@/components/icons/TableIcon';
import HomeIcon from '@/components/icons/HomeIcon';
import RolesIcon from '@/components/icons/RolesIcon';
import StaffIcon from '@/components/icons/StaffIcon';
import MenuIcon from '@/components/icons/MenuIcon';
import CalendarIcon from '@/components/icons/CalendarIcon';
import PromotionIcon from '@/components/icons/PromotionIcon';
import ReportsIcon from '@/components/icons/ReportsIcon';
import QRCodeIcon from '@/components/icons/QRCodeIcon';
import ServicesIcon from '@/components/icons/ServicesIcon';
import GlobeIcon from '@/components/icons/GlobeIcon';
import AuditIcon from '@/components/icons/AuditIcon';
import PaymentIcon from '@/components/icons/PaymentIcon';

interface SupervisorNavProps {
  restaurant: string;
  locale: string;
  userName: string;
  restaurantId: string;
  restaurantName?: string;
  logoUrl?: string | null;
}

type NavItem = {
  href?: string;
  label: string;
  icon?: string;
  iconComponent?: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
};

export default function SupervisorNav({ restaurant, locale, userName, restaurantId, restaurantName, logoUrl }: SupervisorNavProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const t = useTranslations('supervisor.nav');

  const baseUrl = `/${locale}/${restaurant}/supervisor`;

  const navItems: NavItem[] = [
    { href: baseUrl, label: t('home'), iconComponent: HomeIcon },
    { href: `${baseUrl}/roles`, label: t('roles'), iconComponent: RolesIcon },
    { href: `${baseUrl}/staff`, label: t('staff'), iconComponent: StaffIcon },
    { href: `${baseUrl}/shifts`, label: t('shifts'), iconComponent: CalendarIcon },
    { href: `${baseUrl}/tables`, label: t('tables'), iconComponent: TableIcon },
    { href: `${baseUrl}/menu`, label: t('menu'), iconComponent: MenuIcon },
    { href: `${baseUrl}/promotions`, label: t('promotions'), iconComponent: PromotionIcon },
    { href: `${baseUrl}/analytics`, label: t('reports'), iconComponent: ReportsIcon },
    { href: `${baseUrl}/qr-codes`, label: t('qrCodes'), iconComponent: QRCodeIcon },
    { href: `${baseUrl}/services`, label: t('services'), iconComponent: ServicesIcon },
    { href: `${baseUrl}/payments`, label: t('payments'), iconComponent: PaymentIcon },
    { label: t('languages'), iconComponent: GlobeIcon, onClick: () => setIsLanguageModalOpen(true) },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white shadow">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <Link href={baseUrl} className="flex items-center gap-2">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt={restaurantName || t('title')}
                  className="h-10 w-auto max-w-[150px] object-contain"
                />
              ) : (
                <span className="text-xl font-bold text-gray-900">
                  {restaurantName || t('title')}
                </span>
              )}
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-3">
            {navItems.map((item, index) => {
              const isActive = item.href && pathname === item.href;
              const key = item.href || `nav-item-${index}`;
              
              if (item.onClick) {
                return (
                  <button
                    key={key}
                    onClick={item.onClick}
                    title={item.label}
                    className={`
                      flex h-10 w-10 items-center justify-center rounded-full transition
                      bg-[#f3f4f6] text-[#000000] hover:bg-[#e5e7eb]
                    `}
                  >
                    {item.iconComponent && <item.iconComponent className="w-6 h-6" />}
                  </button>
                );
              }
              
              return (
                <Link
                  key={key}
                  href={item.href!}
                  title={item.label}
                  className={`
                    flex h-10 w-10 items-center justify-center rounded-full transition
                    ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-[#f3f4f6] text-[#000000] hover:bg-[#e5e7eb]'
                    }
                  `}
                >
                  {item.iconComponent ? (
                    <item.iconComponent className="w-6 h-6" />
                  ) : (
                    <span className="text-xl">{item.icon}</span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-gray-600">{userName}</span>
            <LanguageSelector />
            <SignOutButton />
            
            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden flex h-10 w-10 items-center justify-center rounded-full bg-[#f3f4f6] text-[#000000] transition hover:bg-[#e5e7eb]"
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
            {navItems.map((item, index) => {
              const isActive = item.href && pathname === item.href;
              const key = item.href || `mobile-nav-item-${index}`;
              
              if (item.onClick) {
                return (
                  <button
                    key={key}
                    onClick={() => {
                      item.onClick!();
                      setIsMobileMenuOpen(false);
                    }}
                    className="rounded-lg px-3 py-2 text-sm font-medium transition flex items-center gap-2 text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    {item.iconComponent && <item.iconComponent className="w-5 h-5" />}
                    <span>{item.label}</span>
                  </button>
                );
              }
              
              return (
                <Link
                  key={key}
                  href={item.href!}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    rounded-lg px-3 py-2 text-sm font-medium transition flex items-center gap-2
                    ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  {item.iconComponent ? (
                    <item.iconComponent className="w-5 h-5" />
                  ) : (
                    <span>{item.icon}</span>
                  )}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
      
      <LanguageSettingsModal
        isOpen={isLanguageModalOpen}
        onClose={() => setIsLanguageModalOpen(false)}
        restaurantId={restaurantId}
      />
    </nav>
  );
}
