'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getCurrentOrderId } from '@/lib/orderStorage';
import { getGuestId } from '@/lib/guestIdentity';

interface UseActiveOrdersResult {
  hasActiveOrders: boolean;
  loading: boolean;
}

/**
 * Хук для проверки наличия ОТКРЫТЫХ заказов в базе данных
 * Проверяет реальное состояние заказов, а не только localStorage
 */
export function useActiveOrders(tableId?: string, tableNumber?: string): UseActiveOrdersResult {
  const { data: session } = useSession();
  const [hasActiveOrders, setHasActiveOrders] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkActiveOrders = async () => {
      try {
        // Попытаться получить orderId из localStorage (учитывая tableId и tableNumber)
        const currentOrderId = getCurrentOrderId(tableId, tableNumber);
        // Для авторизованных клиентов НЕ используем guest-id
        const deviceUuid = session?.user ? null : getGuestId();
        
        let url = '/api/orders/active';
        const params = new URLSearchParams();
        
        // Если есть orderId - передаем его (неавторизованный клиент)
        if (currentOrderId) {
          params.append('orderIds', currentOrderId);
          if (deviceUuid) {
            params.append('deviceUuid', deviceUuid);
          }
          if (tableNumber) {
            params.append('tableNumber', tableNumber);
          }
        } else if (tableId) {
          // Иначе передаем tableId (авторизованный клиент)
          params.append('tableId', tableId);
        } else {
          // Нет ни orderId, ни tableId - не делаем запрос
          setHasActiveOrders(false);
          setLoading(false);
          return;
        }
        
        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const activeOrders = data.orders || [];
          setHasActiveOrders(activeOrders.length > 0);
        } else {
          setHasActiveOrders(false);
        }
      } catch (error) {
        console.error('[useActiveOrders] Failed to check active orders:', error);
        setHasActiveOrders(false);
      } finally {
        setLoading(false);
      }
    };

    checkActiveOrders();
  }, [tableId, tableNumber, session]);

  return { hasActiveOrders, loading };
}
