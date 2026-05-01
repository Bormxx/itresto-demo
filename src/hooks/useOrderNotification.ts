'use client';

import { useEffect, useRef } from 'react';

export function useOrderNotification(orderCount: number) {
  const previousCountRef = useRef<number>(orderCount);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasInteractedRef = useRef<boolean>(false);

  useEffect(() => {
    // Отслеживать первое взаимодействие пользователя
    const handleInteraction = () => {
      hasInteractedRef.current = true;
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('click', handleInteraction, { once: true });
      window.addEventListener('keydown', handleInteraction, { once: true });
      window.addEventListener('touchstart', handleInteraction, { once: true });
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('click', handleInteraction);
        window.removeEventListener('keydown', handleInteraction);
        window.removeEventListener('touchstart', handleInteraction);
      }
    };
  }, []);

  useEffect(() => {
    // Создать аудио элемент для уведомлений
    if (typeof window !== 'undefined' && !audioRef.current) {
      audioRef.current = new Audio('data:audio/wav;base64,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');
    }

    // Если количество заказов увеличилось
    if (orderCount > previousCountRef.current) {
      // Визуальное уведомление - изменение title
      if (typeof document !== 'undefined') {
        const originalTitle = document.title;
        let count = 0;
        const interval = setInterval(() => {
          document.title = count % 2 === 0 ? '🔔 Новый заказ!' : originalTitle;
          count++;
          if (count > 10) {
            clearInterval(interval);
            document.title = originalTitle;
          }
        }, 500);
      }

      // Desktop notification
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('Новый заказ!', {
          body: `У вас ${orderCount} активных заказов`,
          icon: '/icon.png',
          tag: 'new-order',
        });
      }

      // Попытка воспроизвести звук (работает только после взаимодействия)
      if (audioRef.current && hasInteractedRef.current) {
        audioRef.current.play().catch(() => {
          // Audio play failed silently
        });
      }
    }

    previousCountRef.current = orderCount;
  }, [orderCount]);

  // Запросить разрешение на уведомления при первом рендере
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);
}
