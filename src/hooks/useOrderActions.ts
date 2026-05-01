import { useState } from 'react';
import { useRouter } from 'next/navigation';

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

type ItemDelivery = {
  id: string;
  quantity: number;
  pickedUpAt: string;
  waiter: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  };
};

type OrderItemWithDeliveries = {
  orderItemId: string;
  menuItemName: string | null;
  menuItemTranslations: string | null;
  quantity: number;
  quantityDelivered: number;
  deliveries: ItemDelivery[];
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

type WaiterCall = {
  id: string;
  tableId: string;
  message: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
};

export function useOrderActions(
  waiterCalls: WaiterCall[],
  selectedOrder: Order | null,
  setSelectedOrder: (order: Order | null) => void,
  setSelectedTable: (table: Table | null) => void
) {
  const router = useRouter();
  const [deliveryQuantities, setDeliveryQuantities] = useState<Record<string, number>>({});
  const [itemDeliveries, setItemDeliveries] = useState<OrderItemWithDeliveries[]>([]);
  const [loading, setLoading] = useState(false);

  const handleAcknowledgeCall = async (tableId: string) => {
    const call = waiterCalls.find(c => c.tableId === tableId && !c.acknowledgedAt);
    if (!call) return;

    try {
      const response = await fetch('/api/waiter/acknowledge-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId: call.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to acknowledge call');
      }

      router.refresh();
    } catch (error) {
      console.error('Error acknowledging call:', error);
      alert('Ошибка при подтверждении вызова');
    }
  };

  const loadOrderDetails = async (order: Order, table: Table) => {
    setSelectedTable(table);
    setLoading(true);
    
    try {
      // Загрузить актуальные данные заказа из БД
      const [orderResponse, deliveriesResponse] = await Promise.all([
        fetch(`/api/orders/${order.id}`),
        fetch(`/api/waiter/item-deliveries/${order.id}`),
      ]);
      
      // Если заказ найден в БД, используем актуальные данные
      if (orderResponse.ok) {
        const orderData = await orderResponse.json();
        
        if (orderData.success && orderData.order) {
          setSelectedOrder(orderData.order);
        } else {
          // Fallback - использовать данные из локального состояния
          setSelectedOrder(order);
        }
      } else {
        // Заказ не найден в БД (возможно, завершен) - используем локальные данные
        setSelectedOrder(order);
      }

      // Загружаем информацию о распределении блюд
      if (deliveriesResponse.ok) {
        const deliveriesData = await deliveriesResponse.json();
        setItemDeliveries(deliveriesData.items || []);
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      // Fallback - использовать данные из локального состояния
      setSelectedOrder(order);
    } finally {
      setLoading(false);
    }
  };

  const handlePickItems = async () => {
    if (!selectedOrder) return;

    const items = Object.entries(deliveryQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([orderItemId, quantity]) => ({
        orderItemId,
        quantity,
      }));

    if (items.length === 0) {
      alert('Укажите количество для забора');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/waiter/pick-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('[Waiter] Pick error:', error);
        alert(error.error || 'Ошибка при заборе блюд');
        return;
      }

      // Перезагрузить актуальные данные заказа и deliveries
      const [orderResponse, deliveriesResponse] = await Promise.all([
        fetch(`/api/orders/${selectedOrder.id}`),
        fetch(`/api/waiter/item-deliveries/${selectedOrder.id}`),
      ]);
      
      if (orderResponse.ok) {
        const data = await orderResponse.json();
        if (data.success && data.order) {
          setSelectedOrder(data.order);
        }
      }

      if (deliveriesResponse.ok) {
        const deliveriesData = await deliveriesResponse.json();
        setItemDeliveries(deliveriesData.items || []);
      }

      setDeliveryQuantities({});
    } catch (error) {
      console.error('Error picking items:', error);
      alert('Ошибка при заборе блюд');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/complete`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Ошибка при завершении обслуживания');
        return;
      }

      setSelectedTable(null);
      setSelectedOrder(null);
      router.refresh();
    } catch (error) {
      console.error('Error completing order:', error);
      alert('Ошибка при завершении обслуживания');
    }
  };

  const handleCloseOrder = () => {
    setSelectedOrder(null);
    setSelectedTable(null);
    setDeliveryQuantities({});
    setItemDeliveries([]);
  };

  return {
    loading,
    deliveryQuantities,
    itemDeliveries,
    setDeliveryQuantities,
    handleAcknowledgeCall,
    loadOrderDetails,
    handlePickItems,
    handleCompleteOrder,
    handleCloseOrder,
  };
}
