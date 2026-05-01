'use client';

import { useEffect, useRef, useCallback } from 'react';

interface NotificationData {
  type: string;
  data: any;
}

interface UseNotificationsOptions {
  onNotification?: (notification: NotificationData) => void;
  onConnect?: () => void;
  onError?: (error: Event) => void;
  enabled?: boolean; // Можно отключить SSE (например, для WebView)
}

/**
 * Hook for subscribing to Server-Sent Events notifications
 */
export function useNotifications(options: UseNotificationsOptions = {}) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { onNotification, onConnect, onError, enabled = true } = options;

  const connect = useCallback(() => {
    if (!enabled) return;

    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Clear any pending reconnection attempts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Create new EventSource connection
    const eventSource = new EventSource('/api/notifications/stream');
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      onConnect?.();
    };

    eventSource.onmessage = (event) => {
      try {
        const notification: NotificationData = JSON.parse(event.data);
        onNotification?.(notification);
      } catch (error) {
        console.error('[SSE] Error parsing notification:', error);
      }
    };

    eventSource.onerror = (error) => {
      // Проверяем readyState, чтобы не логировать нормальные закрытия
      if (eventSource.readyState === EventSource.CLOSED) {
        // Соединение закрыто - пытаемся переподключиться
        onError?.(error);
        
        // Auto-reconnect after 5 seconds (только если enabled)
        if (enabled) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 5000);
        }
      }
    };
  }, [onNotification, onConnect, onError, enabled]);

  useEffect(() => {
    if (enabled) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [connect, enabled]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  return { disconnect, reconnect: connect };
}
