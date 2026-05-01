import { useState } from 'react';

export function useTableAccess(tableId?: string) {
  const [showPinVerification, setShowPinVerification] = useState(false);

  const checkTableAccess = async (tableNumber: string): Promise<boolean> => {
    if (!tableId || !tableNumber) {
      return true; // Нет ограничений если нет данных столика
    }

    try {
      const statusResponse = await fetch(`/api/tables/${tableId}/status`);
      const statusData = await statusResponse.json();

      // Если столик занят другими заказами
      if (statusData.hasActiveOrders) {
        // Проверяем, есть ли уже сохраненный доступ в localStorage
        const accessGranted = localStorage.getItem(`itresto-table-access-${tableId}`);

        if (accessGranted !== 'granted') {
          // Нужен PIN для продолжения
          setShowPinVerification(true);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error checking table access:', error);
      return true; // Не блокируем в случае ошибки
    }
  };

  const grantAccess = () => {
    setShowPinVerification(false);
  };

  return {
    showPinVerification,
    setShowPinVerification,
    checkTableAccess,
    grantAccess,
  };
}
