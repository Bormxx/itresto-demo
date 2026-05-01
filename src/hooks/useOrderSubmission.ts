import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { CartItem } from '@/types';
import { getGuestId } from '@/lib/guestIdentity';
import { setOrderId } from '@/lib/orderStorage';

interface SubmitOrderParams {
  items: CartItem[];
  tableNumber: string;
  billType: 'shared' | 'separate' | null;
  tableId?: string;
  restaurantId: string;
}

interface OrderResponse {
  success: boolean;
  order: {
    id: string;
    orderNumber: string;
  };
  tablePin?: string;
}

export function useOrderSubmission() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [tablePin, setTablePin] = useState<string | null>(null);

  const submitOrder = async ({
    items,
    tableNumber,
    billType,
    tableId,
    restaurantId,
  }: SubmitOrderParams): Promise<OrderResponse | null> => {
    setLoading(true);
    setError('');
    setSuccess(false);
    setTablePin(null);

    try {
      // Для авторизованных клиентов НЕ используем guest-id
      const deviceUuid = session?.user ? null : getGuestId();
      
      // Получить PIN из localStorage если есть
      let tablePin: string | null = null;
      if (typeof window !== 'undefined' && tableId) {
        tablePin = localStorage.getItem(`itresto-table-pin-${tableId}`);
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          items: items.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            price: item.basePrice,
            modifiers: item.modifiers?.map((mod) => {
              // Convert CartItemModifier to API format
              let quantity = 0;
              if (mod.isDefault) {
                // Default modifier: normally applied to all items, minus removed, plus extras
                quantity = (item.quantity - (mod.removedCount || 0)) + (mod.addedCount || 0);
              } else {
                // Non-default modifier: only applied where explicitly added
                quantity = mod.addedCount || 0;
              }
              
              return {
                modifierId: mod.modifierId,
                quantity,
                priceModifier: mod.priceModifier,
              };
            }).filter(mod => mod.quantity > 0), // Only include modifiers with positive quantity
          })),
          ...(tableNumber && { tableNumber }), // Только если tableNumber не пустой
          ...(tableId && { tableId }), // Добавляем tableId если есть
          billType: billType || 'shared',
          ...(deviceUuid && { deviceUuid }), // Только если deviceUuid не null/undefined
          ...(tablePin && { tablePin }), // Только если tablePin не null
        }),
      });

      // Try to parse JSON response
      let data;
      try {
        const text = await response.text();
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        throw new Error('Сервер вернул некорректный ответ');
      }

      if (!response.ok) {
        // Обработка ошибок валидации Zod
        if (data.details && Array.isArray(data.details)) {
          const validationErrors = data.details
            .map((issue: any) => `${issue.path.join('.')}: ${issue.message}`)
            .join('; ');
          throw new Error(`${data.error}: ${validationErrors}`);
        }
        
        const errorDetails = data.details ? ` (${JSON.stringify(data.details)})` : '';
        throw new Error(data.error + errorDetails || 'Failed to create order');
      }

      // Сохранить номер заказа и PIN (если выдан)
      setOrderNumber(data.order.orderNumber);
      if (data.tablePin) {
        setTablePin(data.tablePin);
      }

      // Сохранить ID заказа в localStorage
      if (typeof window !== 'undefined' && billType) {
        setOrderId(data.order.id, billType, tableId, tableNumber);
      }

      setSuccess(true);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Произошла ошибка';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setError('');
    setSuccess(false);
    setOrderNumber('');
    setTablePin(null);
  };

  return {
    submitOrder,
    loading,
    error,
    success,
    orderNumber,
    tablePin,
    resetState,
  };
}
