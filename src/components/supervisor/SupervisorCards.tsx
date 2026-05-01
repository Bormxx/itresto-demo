'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import LanguageSettingsModal from './LanguageSettingsModal';
import TableIcon from '@/components/icons/TableIcon';
import RolesIcon from '@/components/icons/RolesIcon';
import StaffIcon from '@/components/icons/StaffIcon';
import MenuIcon from '@/components/icons/MenuIcon';
import ActionsIcon from '@/components/icons/ActionsIcon';
import ReportsIcon from '@/components/icons/ReportsIcon';
import GlobeIcon from '@/components/icons/GlobeIcon';
import QRCodeIcon from '@/components/icons/QRCodeIcon';
import ServicesIcon from '@/components/icons/ServicesIcon';
import CalendarIcon from '@/components/icons/CalendarIcon';
import PaymentIcon from '@/components/icons/PaymentIcon';

interface SupervisorCardsProps {
  baseUrl: string;
  restaurantId: string;
}

export default function SupervisorCards({ baseUrl, restaurantId }: SupervisorCardsProps) {
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const t = useTranslations('supervisor.cards');

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Управление ролями */}
        <Link
          href={`${baseUrl}/roles`}
          className="block rounded-lg bg-white p-6 shadow transition hover:shadow-lg"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
            <RolesIcon className="w-7 h-7 text-purple-700" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">
            {t('roles')}
          </h2>
          <p className="text-sm text-gray-600">
            {t('rolesDescription')}
          </p>
        </Link>

        {/* Управление персоналом */}
        <Link
          href={`${baseUrl}/staff`}
          className="block rounded-lg bg-white p-6 shadow transition hover:shadow-lg"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <StaffIcon className="w-7 h-7 text-blue-700" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">
            {t('staff')}
          </h2>
          <p className="text-sm text-gray-600">
            {t('staffDescription')}
          </p>
        </Link>

        {/* Управление сменами */}
        <Link
          href={`${baseUrl}/shifts`}
          className="block rounded-lg bg-white p-6 shadow transition hover:shadow-lg"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
            <CalendarIcon className="w-7 h-7 text-orange-700" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">
            {t('shifts')}
          </h2>
          <p className="text-sm text-gray-600">
            {t('shiftsDescription')}
          </p>
        </Link>

        {/* Управление столиками */}
        <Link
          href={`${baseUrl}/tables`}
          className="block rounded-lg bg-white p-6 shadow transition hover:shadow-lg"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <TableIcon className="w-7 h-7 text-green-700" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">
            {t('tables')}
          </h2>
          <p className="text-sm text-gray-600">
            {t('tablesDescription')}
          </p>
        </Link>

        {/* Управление меню */}
        <Link
          href={`${baseUrl}/menu`}
          className="block rounded-lg bg-white p-6 shadow transition hover:shadow-lg"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
            <MenuIcon className="w-7 h-7 text-yellow-700" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">
            {t('menu')}
          </h2>
          <p className="text-sm text-gray-600">
            {t('menuDescription')}
          </p>
        </Link>

        {/* Акции */}
        <Link
          href={`${baseUrl}/promotions`}
          className="block rounded-lg bg-white p-6 shadow transition hover:shadow-lg"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-pink-100">
            <ActionsIcon className="w-7 h-7 text-pink-700" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">
            {t('promotions')}
          </h2>
          <p className="text-sm text-gray-600">
            {t('promotionsDescription')}
          </p>
        </Link>

        {/* Отчёты */}
        <Link
          href={`${baseUrl}/analytics`}
          className="block rounded-lg bg-white p-6 shadow transition hover:shadow-lg"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
            <ReportsIcon className="w-7 h-7 text-purple-700" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">
            {t('reports')}
          </h2>
          <p className="text-sm text-gray-600">
            {t('reportsDescription')}
          </p>
        </Link>

        {/* QR-коды */}
        <Link
          href={`${baseUrl}/qr-codes`}
          className="block rounded-lg bg-white p-6 shadow transition hover:shadow-lg"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
            <QRCodeIcon className="w-7 h-7 text-indigo-700" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">
            {t('qrCodes')}
          </h2>
          <p className="text-sm text-gray-600">
            {t('qrCodesDescription')}
          </p>
        </Link>

        {/* Услуги */}
        <Link
          href={`${baseUrl}/services`}
          className="block rounded-lg bg-white p-6 shadow transition hover:shadow-lg"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-100">
            <ServicesIcon className="w-7 h-7 text-teal-700" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">
            {t('services')}
          </h2>
          <p className="text-sm text-gray-600">
            {t('servicesDescription')}
          </p>
        </Link>

        {/* Платежи */}
        <Link
          href={`${baseUrl}/payments`}
          className="block rounded-lg bg-white p-6 shadow transition hover:shadow-lg"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <PaymentIcon className="w-7 h-7 text-emerald-700" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">
            {t('payments')}
          </h2>
          <p className="text-sm text-gray-600">
            {t('paymentsDescription')}
          </p>
        </Link>

        {/* Поддержка языков */}
        <button
          onClick={() => setIsLanguageModalOpen(true)}
          className="block rounded-lg bg-white p-6 shadow transition hover:shadow-lg text-left w-full"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-100">
            <GlobeIcon className="w-7 h-7 text-cyan-700" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">
            {t('supportedLanguages')}
          </h2>
          <p className="text-sm text-gray-600">
            {t('supportedLanguagesDescription')}
          </p>
        </button>
      </div>

      <LanguageSettingsModal
        isOpen={isLanguageModalOpen}
        onClose={() => setIsLanguageModalOpen(false)}
        restaurantId={restaurantId}
      />
    </>
  );
}
