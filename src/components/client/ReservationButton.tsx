'use client';

import { useState } from 'react';
import { ReservationModal } from './ReservationModal';

interface ReservationButtonProps {
  restaurantId: string;
  clientId: string;
  activeReservation: {
    id: string;
    tableNumber: string;
    reservedFrom: string;
    reservedTo: string;
    status: string;
  } | null;
}

export function ReservationButton({
  restaurantId,
  clientId,
  activeReservation,
}: ReservationButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f3f4f6] text-[#000000] transition hover:bg-[#e5e7eb]"
        aria-label="Бронирование"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        {activeReservation && (
          <span className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-blue-500" />
        )}
      </button>

      <ReservationModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        restaurantId={restaurantId}
        clientId={clientId}
        activeReservation={activeReservation}
      />
    </>
  );
}
