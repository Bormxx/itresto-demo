'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import { toast } from 'sonner';

interface Table {
 id: string;
  number: string;
  capacity: number;
}

interface Reservation {
  id: string;
  tableId: string;
  tableNumber: string;
  customerName: string;
  customerPhone: string;
  guestCount: number;
  reservationDate: string;
  reservationTime: string;
  duration: number;
  notes?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdBy: string;
  createdByName: string;
}

interface ReservationsClientProps {
  restaurantId: string;
  managerId: string;
  tables: Table[];
}

export default function ReservationsClient({ restaurantId, managerId, tables }: ReservationsClientProps) {
  const t = useTranslations();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Модальное окно подтверждения
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'cancel' | 'activate' | null>(null);
  const [confirmReservationId, setConfirmReservationId] = useState<string | null>(null);
  
  // Доступные столики на выбранное время
  const [availableTables, setAvailableTables] = useState<Table[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [tablesMessage, setTablesMessage] = useState('');

  const dateInputRef = useRef<HTMLInputElement>(null);

  // Форма
  const [formData, setFormData] = useState({
    tableId: '',
    customerName: '',
    customerPhone: '',
    guestCount: 2,
    reservationDate: '',
    reservationTime: '',
    duration: 120,
    notes: '',
  });

  useEffect(() => {
    fetchReservations();
  }, [restaurantId]);

  // Загрузить доступные столики при изменении даты или времени
  useEffect(() => {
    if (formData.reservationDate && formData.reservationTime) {
      fetchAvailableTables();
    } else {
      setAvailableTables([]);
      setTablesMessage('');
    }
  }, [formData.reservationDate, formData.reservationTime]);

  const fetchAvailableTables = async () => {
    if (!formData.reservationDate || !formData.reservationTime) return;

    setLoadingTables(true);
    setTablesMessage('');

    try {
      const url = `/api/tables/available-with-shift?restaurantId=${restaurantId}&date=${formData.reservationDate}&time=${formData.reservationTime}`;
      
      const response = await fetch(url);
      const data = await response.json();


      if (!response.ok) {
        throw new Error(data.error || 'Ошибка загрузки столиков');
      }

      setAvailableTables(data.tables || []);
      setTablesMessage(data.message || '');
      
      
      // Сбросить выбранный столик, если он не в списке доступных
      if (formData.tableId && !data.tables.find((t: Table) => t.id === formData.tableId)) {
        setFormData(prev => ({ ...prev, tableId: '' }));
      }
    } catch (error) {
      console.error('Error fetching available tables:', error);
      setAvailableTables([]);
      setTablesMessage('Ошибка загрузки столиков');
      toast.error('Не удалось загрузить доступные столики');
    } finally {
      setLoadingTables(false);
    }
  };

  const fetchReservations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/manager/reservations?restaurantId=${restaurantId}`);
      if (!response.ok) throw new Error('Failed to fetch reservations');
      
      const data = await response.json();
      const reservationsList = Array.isArray(data.reservations) ? data.reservations : [];
      
      // Преобразуем данные с сервера в формат компонента
      const mappedReservations: Reservation[] = reservationsList.map((res: any) => {
        const reservedFrom = new Date(res.reservedFrom);
        const reservedTo = new Date(res.reservedTo);
        const durationMinutes = Math.round((reservedTo.getTime() - reservedFrom.getTime()) / (1000 * 60));
        
        return {
          id: res.id,
          tableId: res.tableId,
          tableNumber: res.table?.number || 'N/A',
          customerName: res.client ? `${res.client.firstName || ''} ${res.client.lastName || ''}`.trim() : 'Гость',
          customerPhone: res.client?.phone || '',
          guestCount: res.partySize || 0,
          reservationDate: reservedFrom.toISOString().split('T')[0],
          reservationTime: reservedFrom.toTimeString().slice(0, 5),
          duration: durationMinutes,
          notes: res.notes || '',
          status: res.status,
          createdBy: res.createdBy || '',
          createdByName: res.creator ? `${res.creator.firstName || ''} ${res.creator.lastName || ''}`.trim() : 'Система',
        };
      });
      
      setReservations(mappedReservations);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      toast.error('Ошибка загрузки бронирований');
      setReservations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setSelectedReservation(null);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    setFormData({
      tableId: '',
      customerName: '',
      customerPhone: '',
      guestCount: 2,
      reservationDate: tomorrow.toISOString().split('T')[0],
      reservationTime: '19:00',
      duration: 120,
      notes: '',
    });
    setAvailableTables([]);
    setTablesMessage('');
    setShowModal(true);
  };

  const handleEdit = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setFormData({
      tableId: reservation.tableId,
      customerName: reservation.customerName,
      customerPhone: reservation.customerPhone,
      guestCount: reservation.guestCount,
      reservationDate: reservation.reservationDate,
      reservationTime: reservation.reservationTime,
      duration: reservation.duration,
      notes: reservation.notes || '',
    });
    setAvailableTables([]);
    setTablesMessage('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.tableId || !formData.customerName || !formData.customerPhone || 
        !formData.reservationDate || !formData.reservationTime) {
      toast.error('Заполните все обязательные поля');
      return;
    }

    try {
      setIsSaving(true);
      const url = selectedReservation
        ? `/api/manager/reservations/${selectedReservation.id}`
        : '/api/manager/reservations';
      
      const method = selectedReservation ? 'PATCH' : 'POST';

      const body = {
        ...formData,
        restaurantId,
        managerId,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error('Failed to save reservation');

      toast.success(selectedReservation ? 'Бронирование обновлено' : 'Бронирование создано');
      setShowModal(false);
      fetchReservations();
    } catch (error) {
      console.error('Error saving reservation:', error);
      toast.error('Ошибка сохранения бронирования');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = async (reservationId: string) => {
    setConfirmReservationId(reservationId);
    setConfirmAction('cancel');
    setShowConfirmModal(true);
  };

  const handleActivate = async (reservationId: string) => {
    setConfirmReservationId(reservationId);
    setConfirmAction('activate');
    setShowConfirmModal(true);
  };

  const executeConfirmAction = async () => {
    if (!confirmReservationId || !confirmAction) return;

    try {
      if (confirmAction === 'cancel') {
        const response = await fetch(`/api/manager/reservations/${confirmReservationId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'cancelled',
          }),
        });

        if (!response.ok) throw new Error('Failed to cancel reservation');

        toast.success('Бронирование отменено');
      } else if (confirmAction === 'activate') {
        const response = await fetch(`/api/manager/reservations/${confirmReservationId}/activate`, {
          method: 'POST',
        });

        if (!response.ok) throw new Error('Failed to activate reservation');

        toast.success('Стол активирован для клиента');
      }

      fetchReservations();
    } catch (error) {
      console.error('Error executing action:', error);
      toast.error(confirmAction === 'cancel' ? 'Ошибка отмены бронирования' : 'Ошибка активации стола');
    } finally {
      setShowConfirmModal(false);
      setConfirmReservationId(null);
      setConfirmAction(null);
    }
  };

  // Группировка по дням
  const groupedReservations = (Array.isArray(reservations) ? reservations : []).reduce((acc, res) => {
    if (!acc[res.reservationDate]) {
      acc[res.reservationDate] = [];
    }
    acc[res.reservationDate].push(res);
    return acc;
  }, {} as Record<string, Reservation[]>);

  // Сортировка дат
  const sortedDates = Object.keys(groupedReservations).sort();

  if (isLoading) {
    return <LoadingState message="Загрузка бронирований..." />;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Бронирование столиков</h1>
          <p className="mt-1 text-sm text-gray-600">
            Управление бронированием столов для гостей
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="Добавить бронь"
          title="Добавить бронь"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      </div>

      {reservations.length === 0 ? (
        <EmptyState title="Нет бронирований" description="Создайте первое бронирование" />
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => (
            <div key={date}>
              <h2 className="mb-3 text-lg font-semibold text-gray-900">
                {new Date(date + 'T00:00:00').toLocaleDateString('ru-RU', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </h2>

              <div className="space-y-3">
                {groupedReservations[date]
                  .sort((a, b) => a.reservationTime.localeCompare(b.reservationTime))
                  .map((reservation) => (
                    <Card key={reservation.id}>
                      <div className="flex items-start justify-between gap-4">
                        {/* Левая часть - основная информация */}
                        <div className="flex-1">
                          {/* Номер столика и статус */}
                          <div className="mb-3 flex items-center gap-3">
                            <span className="text-xl font-bold text-gray-900">
                              Стол {reservation.tableNumber}
                            </span>
                            <Badge 
                              variant={
                                reservation.status === 'confirmed' ? 'success' :
                                reservation.status === 'cancelled' ? 'danger' :
                                reservation.status === 'completed' ? 'info' :
                                'warning'
                              }
                            >
                              {
                                reservation.status === 'confirmed' ? 'Подтверждено' :
                                reservation.status === 'cancelled' ? 'Отменено' :
                                reservation.status === 'completed' ? 'Завершено' :
                                'Ожидание'
                              }
                            </Badge>
                          </div>

                          {/* Дата, время и продолжительность */}
                          <div className="mb-2 text-base font-medium text-gray-700">
                            📅 {new Date(reservation.reservationDate + 'T00:00:00').toLocaleDateString('ru-RU', {
                              day: '2-digit',
                              month: '2-digit',
                              year: '2-digit',
                            })} · 🕒 {reservation.reservationTime} · {reservation.duration} мин
                          </div>

                          {/* Имя клиента и количество гостей */}
                          <div className="mb-2 text-base font-semibold text-gray-900">
                            {reservation.customerName} · 👥 {reservation.guestCount} {reservation.guestCount === 1 ? 'гость' : 'гостей'}
                          </div>
                          
                          {/* Телефон */}
                          <div className="mb-2 text-sm text-gray-600">
                            📞 {reservation.customerPhone}
                          </div>

                          {/* Заметки */}
                          {reservation.notes && (
                            <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                              {reservation.notes}
                            </div>
                          )}

                          {/* Создано */}
                          <div className="mt-3 text-xs text-gray-500">
                            Создано: {reservation.createdByName || 'Система'}
                          </div>
                        </div>

                        {/* Правая часть - кнопки действий */}
                        {reservation.status === 'pending' && (
                          <div className="flex flex-col gap-2">
                            {/* Клиент пришёл */}
                            <button
                              onClick={() => handleActivate(reservation.id)}
                              className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white transition-colors hover:bg-green-600"
                              title="Клиент пришёл"
                            >
                              <svg
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2.5}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </button>

                            {/* Изменить */}
                            <button
                              onClick={() => handleEdit(reservation)}
                              className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-white transition-colors hover:bg-blue-600"
                              title="Изменить"
                            >
                              <svg
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                />
                              </svg>
                            </button>

                            {/* Отменить */}
                            <button
                              onClick={() => handleCancel(reservation.id)}
                              className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600"
                              title="Отменить"
                            >
                              <svg
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2.5}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модальное окно добавления/редактирования */}
      <Modal
        isOpen={showModal}
        onClose={() => !isSaving && setShowModal(false)}
        title={selectedReservation ? 'Редактирование брони' : 'Новое бронирование'}
        size="md"
      >
        <div className="space-y-4">
          {/* Дата и время - первое поле */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Дата *
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
                  value={formData.reservationDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, reservationDate: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  style={{
                    colorScheme: 'light'
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Время *
              </label>
              <Input
                type="time"
                value={formData.reservationTime}
                onChange={(e) => setFormData(prev => ({ ...prev, reservationTime: e.target.value }))}
              />
            </div>
          </div>

          {/* Столик - отображается только после загрузки доступных столиков */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Столик *
            </label>
            
            {loadingTables ? (
              <div className="flex items-center justify-center rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-500">
                Загрузка столиков...
              </div>
            ) : availableTables.length > 0 ? (
              <Select
                value={formData.tableId}
                onChange={(e) => setFormData(prev => ({ ...prev, tableId: e.target.value }))}
                disabled={!!selectedReservation}
                placeholder="Выберите столик"
                options={availableTables.map((table) => ({
                  value: table.id,
                  label: `Стол ${table.number} (${table.capacity} мест)`,
                }))}
              />
            ) : formData.reservationDate && formData.reservationTime ? (
              <div className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                —
                {tablesMessage && (
                  <div className="mt-1 text-xs text-gray-600">{tablesMessage}</div>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                Сначала выберите дату и время
              </div>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Имя клиента *
            </label>
            <Input
              value={formData.customerName}
              onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
              placeholder="Иван Иванов"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Телефон *
            </label>
            <Input
              type="tel"
              value={formData.customerPhone}
              onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
              placeholder="+7 (999) 123-45-67"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Количество гостей
              </label>
              <Input
                type="number"
                min="1"
                value={formData.guestCount}
                onChange={(e) => setFormData(prev => ({ ...prev, guestCount: parseInt(e.target.value) || 1 }))}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Длительность (мин)
              </label>
              <Input
                type="number"
                min="30"
                step="30"
                value={formData.duration}
                onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 120 }))}
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Примечания
            </label>
            <Textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Дополнительные пожелания..."
            />
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="secondary" onClick={() => setShowModal(false)} disabled={isSaving}>
              Отмена
            </Button>
            <Button onClick={handleSave} isLoading={isSaving}>
              Сохранить
            </Button>
          </div>
        </div>
      </Modal>

      {/* Модальное окно подтверждения действия */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title={confirmAction === 'cancel' ? 'Отменить бронирование?' : 'Клиент пришёл?'}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            {confirmAction === 'cancel' 
              ? 'Вы уверены, что хотите отменить это бронирование? Это действие нельзя отменить.' 
              : 'Подтвердите, что клиент пришёл и стол готов к активации.'}
          </p>
          
          <div className="flex justify-end gap-3">
            <Button 
              variant="secondary" 
              onClick={() => setShowConfirmModal(false)}
            >
              Отмена
            </Button>
            <Button 
              variant={confirmAction === 'cancel' ? 'danger' : 'success'}
              onClick={executeConfirmAction}
            >
              {confirmAction === 'cancel' ? 'Да, отменить' : 'Да, активировать'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
