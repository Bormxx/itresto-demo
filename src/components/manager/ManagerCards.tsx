'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import Card from '@/components/ui/Card';
import CalendarIcon from '@/components/icons/CalendarIcon';
import MenuIcon from '@/components/icons/MenuIcon';
import EditIcon from '@/components/icons/EditIcon';
import OrdersIcon from '@/components/icons/OrdersIcon';
import ReportsIcon from '@/components/icons/ReportsIcon';
import ActionsIcon from '@/components/icons/ActionsIcon';
import TableIcon from '@/components/icons/TableIcon';

interface ManagerCardsProps {
  baseUrl: string;
}

export default function ManagerCards({ baseUrl }: ManagerCardsProps) {
  const t = useTranslations('manager.cards');

  const cards = [
    {
      href: `${baseUrl}/shifts`,
      icon: CalendarIcon,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-700',
      title: t('shifts'),
      description: t('shiftsDescription'),
    },
    {
      href: `${baseUrl}/menu`,
      icon: MenuIcon,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-700',
      title: t('menu'),
      description: t('menuDescription'),
    },
    {
      href: `${baseUrl}/menu/manage`,
      icon: EditIcon,
      iconBg: 'bg-teal-100',
      iconColor: 'text-teal-700',
      title: t('menuManagement'),
      description: t('menuManagementDescription'),
    },
    {
      href: `${baseUrl}/orders`,
      icon: OrdersIcon,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-700',
      title: t('orders'),
      description: t('ordersDescription'),
    },
    {
      href: `${baseUrl}/reports`,
      icon: ReportsIcon,
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-700',
      title: t('reports'),
      description: t('reportsDescription'),
    },
    {
      href: `${baseUrl}/conflicts`,
      icon: ActionsIcon,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-700',
      title: t('conflicts'),
      description: t('conflictsDescription'),
    },
    {
      href: `${baseUrl}/reservations`,
      icon: TableIcon,
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-700',
      title: t('reservations'),
      description: t('reservationsDescription'),
    },
  ];

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Link key={card.href} href={card.href}>
          <Card hoverable className="h-full transition-all">
            <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${card.iconBg}`}>
              <card.icon className={`w-6 h-6 ${card.iconColor}`} />
            </div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">
              {card.title}
            </h2>
            <p className="text-sm text-gray-600">
              {card.description}
            </p>
          </Card>
        </Link>
      ))}
    </div>
  );
}
