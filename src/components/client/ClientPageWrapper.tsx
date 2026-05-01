'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getCurrentOrderId, clearOrderId } from '@/lib/orderStorage';
import { useCartStore } from '@/lib/store/cartStore';
import { getGuestId } from '@/lib/guestIdentity';

interface ClientPageWrapperProps {
  children: React.ReactNode;
  tableId?: string;
}

export function ClientPageWrapper({ children, tableId }: ClientPageWrapperProps) {
  const searchParams = useSearchParams();
  const tableNumber = searchParams.get('table');
  const { clearCart } = useCartStore();
  const { data: session } = useSession();

  useEffect(() => {
    const validateAndCleanup = async () => {
      try {
        // Проверяем есть ли сохранённый order ID в localStorage
        const currentOrderId = getCurrentOrderId(tableId, tableNumber || undefined);
        
        if (!currentOrderId) {
          // Нет сохранённого заказа - ничего не делаем
          return;
        }

        // Для авторизованных клиентов НЕ используем guest-id
        const deviceUuid = session?.user ? null : getGuestId();
        const params = new URLSearchParams();
        params.append('orderIds', currentOrderId);
        if (deviceUuid) {
          params.append('deviceUuid', deviceUuid);
        }
        
        if (tableNumber) {
          params.append('tableNumber', tableNumber);
        }

        const response = await fetch(`/api/orders/active?${params.toString()}`);
        
        if (!response.ok) {
          // Ошибка API - НЕ очищаем данные, может быть временная проблема
          return;
        }

        const data = await response.json();
        const orders = data.orders || [];

        // Проверяем есть ли активный заказ с нашим ID (не completed и не cancelled)
        const hasOpenOrder = orders.some(
          (order: any) => order.id === currentOrderId && 
            order.status !== 'completed' && 
            order.status !== 'cancelled'
        );

        if (!hasOpenOrder) {
          // Открытого заказа нет - НЕ очищаем корзину и данные
          // Заказ мог быть завершен, но пользователь может добавлять новые items
        }
      } catch (error) {
        // При ошибке сети не трогаем данные - может быть временная проблема
        console.error('Error validating order:', error);
      }
    };

    // Запускаем проверку при монтировании компонента
    validateAndCleanup();
  }, [tableId, tableNumber, clearCart, session]);

  return <>{children}</>;
}
