'use client';

import { useState, useEffect } from 'react';

type AnalyticsData = {
  period: {
    days: number;
    startDate: string;
  };
  revenue: {
    total: string;
    ordersCount: number;
    averageCheck: string;
  };
  activeOrders: {
    total: number;
    byStatus: {
      pending: number;
      preparing: number;
      ready: number;
    };
  };
  popularItems: Array<{
    id: number;
    name: string;
    totalQuantity: number;
    totalRevenue: string;
    orderCount: number;
  }>;
};

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7');

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?period=${period}`);
      if (res.ok) {
        const analytics = await res.json();
        setData(analytics);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-[#4b5563]">Загрузка...</div>;
  }

  if (!data) {
    return (
      <div className="rounded-lg bg-[#fef2f2] p-4 text-[#991b1b]">
        Ошибка загрузки данных
      </div>
    );
  }

  return (
    <div>
      {/* Фильтр периода */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setPeriod('1')}
          className={`rounded-lg px-4 py-2 font-medium transition ${
            period === '1'
              ? 'bg-[#2563eb] text-[#ffffff]'
              : 'bg-[#ffffff] text-[#374151] hover:bg-[#f9fafb]'
          }`}
        >
          Сегодня
        </button>
        <button
          onClick={() => setPeriod('7')}
          className={`rounded-lg px-4 py-2 font-medium transition ${
            period === '7'
              ? 'bg-[#2563eb] text-[#ffffff]'
              : 'bg-[#ffffff] text-[#374151] hover:bg-[#f9fafb]'
          }`}
        >
          7 дней
        </button>
        <button
          onClick={() => setPeriod('30')}
          className={`rounded-lg px-4 py-2 font-medium transition ${
            period === '30'
              ? 'bg-[#2563eb] text-[#ffffff]'
              : 'bg-[#ffffff] text-[#374151] hover:bg-[#f9fafb]'
          }`}
        >
          30 дней
        </button>
        <button
          onClick={() => setPeriod('90')}
          className={`rounded-lg px-4 py-2 font-medium transition ${
            period === '90'
              ? 'bg-[#2563eb] text-[#ffffff]'
              : 'bg-[#ffffff] text-[#374151] hover:bg-[#f9fafb]'
          }`}
        >
          90 дней
        </button>
      </div>

      {/* KPI карточки */}
      <div className="mb-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-[#ffffff] p-6 shadow">
          <div className="mb-2 text-sm font-medium text-[#4b5563]">
            Выручка за период
          </div>
          <div className="text-3xl font-bold text-[#111827]">
            {parseFloat(data.revenue.total).toLocaleString('ru-RU')} ₽
          </div>
          <div className="mt-1 text-xs text-[#6b7280]">
            {data.period.days} {data.period.days === 1 ? 'день' : 'дней'}
          </div>
        </div>

        <div className="rounded-lg bg-[#ffffff] p-6 shadow">
          <div className="mb-2 text-sm font-medium text-[#4b5563]">
            Завершённых заказов
          </div>
          <div className="text-3xl font-bold text-[#111827]">
            {data.revenue.ordersCount}
          </div>
          <div className="mt-1 text-xs text-[#6b7280]">За период</div>
        </div>

        <div className="rounded-lg bg-[#ffffff] p-6 shadow">
          <div className="mb-2 text-sm font-medium text-[#4b5563]">
            Средний чек
          </div>
          <div className="text-3xl font-bold text-[#111827]">
            {parseFloat(data.revenue.averageCheck).toLocaleString('ru-RU')} ₽
          </div>
          <div className="mt-1 text-xs text-[#6b7280]">На заказ</div>
        </div>

        <div className="rounded-lg bg-[#ffffff] p-6 shadow">
          <div className="mb-2 text-sm font-medium text-[#4b5563]">
            Активные заказы
          </div>
          <div className="text-3xl font-bold text-[#111827]">
            {data.activeOrders.total}
          </div>
          <div className="mt-1 flex gap-2 text-xs text-[#6b7280]">
            <span>⏳ {data.activeOrders.byStatus.pending}</span>
            <span>👨‍🍳 {data.activeOrders.byStatus.preparing}</span>
            <span>✅ {data.activeOrders.byStatus.ready}</span>
          </div>
        </div>
      </div>

      {/* Популярные блюда */}
      <div className="rounded-lg bg-[#ffffff] p-6 shadow">
        <h2 className="mb-4 text-xl font-bold text-[#111827]">
          Популярные блюда
        </h2>
        {data.popularItems.length === 0 ? (
          <p className="text-[#6b7280]">Нет данных за выбранный период</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#6b7280]">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#6b7280]">
                    Блюдо
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[#6b7280]">
                    Продано
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[#6b7280]">
                    Выручка
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[#6b7280]">
                    В заказах
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-[#ffffff]">
                {data.popularItems.map((item, index) => (
                  <tr
                    key={item.id}
                    className={index < 3 ? 'bg-[#fefce8]' : ''}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-[#111827]">
                      {index === 0 && '🥇'}
                      {index === 1 && '🥈'}
                      {index === 2 && '🥉'}
                      {index > 2 && index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#111827]">
                      {item.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-[#111827]">
                      {item.totalQuantity}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-[#111827]">
                      {parseFloat(item.totalRevenue).toLocaleString('ru-RU')} ₽
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-[#6b7280]">
                      {item.orderCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
