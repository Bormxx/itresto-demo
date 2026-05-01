'use client';

import { useState, useEffect } from 'react';
import { TablePinModal } from './TablePinModal';
import { UpcomingReservationWarning } from './UpcomingReservationWarning';

interface Reservation {
  id: string;
  tableId: string;
  reservedFrom: string;
  reservedTo: string;
  actualStartTime: string | null;
  status: string;
}

interface TableAccessGuardProps {
  restaurantId: string;
  tableId: string;
  tableNumber: string;
  hasActiveOrders: boolean;
  children: React.ReactNode;
}

export function TableAccessGuard({
  restaurantId,
  tableId,
  tableNumber,
  hasActiveOrders,
  children,
}: TableAccessGuardProps) {
  const [showPinModal, setShowPinModal] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [reservationBlocker, setReservationBlocker] = useState<{
    message: string;
    reservation: Reservation;
  } | null>(null);
  const [upcomingReservation, setUpcomingReservation] = useState<Reservation | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      // Запустить проверку и отмену просроченных бронирований
      try {
        await fetch('/api/reservations/check-expired', {
          method: 'POST',
        });
      } catch (error) {
        console.error('Error checking expired reservations:', error);
      }

      // Проверяем бронирования столика
      try {
        const response = await fetch(
          `/api/tables/${tableId}/reservations`
        );
        
        if (response.ok) {
          const reservations: Reservation[] = await response.json();
          const now = new Date();
          const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
          
          // Ищем активное бронирование, которое блокирует доступ
          const blockingReservation = reservations.find((r) => {
            const reservedFrom = new Date(r.reservedFrom);
            const reservedTo = new Date(r.reservedTo);
            
            // Если бронь подтверждена и время началось, но столик не занят
            return (
              r.status === 'confirmed' &&
              now >= reservedFrom &&
              now <= reservedTo &&
              !r.actualStartTime
            );
          });
          
          if (blockingReservation) {
            setReservationBlocker({
              message: 'Этот столик забронирован',
              reservation: blockingReservation,
            });
            setIsChecking(false);
            return;
          }

          // Ищем бронирование, которое начнется в ближайшие 30 минут
          const upcoming = reservations.find((r) => {
            const reservedFrom = new Date(r.reservedFrom);
            
            return (
              r.status === 'confirmed' &&
              reservedFrom > now &&
              reservedFrom <= thirtyMinutesFromNow
            );
          });

          if (upcoming) {
            setUpcomingReservation(upcoming);
          }
        }
      } catch (error) {
        console.error('Error checking reservations:', error);
      }

      // Проверяем, есть ли активные заказы
      if (!hasActiveOrders) {
        // Столик свободен, доступ без PIN
        setHasAccess(true);
        setIsChecking(false);
        return;
      }

      // Проверяем localStorage, есть ли уже разрешение или PIN
      const accessGranted = localStorage.getItem(`itresto-table-access-${tableId}`);
      const storedPin = localStorage.getItem(`itresto-table-pin-${tableId}`);
      
      // Если есть флаг доступа или сохранен PIN - значит доступ уже предоставлен
      if (accessGranted === 'granted' || storedPin) {
        setHasAccess(true);
        setIsChecking(false);
      } else {
        // Нужно ввести PIN
        setShowPinModal(true);
        setIsChecking(false);
      }
    };

    checkAccess();
  }, [tableId, hasActiveOrders]);

  const handlePinSuccess = () => {
    setShowPinModal(false);
    setHasAccess(true);
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9fafb]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563eb]"></div>
          <p className="mt-4 text-[#4b5563]">Проверка доступа...</p>
        </div>
      </div>
    );
  }

  if (reservationBlocker) {
    const reservedTo = new Date(reservationBlocker.reservation.reservedTo);
    const hours = reservedTo.getHours().toString().padStart(2, '0');
    const minutes = reservedTo.getMinutes().toString().padStart(2, '0');

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9fafb] p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <svg
                className="h-8 w-8 text-amber-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
          </div>

          <h2 className="mb-2 text-2xl font-bold text-gray-900">
            {reservationBlocker.message}
          </h2>
          <p className="mb-6 text-gray-600">
            Столик забронирован до {hours}:{minutes}
          </p>
          <p className="text-sm text-gray-500">
            Пожалуйста, выберите другой столик или дождитесь окончания бронирования
          </p>
        </div>
      </div>
    );
  }

  if (showPinModal && !hasAccess) {
    return (
      <>
        {/* Размытый контент на фоне */}
        <div className="filter blur-sm pointer-events-none">
          {children}
        </div>
        
        {/* Модальное окно с PIN */}
        <TablePinModal
          restaurantId={restaurantId}
          tableId={tableId}
          tableNumber={tableNumber}
          onSuccess={handlePinSuccess}
        />
      </>
    );
  }

  return (
    <>
      {children}
      {upcomingReservation && (
        <UpcomingReservationWarning
          reservation={upcomingReservation}
          tableNumber={tableNumber}
        />
      )}
    </>
  );
}
