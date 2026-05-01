'use client';

import { useState, useEffect } from 'react';

interface Reservation {
  id: string;
  reservedFrom: string;
  reservedTo: string;
}

interface UpcomingReservationWarningProps {
  reservation: Reservation;
  tableNumber: string;
}

export function UpcomingReservationWarning({
  reservation,
  tableNumber,
}: UpcomingReservationWarningProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const reservedFrom = new Date(reservation.reservedFrom);
      const diff = reservedFrom.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('сейчас');
        return;
      }

      const minutes = Math.floor(diff / (60 * 1000));
      const seconds = Math.floor((diff % (60 * 1000)) / 1000);

      if (minutes > 0) {
        setTimeRemaining(`${minutes} мин ${seconds} сек`);
      } else {
        setTimeRemaining(`${seconds} сек`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [reservation.reservedFrom]);

  if (!isOpen) return null;

  const reservedFrom = new Date(reservation.reservedFrom);
  const hours = reservedFrom.getHours().toString().padStart(2, '0');
  const minutes = reservedFrom.getMinutes().toString().padStart(2, '0');

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4">
      <div className="mx-auto max-w-lg rounded-2xl bg-amber-50 border-2 border-amber-200 p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <svg
                className="h-6 w-6 text-amber-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Столик забронирован
              </h3>
              <p className="text-sm text-gray-600">
                Бронь начинается в {hours}:{minutes}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="mb-4 rounded-lg bg-white p-4 text-center">
          <p className="text-sm text-gray-600">Времени до бронирования:</p>
          <p className="text-3xl font-bold text-amber-600">{timeRemaining}</p>
        </div>

        <p className="text-sm text-gray-700">
          Этот столик скоро будет занят. Рекомендуем завершить заказ вовремя или
          пересесть за другой столик.
        </p>
      </div>
    </div>
  );
}
