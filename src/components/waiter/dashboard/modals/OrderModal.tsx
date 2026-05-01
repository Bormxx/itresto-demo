import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import OrderItemCard from './OrderItemCard';

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
  loyaltyDiscount?: string | null;
  orderItems: OrderItem[];
};

type Table = {
  id: string;
  number: string;
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

interface OrderModalProps {
  order: Order;
  table: Table;
  loading: boolean;
  deliveryQuantities: Record<string, number>;
  itemDeliveries: OrderItemWithDeliveries[];
  onClose: () => void;
  onDeliveryQtyChange: (itemId: string, value: number) => void;
  onPickItems: () => void;
  onCompleteOrder: (orderId: string) => void;
}

export default function OrderModal({
  order,
  table,
  loading,
  deliveryQuantities,
  itemDeliveries,
  onClose,
  onDeliveryQtyChange,
  onPickItems,
  onCompleteOrder,
}: OrderModalProps) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const orderItems = order.orderItems || [];
  const allItemsDelivered = orderItems.every(item => item.quantityDelivered >= item.quantity);
  const hasItemsToDeliver = Object.values(deliveryQuantities).some(q => q > 0);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000] bg-opacity-50 p-4"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#ffffff] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-2xl font-bold text-[#111827]">
              {order.orderNumber || 'Заказ'}
            </h3>
            <p className="text-sm text-[#4b5563]">
              Столик {table.number || '?'} • {order.createdAt ? new Date(order.createdAt).toLocaleString('ru-RU') : 'Время неизвестно'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-2xl text-[#9ca3af] hover:text-[#4b5563]"
          >
            ×
          </button>
        </div>

        {/* Скидка программы лояльности */}
        {order.loyaltyDiscount && parseFloat(order.loyaltyDiscount) > 0 && (
          <div className="mb-4 rounded-lg bg-purple-50 p-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎁</span>
              <div>
                <div className="font-semibold text-purple-900">
                  Скидка программы лояльности
                </div>
                <div className="text-sm text-purple-700">
                  -{order.loyaltyDiscount} ₽
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Элементы заказа */}
        <div className="mb-4 space-y-3">
          {orderItems.length === 0 ? (
            <div className="rounded-lg border-2 border-[#fbbf24] bg-[#fef3c7] p-6 text-center">
              <p className="text-lg font-semibold text-[#92400e]">⚠️ Блюда не загружены</p>
              <p className="mt-2 text-sm text-[#78350f]">
                Данные заказа не содержат информации о блюдах. Попробуйте обновить страницу.
              </p>
            </div>
          ) : (
            orderItems.map((item) => {
              const remainingQty = item.quantity - item.quantityDelivered;
              const deliveryQty = deliveryQuantities[item.id] || 0;
              const itemDeliveryInfo = itemDeliveries.find(d => d.orderItemId === item.id);

              return (
                <OrderItemCard
                  key={item.id}
                  item={item}
                  itemDeliveryInfo={itemDeliveryInfo}
                  deliveryQty={deliveryQty}
                  remainingQty={remainingQty}
                  onDeliveryQtyChange={(value) => onDeliveryQtyChange(item.id, value)}
                  onSetMax={() => onDeliveryQtyChange(item.id, remainingQty)}
                />
              );
            })
          )}
        </div>

        {/* Итого */}
        <div className="mb-4 border-t-2 border-[#d1d5db] pt-3">
          <div className="flex justify-between text-xl font-bold text-[#111827]">
            <span>Итого:</span>
            <span>{order.total || '0.00'} ₽</span>
          </div>
        </div>

        {/* Кнопки действий */}
        <div className="flex gap-3">
          <button
            onClick={onPickItems}
            disabled={loading || !hasItemsToDeliver}
            className="flex-1 rounded-lg bg-[#2563eb] py-3 font-semibold text-[#ffffff] hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Забираю...' : '📦 Забрать блюда'}
          </button>
          
          {allItemsDelivered && (
            <button
              onClick={() => setShowConfirmModal(true)}
              className="flex-1 rounded-lg bg-[#16a34a] py-3 font-semibold text-[#ffffff] hover:bg-[#15803d]"
            >
              ✓ Завершить обслуживание
            </button>
          )}
        </div>
      </div>

      {/* Модальное окно подтверждения */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Завершить обслуживание?"
        size="sm"
        zIndex={60}
      >
        <p className="mb-6 text-[#4b5563]">
          Вы уверены, что хотите завершить обслуживание столика {table.number}?
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setShowConfirmModal(false)}
            className="flex-1 rounded-lg bg-[#e5e7eb] py-3 font-semibold text-[#374151] hover:bg-[#d1d5db]"
          >
            Отмена
          </button>
          <button
            onClick={() => {
              setShowConfirmModal(false);
              onCompleteOrder(order.id);
            }}
            className="flex-1 rounded-lg bg-[#16a34a] py-3 font-semibold text-[#ffffff] hover:bg-[#15803d]"
          >
            Завершить
          </button>
        </div>
      </Modal>
    </div>
  );
}
