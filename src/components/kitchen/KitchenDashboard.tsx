'use client';

import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useOrderNotification } from '@/hooks/useOrderNotification';
import { KitchenOrderCard } from './KitchenOrderCard';
import Modal from '@/components/ui/Modal';
import MenuActivationClient from '@/components/manager/MenuActivationClient';
import { useState, useEffect } from 'react';

type OrderItem = {
  id: string;
  quantity: number;
  kitchenStatus: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled' | 'partially_ready' | null;
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

type Props = {
  initialOrders: Order[];
  restaurantId: string;
  notAssigned?: boolean;
};

export function KitchenDashboard({ initialOrders, restaurantId, notAssigned = false }: Props) {
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [orders, setOrders] = useState(initialOrders);
  const [mounted, setMounted] = useState(false);
  const [isMenuActivationOpen, setIsMenuActivationOpen] = useState(false);

  // Синхронизировать заказы при изменении initialOrders
  useEffect(() => {
    setOrders(initialOrders);
    setLastUpdate(new Date());
  }, [initialOrders]);

  // Автообновление каждые 5 секунд
  useAutoRefresh(5000);

  // Звуковое уведомление при новых заказах (считаем заказы с pending items)
  const pendingCount = orders.filter(order => 
    order.orderItems.some(item => item.kitchenStatus === 'pending')
  ).length;
  useOrderNotification(pendingCount);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getTimeAgo = () => {
    const seconds = Math.floor((new Date().getTime() - lastUpdate.getTime()) / 1000);
    if (seconds < 5) return 'только что';
    if (seconds < 60) return `${seconds} сек назад`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes} мин назад`;
  };

  return (
    <>
      {/* Модалка для неназначенных сотрудников */}
      {notAssigned && (
        <Modal
          isOpen={true}
          onClose={() => {}}
          title="Нет назначения в смену"
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              Вы не назначены на текущую смену. Обратитесь к менеджеру.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => window.location.href = '/'}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                На главную
              </button>
            </div>
          </div>
        </Modal>
      )}

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-sm text-[#6b7280]">
            Обновлено: {mounted ? getTimeAgo() : 'загрузка...'}
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-[#22c55e]"></div>
            <span className="text-xs text-[#4b5563]">Автообновление</span>
          </div>
        </div>
        <button
          onClick={() => setIsMenuActivationOpen(true)}
          className="rounded-lg bg-[#3b82f6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563eb] transition"
        >
          Активация блюд меню
        </button>
      </div>

      <div>
        <section>
          <h2 className="mb-4 text-xl font-bold text-[#111827]">
            Все заказы ({orders.length})
          </h2>
          {orders.length === 0 ? (
            <div className="rounded-lg bg-[#ffffff] p-8 text-center text-[#6b7280] shadow">
              Нет заказов
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <KitchenOrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </section>
      </div>

      <Modal
        isOpen={isMenuActivationOpen}
        onClose={() => setIsMenuActivationOpen(false)}
        title="Активация блюд меню"
        size="full"
      >
        <MenuActivationClient
          restaurantId={restaurantId}
          supportedLocales={['ru']}
        />
      </Modal>
    </>
  );
}
