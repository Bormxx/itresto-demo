'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface CallWaiterButtonProps {
  tableId: string;
  restaurantId: string;
}

export function CallWaiterButton({ tableId, restaurantId }: CallWaiterButtonProps) {
  const [calling, setCalling] = useState(false);
  const [called, setCalled] = useState(false);
  const [error, setError] = useState('');
  const t = useTranslations('menu');

  const handleCallWaiter = async () => {
    setCalling(true);
    setError('');

    try {
      const res = await fetch('/api/waiter/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId, restaurantId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('waiterCallFailed'));
      }

      setCalled(true);
      
      // Сбросить статус через 30 секунд
      setTimeout(() => {
        setCalled(false);
      }, 30000);
    } catch (err) {
      console.error('Call waiter error:', err);
      setError(err instanceof Error ? err.message : t('errorOccurred'));
    } finally {
      setCalling(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleCallWaiter}
        disabled={calling || called}
        className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
          called
            ? 'bg-[#16a34a] text-[#ffffff]'
            : 'bg-[#f3f4f6] text-[#000000] hover:bg-[#e5e7eb]'
        } disabled:opacity-50`}
        title={called ? t('waiterCalled') : t('callWaiter')}
      >
        {called ? (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        )}
      </button>

      {error && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-lg bg-[#fef2f2] p-2 text-xs text-[#991b1b] shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
}
