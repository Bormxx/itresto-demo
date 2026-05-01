'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getCurrentOrderId } from '@/lib/orderStorage';
import { getGuestId } from '@/lib/guestIdentity';

interface OrderItem {
  id: string;
  menuItem: {
    name: string;
  };
  quantity: number;
  quantityDelivered: number;
  priceAtOrder: string;
  status: string;
  kitchenStatus: string | null;
  barStatus: string | null;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: string;
  orderItems: OrderItem[];
  deviceUuid?: string;
  billType?: string;
}

interface ActiveOrdersProps {
  tableId?: string;
  tableNumber?: string;
  refreshKey?: number;
  onOrdersLoaded?: (hasOrders: boolean, myTotal: number, allTotal: number, pendingCount: number) => void;
  currentBillType?: 'shared' | 'separate' | null;
}

export function ActiveOrders({ tableId, tableNumber, refreshKey, onOrdersLoaded, currentBillType }: ActiveOrdersProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [myDeviceUuid, setMyDeviceUuid] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const currentOrderId = getCurrentOrderId(tableId, tableNumber);
        const deviceUuid = session?.user ? null : getGuestId();
        setMyDeviceUuid(deviceUuid || 'authenticated');
        
        let url = '/api/orders/active';
        const params = new URLSearchParams();
        
        if (currentOrderId) {
          params.append('orderIds', currentOrderId);
          if (deviceUuid) {
            params.append('deviceUuid', deviceUuid);
          }
          if (tableNumber) {
            params.append('tableNumber', tableNumber);
          }
        } else if (tableId) {
          params.append('tableId', tableId);
        }
        
        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const fetchedOrders = data.orders || [];
          const myOrdersData = data.myOrders || fetchedOrders;
          setOrders(fetchedOrders);
          setMyOrders(myOrdersData);
          
          // Вычисляем суммы на основе myOrders из API
          const myTotal = myOrdersData.reduce((sum: number, order: Order) => sum + Number(order.total), 0);
          const allTotal = fetchedOrders.reduce((sum: number, order: Order) => sum + Number(order.total), 0);
          
          // Подсчитываем количество pending/preparing items (не доставленных)
          // Учитываем только активные заказы (не completed и не cancelled)
          const pendingCount = fetchedOrders.reduce((sum: number, order: Order) => {
            // Пропускаем завершенные и отмененные заказы
            if (order.status === 'completed' || order.status === 'cancelled') {
              return sum;
            }
            
            const pendingItems = order.orderItems.filter((item: OrderItem) => 
              item.status === 'pending' || item.status === 'preparing'
            );
            return sum + pendingItems.reduce((itemSum: number, item: OrderItem) => itemSum + item.quantity, 0);
          }, 0);
          
          onOrdersLoaded?.(fetchedOrders.length > 0, myTotal, allTotal, pendingCount);
        }
      } catch (error) {
        console.error('Failed to fetch active orders:', error);
        onOrdersLoaded?.(false, 0, 0, 0);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();

    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [tableId, tableNumber, refreshKey, session]);

  if (loading) {
    return (
      <div className="animate-pulse rounded-lg bg-[#f3f4f6] p-4">
        <div className="h-4 bg-[#e5e7eb] rounded w-1/3 mb-3"></div>
        <div className="h-3 bg-[#e5e7eb] rounded w-full mb-2"></div>
        <div className="h-3 bg-[#e5e7eb] rounded w-2/3"></div>
      </div>
    );
  }

  if (orders.length === 0) {
    return null;
  }

  // Используем myOrders из state вместо фильтрации по deviceUuid
  // API уже правильно фильтрует заказы по client_id или guest_device_id
  const myOrdersList = myOrders;
  
  // Если текущий пользователь выбрал раздельный счёт, показываем только его заказы
  // Если совместный счёт или не выбран, показываем всех
  const shouldShowOthers = currentBillType === 'shared' || (!currentBillType && orders.some(o => o.billType === 'shared'));
  const othersOrders = shouldShowOthers ? orders.filter(order => !myOrdersList.find(mo => mo.id === order.id)) : [];
  
  const isSharedBill = shouldShowOthers && orders.length > 0 && orders.some(o => o.billType === 'shared');

  const calculateTotal = (orderList: Order[]) => {
    return orderList.reduce((sum, order) => sum + Number(order.total), 0);
  };

  const myTotal = calculateTotal(myOrdersList);
  const othersTotal = calculateTotal(othersOrders);
  const grandTotal = calculateTotal(orders);

  if (loading) {
    return (
      <div className="animate-pulse rounded-lg bg-[#f3f4f6] p-4">
        <div className="h-4 bg-[#e5e7eb] rounded w-1/3 mb-3"></div>
        <div className="h-3 bg-[#e5e7eb] rounded w-full mb-2"></div>
        <div className="h-3 bg-[#e5e7eb] rounded w-2/3"></div>
      </div>
    );
  }

  if (orders.length === 0) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-[#fef9c3] text-[#854d0e]';
      case 'preparing':
        return 'bg-[#dbeafe] text-[#1e40af]';
      case 'ready':
        return 'bg-[#dcfce7] text-[#166534]';
      case 'delivered':
        return 'bg-[#f3f4f6] text-[#1f2937]';
      case 'cancelled':
        return 'bg-[#fee2e2] text-[#991b1b]';
      default:
        return 'bg-[#f3f4f6] text-[#1f2937]';
    }
  };

  const getStatusText = (item: OrderItem) => {
    if (item.status === 'cancelled') return 'Отменено';
    
    // Проверяем полную доставку через kitchenStatus и barStatus
    if (item.status === 'delivered') return 'Доставлено';
    if (item.kitchenStatus === 'delivered' && item.barStatus === 'delivered') return 'Доставлено';
    if (item.kitchenStatus === 'delivered' && !item.barStatus) return 'Доставлено';
    if (item.barStatus === 'delivered' && !item.kitchenStatus) return 'Доставлено';
    
    // Частичная доставка
    if (item.quantityDelivered > 0 && item.quantityDelivered < item.quantity) {
      return `Частично (${item.quantityDelivered}/${item.quantity})`;
    }
    
    // Готово к выдаче
    if (item.kitchenStatus === 'ready' || item.barStatus === 'ready') return 'Готово';
    
    // В процессе приготовления
    if (item.kitchenStatus === 'preparing' || item.barStatus === 'preparing') return 'Готовится';
    
    return 'Ожидает';
  };

  const renderOrders = (orderList: Order[], title: string, total: number, isMine: boolean = true) => {
    if (orderList.length === 0) return null;

    return (
      <div className="space-y-3">
        {/* Заголовок секции */}
        <div className={isMine 
          ? "flex items-center justify-between rounded-lg p-2 bg-linear-to-r from-[#2563eb] to-[#1d4ed8]"
          : "flex items-center justify-between rounded-lg p-2 bg-[#e5e7eb]"
        }>
          <h3 className={isMine ? "text-sm font-semibold text-[#ffffff]" : "text-sm font-semibold text-[#374151]"}>
            {title}
          </h3>
          <span className={isMine ? "text-sm font-bold text-[#ffffff]" : "text-sm font-bold text-[#374151]"}>
            {total.toFixed(2)} ₽
          </span>
        </div>
        
        {/* Карточки заказов */}
        {orderList.map((order) => (
          <div 
            key={order.id} 
            className={isMine 
              ? "rounded-lg border-2 border-[#3b82f6] bg-[#dbeafe] p-3"
              : "rounded-lg border border-[#d1d5db] bg-[#ffffff] p-3"
            }
          >
            <div className="mb-2 flex items-center justify-between">
              <span className={isMine ? "text-xs font-medium text-[#1e3a8a]" : "text-xs font-medium text-[#374151]"}>
                Заказ #{order.orderNumber}
              </span>
              <span className={isMine ? "text-sm font-bold text-[#1e3a8a]" : "text-sm font-bold text-[#374151]"}>
                {Number(order.total).toFixed(2)} ₽
              </span>
            </div>

            <div className="space-y-2">
              {order.orderItems.map((item) => (
                <div key={item.id} className="flex items-start justify-between text-sm">
                  <div className="flex-1">
                    <p className="font-medium text-[#111827]">
                      {item.menuItem?.name || 'Удалено из меню'}
                    </p>
                    <p className="text-xs text-[#4b5563]">
                      {item.quantity} × {Number(item.priceAtOrder).toFixed(2)} ₽
                    </p>
                  </div>
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(
                      item.status
                    )}`}
                  >
                    {getStatusText(item)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Мои заказы */}
      {renderOrders(myOrdersList, 'Ваши заказы:', myTotal, true)}

      {/* Заказы других клиентов (только для совместного счёта) */}
      {isSharedBill && othersOrders.length > 0 && (
        <>
          <div className="border-t border-[#e5e7eb] pt-4">
            {renderOrders(othersOrders, 'Заказы компании:', othersTotal, false)}
          </div>
          
          {/* Общая сумма */}
          <div className="rounded-lg bg-[#f3f4f6] border border-[#d1d5db] p-3">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-[#111827]">ИТОГО К ОПЛАТЕ:</span>
              <span className="text-lg font-bold text-[#111827]">{grandTotal.toFixed(2)} ₽</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
