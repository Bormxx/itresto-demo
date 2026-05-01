'use client';

import { useState, useEffect } from 'react';

type OrderItem = {
  id: string;
  quantity: number;
  priceAtOrder: string;
  menuItem: {
    id: string;
    name: string;
  } | null;
};

type Order = {
  id: string;
  orderNumber: string;
  createdAt: string;
  total: string;
  status: string;
  paymentMethod: string | null;
  loyaltyDiscount: string | null;
  table: {
    id: string;
    number: string;
  } | null;
  customer: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  orderItems: OrderItem[];
  shift: {
    id: string;
    startedAt: string;
    endedAt: string | null;
  } | null;
};

type Shift = {
  id: string;
  startedAt: string;
  endedAt: string | null;
};

type Table = {
  id: string;
  number: string;
};

type Props = {
  userId: string;
  shifts: Shift[];
  tables: Table[];
};

export function OrderHistoryContent({ userId, shifts, tables }: Props) {
  const [mode, setMode] = useState<'current' | 'period'>('current');
  const [selectedShift, setSelectedShift] = useState<string>('');
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Load orders on mount and when filters change
  useEffect(() => {
    loadOrders();
  }, [mode, selectedShift, selectedTable, fromDate, toDate]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('mode', mode);
      if (selectedShift) params.set('shiftId', selectedShift);
      if (selectedTable) params.set('tableId', selectedTable);
      if (mode === 'period' && fromDate) params.set('from', fromDate);
      if (mode === 'period' && toDate) params.set('to', toDate);

      const response = await fetch(`/api/waiter/order-history?${params}`);
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Failed to load orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Group orders by date and shift
  const groupedOrders = orders.reduce((acc, order) => {
    const date = new Date(order.createdAt).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    
    if (!acc[date]) {
      acc[date] = {};
    }

    const shiftKey = order.shift?.id || 'no-shift';
    if (!acc[date][shiftKey]) {
      acc[date][shiftKey] = {
        shift: order.shift,
        orders: [],
      };
    }

    acc[date][shiftKey].orders.push(order);
    return acc;
  }, {} as Record<string, Record<string, { shift: Order['shift']; orders: Order[] }>>);

  const resetFilters = () => {
    setSelectedShift('');
    setSelectedTable('');
    setFromDate('');
    setToDate('');
  };

  const getPaymentTypeLabel = (order: Order) => {
    // Если есть paymentMethod, значит клиент оплатил сам
    if (order.paymentMethod) {
      return 'Закрыто клиентом';
    }
    return 'Закрыто официантом';
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-[#111827]">Фильтры</h2>
        
        {/* Mode Selection */}
        <div className="mb-4 flex gap-4">
          <button
            onClick={() => {
              setMode('current');
              resetFilters();
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              mode === 'current'
                ? 'bg-[#10b981] text-white'
                : 'bg-[#f3f4f6] text-[#111827] hover:bg-[#e5e7eb]'
            }`}
          >
            Текущая смена
          </button>
          <button
            onClick={() => {
              setMode('period');
              resetFilters();
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              mode === 'period'
                ? 'bg-[#10b981] text-white'
                : 'bg-[#f3f4f6] text-[#111827] hover:bg-[#e5e7eb]'
            }`}
          >
            За период
          </button>
        </div>

        {/* Period Date Pickers */}
        {mode === 'period' && (
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#374151]">
                От
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded-lg border border-[#d1d5db] px-4 py-2 text-[#111827] focus:border-[#10b981] focus:outline-none focus:ring-2 focus:ring-[#10b981]"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[#374151]">
                До
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-lg border border-[#d1d5db] px-4 py-2 text-[#111827] focus:border-[#10b981] focus:outline-none focus:ring-2 focus:ring-[#10b981]"
              />
            </div>
          </div>
        )}

        {/* Shift Filter */}
        {mode === 'period' && (
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-[#374151]">
              По смене
            </label>
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="w-full rounded-lg border border-[#d1d5db] px-4 py-2 focus:border-[#10b981] focus:outline-none focus:ring-2 focus:ring-[#10b981]"
            >
              <option value="">Все смены</option>
              {shifts.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {new Date(shift.startedAt).toLocaleString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {shift.endedAt && (
                    <> — {new Date(shift.endedAt).toLocaleTimeString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}</>
                  )}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Table Filter */}
        <div>
          <label className="mb-2 block text-sm font-medium text-[#374151]">
            По столику
          </label>
          <select
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
            className="w-full rounded-lg border border-[#d1d5db] px-4 py-2 focus:border-[#10b981] focus:outline-none focus:ring-2 focus:ring-[#10b981]"
          >
            <option value="">Все столики</option>
            {tables.map((table) => (
              <option key={table.id} value={table.id}>
                Столик {table.number}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-6">
        {loading ? (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[#10b981] border-t-transparent"></div>
            <p className="mt-4 text-[#6b7280]">Загрузка...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm">
            <p className="text-[#6b7280]">Заказов не найдено</p>
          </div>
        ) : (
          Object.entries(groupedOrders).map(([date, shifts]) => (
            <div key={date} className="rounded-xl bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-[#111827]">
                {date}
              </h3>
              
              {Object.entries(shifts).map(([shiftKey, { shift, orders: shiftOrders }]) => (
                <div key={shiftKey} className="mb-6 last:mb-0">
                  {shift && (
                    <div className="mb-3 text-sm text-[#6b7280]">
                      Смена: {new Date(shift.startedAt).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {shift.endedAt && (
                        <> — {new Date(shift.endedAt).toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}</>
                      )}
                    </div>
                  )}
                  
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {shiftOrders.map((order) => (
                      <button
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        className="rounded-lg border border-[#d1d5db] p-4 text-left transition hover:border-[#10b981] hover:bg-[#f0fdf4]"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className="font-semibold text-[#111827]">
                            #{order.orderNumber}
                          </span>
                          <span className="rounded bg-[#f3f4f6] px-2 py-1 text-xs font-medium text-[#6b7280]">
                            Стол {order.table?.number || '—'}
                          </span>
                        </div>
                        <div className="text-sm text-[#6b7280]">
                          {new Date(order.createdAt).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        <div className="mt-2 text-lg font-bold text-[#10b981]">
                          {Number(order.total).toLocaleString('ru-RU', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          })} ₸
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#111827]">
                Заказ #{selectedOrder.orderNumber}
              </h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="rounded-lg p-2 text-[#6b7280] transition hover:bg-[#f3f4f6]"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Customer Info */}
            <div className="mb-4 rounded-lg bg-[#f9fafb] p-4">
              <div className="text-sm text-[#6b7280]">Клиент</div>
              <div className="text-[#111827]">
                {selectedOrder.customer ? (
                  <>
                    ID: {selectedOrder.customer.id}
                    {(selectedOrder.customer.firstName || selectedOrder.customer.lastName) && (
                      <span className="ml-2">
                        ({selectedOrder.customer.firstName} {selectedOrder.customer.lastName})
                      </span>
                    )}
                  </>
                ) : (
                  'Неавторизованный'
                )}
              </div>
            </div>

            {/* Order Items */}
            <div className="mb-4">
              <div className="mb-2 text-sm font-medium text-[#6b7280]">Состав заказа</div>
              <div className="space-y-2">
                {selectedOrder.orderItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-[#e5e7eb] p-3"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-[#111827]">
                        {item.menuItem?.name || 'Неизвестное блюдо'}
                      </div>
                      <div className="text-sm text-[#6b7280]">
                        {item.quantity} × {Number(item.priceAtOrder).toLocaleString('ru-RU')} ₸
                      </div>
                    </div>
                    <div className="font-semibold text-[#111827]">
                      {(Number(item.priceAtOrder) * item.quantity).toLocaleString('ru-RU')} ₸
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Discount */}
            <div className="mb-4 rounded-lg bg-[#f9fafb] p-4">
              <div className="text-sm text-[#6b7280]">Скидки</div>
              <div className="text-[#111827]">
                {selectedOrder.loyaltyDiscount && Number(selectedOrder.loyaltyDiscount) > 0 ? (
                  `Скидка: ${Number(selectedOrder.loyaltyDiscount).toLocaleString('ru-RU')} ₸`
                ) : (
                  'Без скидок'
                )}
              </div>
            </div>

            {/* Payment Type */}
            <div className="mb-4 rounded-lg bg-[#f9fafb] p-4">
              <div className="text-sm text-[#6b7280]">Тип оплаты</div>
              <div className="text-[#111827]">{getPaymentTypeLabel(selectedOrder)}</div>
            </div>

            {/* Total */}
            <div className="border-t border-[#e5e7eb] pt-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-[#111827]">Итого</span>
                <span className="text-2xl font-bold text-[#10b981]">
                  {Number(selectedOrder.total).toLocaleString('ru-RU', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })} ₸
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
