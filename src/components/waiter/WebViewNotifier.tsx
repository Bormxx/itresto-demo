'use client';

import { useEffect } from 'react';

export function WebViewNotifier() {
  useEffect(() => {
    
    // Проверяем наличие ReactNativeWebView
    if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
      
      // Отправляем сообщение немедленно
      try {
        (window as any).ReactNativeWebView.postMessage(JSON.stringify({ type: 'pageLoaded' }));
      } catch (error) {
        console.error('WebViewNotifier: Error sending message', error);
      }
      
      // Повторяем через 500ms на всякий случай
      setTimeout(() => {
        try {
          (window as any).ReactNativeWebView.postMessage(JSON.stringify({ type: 'pageLoaded' }));
        } catch (error) {
          console.error('WebViewNotifier: Error sending delayed message', error);
        }
      }, 500);
    } else {
    }
  }, []);

  // Компонент ничего не рендерит
  return null;
}
