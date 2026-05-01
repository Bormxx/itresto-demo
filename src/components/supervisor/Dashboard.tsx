'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import TableIcon from '@/components/icons/TableIcon';
import MenuIcon from '@/components/icons/MenuIcon';
import OrdersIcon from '@/components/icons/OrdersIcon';

interface ShiftInfo {
  id: string;
  startedAt: string;
  managerName: string | null;
  workingStaff: number;
}

interface RestaurantStats {
  totalTables: number;
  totalMenuItems: number;
  activeOrders: number;
  supportedLocales: string[];
}

export default function Dashboard({ restaurantId }: { restaurantId: string }) {
  const params = useParams();
  const locale = (params.locale as string) || 'ru';
  const t = useTranslations('supervisor');
  
  const [shift, setShift] = useState<ShiftInfo | null>(null);
  const [stats, setStats] = useState<RestaurantStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [restaurantId]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`/api/supervisor/dashboard?restaurantId=${restaurantId}`);
      if (response.ok) {
        const data = await response.json();
        setShift(data.shift);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mb-8">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-24 bg-gray-200 rounded-lg"></div>
            <div className="h-24 bg-gray-200 rounded-lg"></div>
            <div className="h-24 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8 space-y-6">
      {/* Информация о смене */}
      {shift ? (
        <div className="bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('currentShift')}
              </h3>
              <div className="mt-3 space-y-2 text-sm text-gray-700">
                <p>
                  <span className="font-medium">{t('shiftStart')}:</span>{' '}
                  {new Date(shift.startedAt).toLocaleString(locale, {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                {shift.managerName && (
                  <p>
                    <span className="font-medium">{t('manager')}:</span> {shift.managerName}
                  </p>
                )}
                <p>
                  <span className="font-medium">{t('staffOnDuty')}:</span> {shift.workingStaff}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-sm">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="font-semibold text-gray-900">{t('noShift')}</h3>
              <p className="text-sm text-gray-600 mt-1">
                {t('noShiftDescription')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Статистика */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('tables')}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalTables}</p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
                <TableIcon className="w-7 h-7 text-green-700" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('menuItems')}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalMenuItems}</p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-full">
                <MenuIcon className="w-7 h-7 text-yellow-700" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('activeOrders')}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.activeOrders}</p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full">
                <OrdersIcon className="w-6 h-6 text-purple-700" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
