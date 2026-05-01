'use client';

import { TableCard, TableLegend } from '@/components/waiter/dashboard';
import { OrderModal } from '@/components/waiter/dashboard/modals';
import { useWaiterTables } from '@/hooks/useWaiterTables';
import { useOrderActions } from '@/hooks/useOrderActions';

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

type Reservation = {
  id: string;
  tableId: string;
  reservedFrom: string;
  reservedTo: string;
  actualStartTime: string | null;
  partySize: number;
  status: string;
};

type Props = {
  initialTables: Table[];
  waiterCalls: WaiterCall[];
  reservations: Reservation[];
};

export function WaiterDashboard({ initialTables, waiterCalls, reservations }: Props) {
  const { 
    tables, 
    mounted, 
    selectedTable, 
    selectedOrder,
    setSelectedTable,
    setSelectedOrder,
    getTimeAgo 
  } = useWaiterTables(initialTables);

  const {
    loading,
    deliveryQuantities,
    itemDeliveries,
    setDeliveryQuantities,
    handleAcknowledgeCall,
    loadOrderDetails,
    handlePickItems,
    handleCompleteOrder,
    handleCloseOrder,
  } = useOrderActions(waiterCalls, selectedOrder, setSelectedOrder, setSelectedTable);

  const handleCloseAllShared = async (tableId: string, orderIds: string[]) => {
    try {
      const response = await fetch('/api/waiter/close-shared-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to close shared orders');
      }

      // Обновляем страницу для получения актуального состояния
      window.location.reload();
    } catch (error) {
      console.error('Error closing shared orders:', error);
      throw error;
    }
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#111827]">
          Столики
        </h2>
        <div className="flex items-center gap-4">
          <div className="text-sm text-[#6b7280]">
            Обновлено: {mounted ? getTimeAgo() : 'загрузка...'}
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-[#22c55e]"></div>
            <span className="text-xs text-[#4b5563]">Автообновление</span>
          </div>
        </div>
      </div>

      {/* Легенда цветов */}
      <TableLegend />

      {/* Сетка столиков */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {tables.map((table) => {
          const activeOrders = table.orders.filter(o => 
            o.status !== 'completed' && o.status !== 'cancelled'
          );
          const unacknowledgedCall = waiterCalls.find(
            call => call.tableId === table.id && !call.acknowledgedAt
          );

          // Находим бронирования для этого столика
          const now = new Date();
          const tableReservations = reservations
            .filter(r => r.tableId === table.id)
            .filter(r => {
              const reservedTo = new Date(r.reservedTo);
              return reservedTo > now;
            });

          return (
            <TableCard
              key={table.id}
              table={table}
              activeOrders={activeOrders}
              waiterCall={unacknowledgedCall}
              tableReservations={tableReservations}
              onAcknowledgeCall={handleAcknowledgeCall}
              onOpenOrder={loadOrderDetails}
              onCloseAllShared={handleCloseAllShared}
            />
          );
        })}
      </div>

      {/* Модальное окно с деталями заказа */}
      {selectedOrder && selectedTable && (
        <OrderModal
          order={selectedOrder}
          table={selectedTable}
          loading={loading}
          deliveryQuantities={deliveryQuantities}
          itemDeliveries={itemDeliveries}
          onClose={handleCloseOrder}
          onDeliveryQtyChange={(itemId, value) => {
            setDeliveryQuantities(prev => ({
              ...prev,
              [itemId]: value,
            }));
          }}
          onPickItems={handlePickItems}
          onCompleteOrder={handleCompleteOrder}
        />
      )}
    </>
  );
}