// Компонент для управления PWA и Push уведомлениями
'use client';

import { useEffect, useRef } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Bell, BellOff } from 'lucide-react';

interface PWAManagerProps {
  restaurantId: string;
  autoSubscribe?: boolean;
}

export function PWAManager({ restaurantId, autoSubscribe = false }: PWAManagerProps) {
  const {
    isSupported,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    permission,
  } = usePushNotifications(restaurantId);

  // Используем ref для отслеживания, была ли уже попытка подписки
  const hasTriedSubscribe = useRef(false);

  useEffect(() => {
    // Автоматическая подписка при первой загрузке (если включено)
    // Выполняется только один раз
    if (
      autoSubscribe && 
      isSupported && 
      !isSubscribed && 
      permission === 'default' &&
      !hasTriedSubscribe.current
    ) {
      hasTriedSubscribe.current = true;
      subscribe();
    }
  }, [autoSubscribe, isSupported, isSubscribed, permission, subscribe]);

  if (!isSupported) {
    return null; // Не показываем ничего, если не поддерживается
  }

  const handleToggle = () => {
    if (isSubscribed) {
      unsubscribe();
    } else {
      subscribe();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleToggle}
        disabled={isLoading}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg font-medium
          transition-colors disabled:opacity-50 disabled:cursor-not-allowed
          ${
            isSubscribed
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          }
        `}
        title={isSubscribed ? 'Отключить уведомления' : 'Включить уведомления'}
      >
        {isSubscribed ? (
          <>
            <Bell className="w-5 h-5" />
            <span>Уведомления включены</span>
          </>
        ) : (
          <>
            <BellOff className="w-5 h-5" />
            <span>Включить уведомления</span>
          </>
        )}
      </button>

      {error && (
        <div className="text-red-600 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
