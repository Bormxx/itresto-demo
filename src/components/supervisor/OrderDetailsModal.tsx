'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

interface OrderDetail {
  id: string;
  orderNumber: string;
  totalAmount: number;
  discount: number;
  billType: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  completedAt: string | null;
  tableNumber: string | null;
  waiterName: string | null;
  clientId: string | null;
  guestDeviceId: string | null;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    modifiers: Array<{ name: string; price: number }>;
  }>;
}

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string | null;
}

export default function OrderDetailsModal({ isOpen, onClose, orderId }: OrderDetailsModalProps) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (orderId && isOpen) {
      fetchOrderDetails();
    }
  }, [orderId, isOpen]);

  const fetchOrderDetails = async () => {
    if (!orderId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/supervisor/orders/${orderId}`);
      if (response.ok) {
        const data = await response.json();
        setOrder(data);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setLoading(false);
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

  const billTypeLabels: Record<string, string> = {
    shared: 'Общий',
    individual: 'Раздельный',
  };

  const paymentStatusLabels: Record<string, string> = {
    pending: 'Ожидает оплаты',
    paid: 'Оплачен',
    failed: 'Ошибка оплаты',
    refunded: 'Возврат',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Детали заказа" size="lg">
      {loading ? (
        <div className="py-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="mt-2 text-sm text-gray-600">Загрузка...</p>
        </div>
      ) : order ? (
        <div className="space-y-6">
          {/* Order header */}
          <div className="flex items-start justify-between border-b pb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Заказ #{order.orderNumber}
              </h3>
              <p className="text-sm text-gray-600">
                {new Date(order.createdAt).toLocaleString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                statusColors[order.status] || 'bg-gray-100 text-gray-800'
              }`}
            >
              {statusLabels[order.status] || order.status}
            </span>
          </div>

          {/* Order info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {order.tableNumber && (
              <div>
                <span className="text-gray-600">Стол:</span>
                <span className="ml-2 font-medium text-gray-900">{order.tableNumber}</span>
              </div>
            )}
            {order.waiterName && (
              <div>
                <span className="text-gray-600">Официант:</span>
                <span className="ml-2 font-medium text-gray-900">{order.waiterName}</span>
              </div>
            )}
            <div>
              <span className="text-gray-600">Тип клиента:</span>
              <span className="ml-2 font-medium text-gray-900">
                {order.clientId ? 'Авторизованный' : 'Гость'}
              </span>
            </div>
            {order.clientId && (
              <div>
                <span className="text-gray-600">ID клиента:</span>
                <span className="ml-2 font-mono text-xs text-gray-900">{order.clientId}</span>
              </div>
            )}
            <div>
              <span className="text-gray-600">Тип счёта:</span>
              <span className="ml-2 font-medium text-gray-900">
                {billTypeLabels[order.billType] || order.billType}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Способ оплаты:</span>
              <span className="ml-2 font-medium text-gray-900">
                {paymentStatusLabels[order.paymentStatus] || order.paymentStatus}
              </span>
            </div>
            {order.completedAt && (
              <div className="col-span-2">
                <span className="text-gray-600">Завершён:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {new Date(order.completedAt).toLocaleString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Order items */}
          <div>
            <h4 className="mb-3 font-medium text-gray-900">Состав заказа:</h4>
            <div className="space-y-3">
              {order.items.map((item, index) => (
                <div key={index} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      {item.modifiers.length > 0 && (
                        <ul className="mt-1 space-y-1 text-sm text-gray-600">
                          {item.modifiers.map((mod, modIndex) => (
                            <li key={modIndex}>
                              + {mod.name}
                              {mod.price > 0 && ` (+${mod.price} ₽)`}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="ml-4 text-right">
                      <p className="text-sm text-gray-600">× {item.quantity}</p>
                      <p className="font-medium text-gray-900">{item.price * item.quantity} ₽</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="border-t pt-4 space-y-2">
            {order.discount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Скидка:</span>
                <span className="text-red-600 font-medium">-{order.discount} ₽</span>
              </div>
            )}
            <div className="flex items-center justify-between text-lg font-semibold">
              <span className="text-gray-900">Итого:</span>
              <span className="text-gray-900">{order.totalAmount} ₽</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="secondary" onClick={onClose}>
              Закрыть
            </Button>
          </div>
        </div>
      ) : (
        <p className="py-8 text-center text-gray-600">Заказ не найден</p>
      )}
    </Modal>
  );
}
