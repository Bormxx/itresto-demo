'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

export function useAutoRefresh(intervalMs: number = 5000) {
  const router = useRouter();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Если intervalMs === 0, автообновление отключено
    if (intervalMs === 0) {
      return;
    }

    // Автообновление каждые intervalMs миллисекунд
    intervalRef.current = setInterval(() => {
      router.refresh();
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [router, intervalMs]);

  return router;
}
