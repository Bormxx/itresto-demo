'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type OrderItem = {
  id: string;
  quantity: number;
  barStatus: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled' | 'partially_ready' | null;
  menuItem: {
    id: string;
    name: string;
  } | null;
};

type Order = {
  id: string;
  orderNumber: string;
  createdAt: Date;
  table: {
    number: string;
  } | null;
  orderItems: OrderItem[];
};

export function BarOrderCard({ order }: { order: Order }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateStatus = async (itemId: string, status: 'preparing' | 'ready') => {
    setLoading(itemId);
    try {
      const response = await fetch(`/api/order-items/${itemId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          statusType: 'bar',
          status,
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка при обновлении статуса');
      }

      router.refresh();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Ошибка при обновлении статуса');
    } finally {
      setLoading(null);
    }
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `${seconds} сек назад`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} мин назад`;
    const hours = Math.floor(minutes / 60);
    return `${hours} ч назад`;
  };

  return (
    <div className="rounded-lg bg-[#ffffff] p-4 shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <span className="font-mono text-lg font-bold text-[#2563eb]">
            {order.orderNumber}
          </span>
          {order.table && (
            <span className="ml-3 text-sm text-[#4b5563]">
              Столик {order.table.number}
            </span>
          )}
        </div>
        <span className="text-xs text-[#6b7280]">
          {mounted ? getTimeAgo(order.createdAt) : '--'}
        </span>
      </div>

      <div className="space-y-3">
        {order.orderItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-lg border-2 border-[#e5e7eb] bg-[#f9fafb] p-3"
          >
            <div className="flex-1">
              <div className="font-semibold text-[#111827]">
                {item.menuItem?.name || 'Напиток'} × {item.quantity}
              </div>
              <div className="mt-1 text-xs text-[#6b7280]">
                {item.barStatus === 'pending' && (
                  <span className="rounded-full bg-[#fee2e2] px-2 py-1 text-[#b91c1c]">
                    Новое
                  </span>
                )}
                {item.barStatus === 'preparing' && (
                  <span className="rounded-full bg-[#ffedd5] px-2 py-1 text-[#c2410c]">
                    Готовится
                  </span>
                )}
              </div>
            </div>

            <div className="ml-4 flex gap-2">
              {item.barStatus === 'pending' && (
                <button
                  onClick={() => updateStatus(item.id, 'preparing')}
                  disabled={loading === item.id}
                  className="rounded-lg bg-[#ea580c] px-4 py-2 text-sm font-semibold text-[#ffffff] hover:bg-[#c2410c] disabled:opacity-50"
                >
                  {loading === item.id ? '...' : 'Принять'}
                </button>
              )}
              {item.barStatus === 'preparing' && (
                <button
                  onClick={() => updateStatus(item.id, 'ready')}
                  disabled={loading === item.id}
                  className="rounded-lg bg-[#16a34a] px-4 py-2 text-sm font-semibold text-[#ffffff] hover:bg-[#15803d] disabled:opacity-50"
                >
                  {loading === item.id ? '...' : 'Готово'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
