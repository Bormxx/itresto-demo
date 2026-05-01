// Хук для работы с Push уведомлениями и PWA
'use client';

import { useState, useEffect, useCallback } from 'react';

export interface UsePushNotificationsReturn {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  requestPermission: () => Promise<NotificationPermission>;
  permission: NotificationPermission;
}

export function usePushNotifications(restaurantId?: string): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Проверяем поддержку Service Worker и Push API
    const checkSupport = () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window;
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);
        // Проверяем подписку асинхронно
        checkSubscription();
      }
    };

    checkSupport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkSubscription = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (err) {
      console.error('Error checking subscription:', err);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (err) {
      console.error('Error requesting permission:', err);
      setError('Не удалось запросить разрешение на уведомления');
      return 'denied';
    }
  }, []);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      setError('Push уведомления не поддерживаются вашим браузером');
      return;
    }

    if (!restaurantId) {
      setError('Restaurant ID не указан');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Запрашиваем разрешение
      const permissionResult = await requestPermission();
      
      if (permissionResult !== 'granted') {
        throw new Error('Разрешение на уведомления не предоставлено');
      }

      // Регистрируем Service Worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Получаем VAPID публичный ключ
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('VAPID public key not configured');
      }

      // Подписываемся на push уведомления
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // Отправляем подписку на сервер
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          restaurantId,
        }),
      });

      if (!response.ok) {
        throw new Error('Не удалось сохранить подписку на сервере');
      }

      setIsSubscribed(true);
    } catch (err: any) {
      console.error('Error subscribing to push notifications:', err);
      setError(err.message || 'Не удалось подписаться на уведомления');
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, restaurantId, requestPermission]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return;

    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Отменяем подписку в браузере
        await subscription.unsubscribe();

        // Удаляем подписку на сервере
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
          }),
        });

        setIsSubscribed(false);
      }
    } catch (err: any) {
      console.error('Error unsubscribing from push notifications:', err);
      setError(err.message || 'Не удалось отписаться от уведомлений');
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    requestPermission,
    permission,
  };
}
