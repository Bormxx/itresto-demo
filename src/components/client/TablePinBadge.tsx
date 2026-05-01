'use client';

import { useEffect, useState } from 'react';

interface TablePinBadgeProps {
  tableId: string;
}

export function TablePinBadge({ tableId }: TablePinBadgeProps) {
  const [pin, setPin] = useState<string | null>(null);

  useEffect(() => {
    // Проверяем наличие PIN в localStorage
    const checkPin = () => {
      const storedPin = localStorage.getItem(`itresto-table-pin-${tableId}`);
      setPin(storedPin);
    };
    
    checkPin();
    
    // Слушаем изменения в localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `itresto-table-pin-${tableId}` || e.key === null) {
        checkPin();
      }
    };
    
    // Слушаем кастомное событие для обновления PIN
    const handlePinUpdate = () => {
      checkPin();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('pinUpdated', handlePinUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('pinUpdated', handlePinUpdate);
    };
  }, [tableId]);

  // Не показываем ничего, если PIN не найден
  if (!pin) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 rounded-lg bg-[#eff6ff] px-3 py-2 border border-[#bfdbfe]">
      <span className="text-xs font-medium text-[#1d4ed8]">PIN:</span>
      <span className="text-sm font-bold text-[#1e3a8a] tracking-wider font-mono">{pin}</span>
    </div>
  );
}
