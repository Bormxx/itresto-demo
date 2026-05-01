'use client';

import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface Table {
  id: string;
  number: string;
  capacity: number | null;
  floor: number | null;
}

interface ActiveReservation {
  id: string;
  tableNumber: string;
  reservedFrom: string;
  reservedTo: string;
  status: string;
  actualStartTime?: string | null;
}

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
  clientId: string;
  activeReservation?: ActiveReservation | null;
}

export function ReservationModal({
  isOpen,
  onClose,
  restaurantId,
  clientId,
  activeReservation,
}: ReservationModalProps) {
  const [step, setStep] = useState<'select-time' | 'select-table' | 'view-reservation'>(
    activeReservation ? 'view-reservation' : 'select-time'
  );
  
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [guests, setGuests] = useState(2);
  const [duration, setDuration] = useState(120); // минуты
  
  const [availableTables, setAvailableTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeReservation) {
      setStep('view-reservation');
    }
  }, [activeReservation]);

  // Block body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Получить минимальную дату (сегодня)
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Загрузить доступные столики
  const fetchAvailableTables = async () => {
    if (!date || !time) {
      setError('Выберите дату и время');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Используем новый endpoint с учетом смен
      const response = await fetch(
        `/api/tables/available-with-shift?restaurantId=${restaurantId}&date=${date}&time=${time}`
      );
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при загрузке столиков');
      }

      setAvailableTables(data.tables || []);
      
      if (!data.tables || data.tables.length === 0) {
        setError(data.message || 'Нет доступных столиков на это время');
      }
      
      setStep('select-table');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Создать бронирование
  const createReservation = async () => {
    if (!selectedTable) return;

    setLoading(true);
    setError('');

    try {
      const reservedFrom = new Date(`${date}T${time}`);
      const reservedTo = new Date(reservedFrom.getTime() + duration * 60 * 1000);

      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          clientId,
          tableId: selectedTable.id,
          reservedFrom: reservedFrom.toISOString(),
          reservedTo: reservedTo.toISOString(),
          partySize: guests,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при создании брони');
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Отменить бронирование
  const cancelReservation = async () => {
    if (!activeReservation) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/reservations/${activeReservation.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка при отмене брони');
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Активировать бронирование (занять столик)
  const activateReservation = async () => {
    if (!activeReservation) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/reservations/${activeReservation.id}/activate`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при активации брони');
      }

      setSuccess(true);
      // Показать PIN
      alert(`Столик занят!\n\nВаш PIN-код: ${data.pin}\n\nСтолик №${data.tableNumber}\nДо: ${new Date(data.reservedTo).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`);
      
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Modal content */}
      <div 
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Кнопка закрытия */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 text-gray-500 hover:text-gray-700"
          aria-label="Закрыть"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Scrollable content */}
        <div className="px-6 py-4 max-h-[calc(100vh-100px)] overflow-y-auto">
          {/* Заголовок */}
          <h2 className="mb-6 text-2xl font-bold text-gray-900">
            {step === 'view-reservation' ? 'Ваше бронирование' : 'Забронировать столик'}
          </h2>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-lg bg-green-50 p-4 text-sm text-green-600">
              {step === 'view-reservation' ? 'Бронь отменена!' : 'Бронь успешно создана!'}
            </div>
          )}

        {/* Просмотр активной брони */}
        {step === 'view-reservation' && activeReservation && (
          <div className="space-y-6">
            <div className="rounded-lg bg-blue-50 p-6">
              <div className="mb-4 flex items-center gap-3">
                <span className="text-4xl">🪑</span>
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    Столик №{activeReservation.tableNumber}
                  </p>
                  <p className="text-sm text-gray-600">
                    {activeReservation.status === 'confirmed' ? 'Подтверждено' : 'Ожидает'}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Дата и время:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(activeReservation.reservedFrom).toLocaleString('ru-RU', {
                      dateStyle: 'long',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Длительность:</span>
                  <span className="font-medium text-gray-900">
                    {Math.round(
                      (new Date(activeReservation.reservedTo).getTime() -
                        new Date(activeReservation.reservedFrom).getTime()) /
                        (60 * 1000)
                    )}{' '}
                    мин
                  </span>
                </div>
              </div>
            </div>

            {!activeReservation.actualStartTime && (
              <button
                onClick={activateReservation}
                disabled={loading}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Активация...' : 'Занять столик'}
              </button>
            )}

            <button
              onClick={cancelReservation}
              disabled={loading}
              className="w-full rounded-lg border-2 border-red-200 bg-white px-4 py-3 font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
            >
              {loading ? 'Отмена...' : 'Отменить бронирование'}
            </button>
          </div>
        )}

        {/* Шаг 1: Выбор времени */}
        {step === 'select-time' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Дата
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div 
                  className="relative cursor-pointer"
                  onClick={() => {
                    if (dateInputRef.current) {
                      try {
                        dateInputRef.current.showPicker();
                      } catch (err) {
                        console.error('showPicker error:', err);
                      }
                    }
                  }}
                >
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={getMinDate()}
                    style={{
                      colorScheme: 'light'
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  />
                </div>
              </div>
              
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Время
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Количество гостей
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="number"
                  value={guests}
                  onChange={(e) => setGuests(parseInt(e.target.value) || 1)}
                  min="1"
                  max="20"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Длительность (мин)
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="60">1 час</option>
                  <option value="90">1.5 часа</option>
                  <option value="120">2 часа</option>
                  <option value="180">3 часа</option>
                </select>
              </div>
            </div>

            <button
              onClick={fetchAvailableTables}
              disabled={loading || !date || !time}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Загрузка...' : 'Найти свободные столики'}
            </button>
          </div>
        )}

        {/* Шаг 2: Выбор столика */}
        {step === 'select-table' && (
          <div className="space-y-4">
            <button
              onClick={() => setStep('select-time')}
              className="mb-4 text-sm text-blue-600 hover:text-blue-700"
            >
              ← Изменить время
            </button>

            {availableTables.length === 0 ? (
              <div className="rounded-lg bg-yellow-50 p-6 text-center">
                <p className="text-gray-700">
                  К сожалению, на выбранное время нет свободных столиков
                </p>
                <p className="mt-2 text-sm text-gray-600">
                  Попробуйте выбрать другое время
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600">
                  Доступно столиков: {availableTables.length}
                </p>
                
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {availableTables.map((table) => (
                    <button
                      key={table.id}
                      onClick={() => setSelectedTable(table)}
                      className={`rounded-lg border-2 p-4 text-center transition ${
                        selectedTable?.id === table.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="text-2xl">🪑</div>
                      <div className="mt-2 font-semibold text-gray-900">
                        Столик №{table.number}
                      </div>
                      {table.capacity && (
                        <div className="mt-1 text-xs text-gray-600">
                          до {table.capacity} гостей
                        </div>
                      )}
                      {table.floor && (
                        <div className="text-xs text-gray-500">
                          {table.floor} этаж
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                <button
                  onClick={createReservation}
                  disabled={!selectedTable || loading}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Бронирование...' : 'Забронировать'}
                </button>
              </>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
