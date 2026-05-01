import { useState } from 'react';
import ReservationBadge from './ReservationBadge';

type OrderItem = {
  id: string;
  quantity: number;
  quantityDelivered: number;
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
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'completed' | 'cancelled';
  billType: 'shared' | 'separate';
  orderItems: OrderItem[];
};

type Table = {
  id: string;
  number: string;
  capacity: number | null;
  status: 'available' | 'occupied' | 'reserved' | 'needs_service';
  orders: Order[];
};

type WaiterCall = {
  id: string;
  tableId: string;
  acknowledgedAt: string | null;
};

type Reservation = {
  id: string;
  tableId: string;
  reservedFrom: string;
  reservedTo: string;
  actualStartTime: string | null;
};

interface TableCardProps {
  table: Table;
  activeOrders: Order[];
  waiterCall: WaiterCall | undefined;
  tableReservations: Reservation[];
  onAcknowledgeCall: (tableId: string) => void;
  onOpenOrder: (order: Order, table: Table) => void;  // order первый!
  onCloseAllShared?: (tableId: string, orderIds: string[]) => Promise<void>;
}

// Helper functions
function isItemReady(item: OrderItem): boolean {
  const deptName = item.menuItem?.prepDepartment?.name;
  if (deptName === 'Бар') {
    return item.barStatus === 'ready';
  }
  // По умолчанию (для "Кухня" и других отделов) используем kitchenStatus
  return item.kitchenStatus === 'ready';
}

function getTableColor(table: Table, waiterCall: WaiterCall | undefined): string {
  if (waiterCall) {
    return 'bg-[#ef4444] text-[#ffffff]';
  }

  const activeOrders = table.orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled');
  
  if (activeOrders.length === 0) {
    if (table.status === 'reserved') {
      return 'bg-[#60a5fa] text-[#ffffff]';
    }
    return 'bg-[#4ade80] text-[#ffffff]';
  }

  return 'bg-[#f3f4f6] text-[#111827]';
}

function getOrderButtonColor(order: Order): string {
  const orderItems = order.orderItems || [];
  const hasReadyItemsToPickup = orderItems.some(item => {
    if (item.quantityDelivered >= item.quantity) {
      return false;
    }
    return isItemReady(item);
  });
  
  if (hasReadyItemsToPickup) {
    return 'bg-purple-500 text-[#ffffff] hover:bg-purple-600';
  }

  const hasPendingItems = orderItems.some(item => {
    const deptName = item.menuItem?.prepDepartment?.name;
    if (deptName === 'Бар') {
      return item.barStatus === 'pending';
    }
    // По умолчанию (для "Кухня" и других отделов) используем kitchenStatus
    return item.kitchenStatus === 'pending';
  });

  if (hasPendingItems) {
    return 'bg-[#fb923c] text-[#ffffff] hover:bg-[#f97316]';
  }

  return 'bg-[#facc15] text-[#111827] hover:bg-[#eab308]';
}

function getOrderStatusLabel(order: Order): string {
  const orderItems = order.orderItems || [];
  const hasReadyItemsToPickup = orderItems.some(item => {
    if (item.quantityDelivered >= item.quantity) {
      return false;
    }
    return isItemReady(item);
  });
  
  if (hasReadyItemsToPickup) {
    return 'Готовые блюда';
  }

  const hasPendingItems = orderItems.some(item => {
    const deptName = item.menuItem?.prepDepartment?.name;
    if (deptName === 'Бар') {
      return item.barStatus === 'pending';
    }
    // По умолчанию (для "Кухня" и других отделов) используем kitchenStatus
    return item.kitchenStatus === 'pending';
  });

  if (hasPendingItems) {
    return 'Новый заказ';
  }

  return 'Заказ в работе';
}

export default function TableCard({
  table,
  activeOrders,
  waiterCall,
  tableReservations,
  onAcknowledgeCall,
  onOpenOrder,
  onCloseAllShared,
}: TableCardProps) {
  const now = new Date();
  const [isClosingAll, setIsClosingAll] = useState(false);

  // Группируем заказы по типу счета
  const sharedOrders = activeOrders.filter(order => order.billType === 'shared');
  const separateOrders = activeOrders.filter(order => order.billType === 'separate');

  const handleCloseAllShared = async () => {
    if (!onCloseAllShared || sharedOrders.length === 0) return;
    
    const confirmed = confirm(`Закрыть все ${sharedOrders.length} заказ(а/ов) с совместным счётом?`);
    if (!confirmed) return;

    setIsClosingAll(true);
    try {
      const orderIds = sharedOrders.map(o => o.id);
      await onCloseAllShared(table.id, orderIds);
    } catch (error) {
      console.error('Error closing shared orders:', error);
      alert('Ошибка при закрытии заказов');
    } finally {
      setIsClosingAll(false);
    }
  }

  return (
    <div
      className={`relative rounded-xl p-4 shadow-lg transition-transform hover:scale-105 ${getTableColor(table, waiterCall)}`}
    >
      {waiterCall && (
        <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#ffffff] text-[#dc2626] shadow-lg animate-bounce">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
      )}

      <div className="mb-3 text-center">
        <div className="text-2xl font-bold">
          Столик {table.number}
        </div>
        <div className="space-y-3">
          {/* Совместные заказы */}
          {sharedOrders.length > 0 && (
            <fieldset className="rounded-lg border-2 border-[#3b82f6] bg-[#dbeafe] bg-opacity-30 p-2">
              <legend className="px-2 text-xs font-semibold text-[#1e40af]">
                Совместный счёт ({sharedOrders.length})
              </legend>
              
              <div className="space-y-2">
                {sharedOrders.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => onOpenOrder(order, table)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition shadow-md ${getOrderButtonColor(order)}`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{order.orderNumber}</span>
                      <span className="text-xs opacity-90">
                        {(order.orderItems || []).length} поз.
                      </span>
                    </div>
                    <div className="text-xs opacity-75 mt-1">
                      Статус: {getOrderStatusLabel(order)}
                    </div>
                  </button>
                ))}

                {/* Чекбокс "Закрыть целиком" */}
                {onCloseAllShared && sharedOrders.length > 1 && (
                  <button
                    onClick={handleCloseAllShared}
                    disabled={isClosingAll}
                    className="w-full rounded-lg bg-[#10b981] px-3 py-2 text-sm font-semibold text-[#ffffff] transition hover:bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isClosingAll ? '⏳ Закрываю...' : '✓ Закрыть целиком'}
                  </button>
                )}
              </div>
            </fieldset>
          )}

          {/* Раздельные заказы */}
          {separateOrders.length > 0 && (
            <div className="space-y-2">
              {sharedOrders.length > 0 && (
                <div className="text-xs font-semibold text-[#6b7280] px-2">
                  Раздельные счета ({separateOrders.length})
                </div>
              )}
              {separateOrders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => onOpenOrder(order, table)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition shadow-md ${getOrderButtonColor(order)}`}
                >
                  <div className="flex items-center justify-between">
                    <span>{order.orderNumber}</span>
                    <span className="text-xs opacity-90">
                      {(order.orderItems || []).length} поз.
                    </span>
                  </div>
                  <div className="text-xs opacity-75 mt-1">
                    Статус: {getOrderStatusLabel(order)}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Кнопка принятия вызова */}
          {waiterCall && (
            <button
              onClick={() => onAcknowledgeCall(table.id)}
              className="mt-2 w-full rounded-lg bg-[#dc2626] px-3 py-2 text-sm font-semibold text-white hover:bg-[#b91c1c] transition"
            >
              ✓ Принять вызов
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
