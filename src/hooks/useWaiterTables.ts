import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useNotifications } from '@/hooks/useNotifications';

type OrderItem = {
  id: string;
  quantity: number;
  quantityDelivered: number;
  priceAtOrder: string;
  kitchenStatus: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled' | 'partially_ready' | null;
  barStatus: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled' | 'partially_ready' | null;
  menuItem: {
    name: string;
    prepDepartment: {
      name: string;
    } | null;
  } | null;
};

type Order = {
  id: string;
  orderNumber: string;
  createdAt: string;
  total?: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'completed' | 'cancelled';
  billType: 'shared' | 'separate';
  loyaltyDiscount?: string | null;
  table?: {
    id: string;
    number: string;
    status: 'available' | 'occupied' | 'reserved' | 'needs_service';
  } | null;
  orderItems: OrderItem[];
};

type Table = {
  id: string;
  number: string;
  capacity: number | null;
  status: 'available' | 'occupied' | 'reserved' | 'needs_service';
  orders: Order[];
  hasWaiterCall: boolean;
};

export function useWaiterTables(initialTables: Table[]) {
  const router = useRouter();
  const [tables, setTables] = useState<Table[]>(initialTables);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Синхронизировать таблицы при изменении initialTables
  useEffect(() => {
    setTables(initialTables);
  }, [initialTables]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Проверяем, работаем ли в WebView
  const isWebView = typeof window !== 'undefined' && !!(window as any).ReactNativeWebView;

  // Подключение к SSE для real-time уведомлений (только для браузера)
  // В WebView используем push-уведомления через FCM
  useNotifications({
    onNotification: (notification) => {
      if (notification.type === 'new_order') {
        const { orderNumber, tableNumber } = notification.data;
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Новый заказ!', {
            body: `Заказ ${orderNumber} со столика ${tableNumber}`,
            icon: '/icon.png',
          });
        }
        router.refresh();
      } else if (notification.type === 'waiter_call') {
        const { tableNumber, message } = notification.data;
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Вызов официанта!', {
            body: message || `Столик ${tableNumber} вызывает официанта`,
            icon: '/icon.png',
          });
        }
        const audio = new Audio('/sounds/notification.mp3');
        audio.play().catch(() => {/* ignore */});
        router.refresh();
      } else if (notification.type === 'order_ready') {
        const { tableNumber, dishName } = notification.data;
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Блюдо готово!', {
            body: `${dishName} для стола ${tableNumber}`,
            icon: '/icon.png',
          });
        }
        const audio = new Audio('/sounds/notification.mp3');
        audio.play().catch(() => {/* ignore */});
        router.refresh();
      }
    },
    onConnect: () => {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    },
    onError: (error) => {
      // Логируем только реальные ошибки, игнорируем нормальные разрывы соединения
      if (!isWebView) {
        console.warn('[Waiter] Notification stream disconnected, reconnecting...');
      }
    },
    enabled: !isWebView, // Отключаем SSE для WebView (используем FCM push)
  });

  // Автообновление каждые 30 секунд для WebView, каждые 5 секунд для браузера
  // WebView получает push-уведомления через FCM, но нужно периодически обновлять данные
  useAutoRefresh(isWebView ? 30000 : 5000);

  useEffect(() => {
    setLastUpdate(new Date());
  }, [tables]);

  const getTimeAgo = () => {
    const seconds = Math.floor((new Date().getTime() - lastUpdate.getTime()) / 1000);
    if (seconds < 5) return 'только что';
    if (seconds < 60) return `${seconds} сек назад`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes} мин назад`;
  };

  return {
    tables,
    mounted,
    selectedTable,
    selectedOrder,
    setSelectedTable,
    setSelectedOrder,
    getTimeAgo,
  };
}
