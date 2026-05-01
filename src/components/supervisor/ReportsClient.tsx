'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import ReportsIcon from '@/components/icons/ReportsIcon';
import OrdersIcon from '@/components/icons/OrdersIcon';
import OrderDetailsModal from '@/components/supervisor/OrderDetailsModal';
import { exportToExcel, exportToCSV, exportStatsToExcel } from '@/lib/exportUtils';
import { toast } from '@/lib/toast';

interface Order {
  id: string;
  orderNumber: string;
  totalAmount: number;
  discount: number;
  billType: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  tableNumber: string | null;
  waiterName: string | null;
  waiterId: string | null;
  clientId: string | null;
  guestDeviceId: string | null;
}

interface Stats {
  totalOrders: number;
  totalRevenue: number;
  avgCheck: number;
  completedOrders: number;
}

interface PopularItem {
  itemName: string;
  quantity: number;
  revenue: number;
}

interface ReportsData {
  orders: Order[];
  stats: Stats;
  popularItems: PopularItem[];
}

interface Waiter {
  id: string;
  name: string;
}

export default function ReportsClient({
  restaurantId,
  locale,
}: {
  restaurantId: string;
  locale: string;
}) {
  const t = useTranslations('reports');
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Filters
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [waiterId, setWaiterId] = useState('');
  const [clientId, setClientId] = useState('');

  // Filter options
  const [waiters, setWaiters] = useState<Waiter[]>([]);

  useEffect(() => {
    fetchFilterOptions();
  }, [restaurantId]);

  useEffect(() => {
    fetchData();
  }, [restaurantId, dateFrom, dateTo, waiterId, clientId]);

  const fetchFilterOptions = async () => {
    try {
      const waitersRes = await fetch(`/api/supervisor/staff?restaurantId=${restaurantId}`);

      if (waitersRes.ok) {
        const waitersData = await waitersRes.json();
        // Фильтруем только официантов и форматируем данные
        const waitersFormatted = Array.isArray(waitersData)
          ? waitersData
              .filter((staff: any) => staff.role === 'waiter')
              .map((staff: any) => ({
                id: staff.id,
                name: `${staff.firstName || ''} ${staff.lastName || ''}`.trim(),
              }))
          : [];
        setWaiters(waitersFormatted);
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        restaurantId,
        dateFrom,
        dateTo,
      });

      if (waiterId) params.append('waiterId', waiterId);
      if (clientId) params.append('clientId', clientId);

      const response = await fetch(`/api/supervisor/reports?${params}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (!data || data.orders.length === 0) {
      toast.warning('Нет данных для экспорта', 'Сначала загрузите отчёты');
      return;
    }

    try {
      const exportData = data.orders.map(order => ({
        id: order.id,
        createdAt: order.createdAt,
        tableNumber: order.tableNumber ? parseInt(order.tableNumber) : undefined,
        guestType: 'individual',
        billType: order.billType,
        totalAmount: order.totalAmount.toString(),
        discountAmount: order.discount ? order.discount.toString() : null,
        finalAmount: (order.totalAmount - (order.discount || 0)).toString(),
        paymentMethod: null,
        status: order.status,
        waiterName: order.waiterName || undefined,
        clientName: undefined,
      }));

      exportToExcel(exportData, {
        filename: `orders_${dateFrom}_${dateTo}.xlsx`,
      });

      toast.success('Экспорт завершён', `Файл orders_${dateFrom}_${dateTo}.xlsx сохранён`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Ошибка экспорта', 'Не удалось экспортировать данные');
    }
  };

  const handleExportCSV = () => {
    if (!data || data.orders.length === 0) {
      toast.warning('Нет данных для экспорта', 'Сначала загрузите отчёты');
      return;
    }

    try {
      const exportData = data.orders.map(order => ({
        id: order.id,
        createdAt: order.createdAt,
        tableNumber: order.tableNumber ? parseInt(order.tableNumber) : undefined,
        guestType: 'individual',
        billType: order.billType,
        totalAmount: order.totalAmount.toString(),
        discountAmount: order.discount ? order.discount.toString() : null,
        finalAmount: (order.totalAmount - (order.discount || 0)).toString(),
        paymentMethod: null,
        status: order.status,
        waiterName: order.waiterName || undefined,
        clientName: undefined,
      }));

      exportToCSV(exportData, {
        filename: `orders_${dateFrom}_${dateTo}.csv`,
      });

      toast.success('Экспорт завершён', `Файл orders_${dateFrom}_${dateTo}.csv сохранён`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Ошибка экспорта', 'Не удалось экспортировать данные');
    }
  };

  const handleExportStats = () => {
    if (!data) {
      toast.warning('Нет данных для экспорта', 'Сначала загрузите отчёты');
      return;
    }

    try {
      exportStatsToExcel(
        {
          totalOrders: data.stats.totalOrders,
          totalRevenue: data.stats.totalRevenue.toString(),
          avgCheck: data.stats.avgCheck.toString(),
          completedOrders: data.stats.completedOrders,
        },
        data.popularItems.map(item => ({
          name: item.itemName,
          count: item.quantity,
          revenue: item.revenue.toString(),
        })),
        {
          filename: `statistics_${dateFrom}_${dateTo}.xlsx`,
        }
      );

      toast.success('Экспорт завершён', `Файл statistics_${dateFrom}_${dateTo}.xlsx сохранён`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Ошибка экспорта', 'Не удалось экспортировать статистику');
    }
  };

  const statusLabels: Record<string, string> = {
    pending: 'Ожидает',
    confirmed: 'Подтверждён',
    preparing: 'Готовится',
    ready: 'Готов',
    delivered: 'Доставлен',
    completed: 'Завершён',
    cancelled: 'Отменён',
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    preparing: 'bg-purple-100 text-purple-800',
    ready: 'bg-green-100 text-green-800',
    delivered: 'bg-teal-100 text-teal-800',
    completed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-lg bg-gray-200"></div>
        <div className="grid grid-cols-3 gap-4">
          <div className="h-24 animate-pulse rounded-lg bg-gray-200"></div>
          <div className="h-24 animate-pulse rounded-lg bg-gray-200"></div>
          <div className="h-24 animate-pulse rounded-lg bg-gray-200"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800">
        Ошибка загрузки данных
      </div>
    );
  }

  return (
    <>
      {/* Filters */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 font-medium text-gray-900">Фильтры</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              С даты
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-[#111827] focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              По дату
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-[#111827] focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Официант
            </label>
            <select
              value={waiterId}
              onChange={(e) => setWaiterId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Все официанты</option>
              {waiters.map((waiter) => (
                <option key={waiter.id} value={waiter.id}>
                  {waiter.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ID клиента
            </label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Введите ID клиента"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-[#111827] focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Всего заказов</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{data.stats.totalOrders}</p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full">
              <OrdersIcon className="w-7 h-7 text-blue-700" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Общая выручка</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {Math.round(data.stats.totalRevenue).toLocaleString('ru-RU')} ₽
              </p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
              <ReportsIcon className="w-7 h-7 text-green-700" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Средний чек</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {Math.round(data.stats.avgCheck).toLocaleString('ru-RU')} ₽
              </p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full">
              <span className="text-2xl">💰</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Завершённых</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{data.stats.completedOrders}</p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-teal-100 rounded-full">
              <span className="text-2xl">✓</span>
            </div>
          </div>
        </div>
      </div>

      {/* Popular items */}
      {data.popularItems.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 font-medium text-gray-900">Популярные блюда</h3>
          <div className="space-y-3">
            {data.popularItems.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-700">
                    {index + 1}
                  </span>
                  <span className="font-medium text-gray-900">{item.itemName}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">× {item.quantity}</p>
                  <p className="font-medium text-gray-900">
                    {Math.round(item.revenue).toLocaleString('ru-RU')} ₽
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Orders table */}
      <div className="rounded-lg bg-white shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-medium text-gray-900">Заказы</h3>
          <div className="flex gap-2">
            <button
              onClick={handleExportStats}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center gap-2"
              title="Экспорт статистики"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Статистика
            </button>
            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
              title="Экспорт в Excel"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Excel
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
              title="Экспорт в CSV"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              CSV
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Номер
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Дата
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Стол
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Официант
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Сумма
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Заказов не найдено
                  </td>
                </tr>
              ) : (
                data.orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{order.orderNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(order.createdAt).toLocaleString(locale, {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {order.tableNumber || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {order.waiterName || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.totalAmount.toLocaleString('ru-RU')} ₽
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          statusColors[order.status] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {statusLabels[order.status] || order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setSelectedOrderId(order.id)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Детали
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <OrderDetailsModal
        isOpen={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        orderId={selectedOrderId}
      />
    </>
  );
}
