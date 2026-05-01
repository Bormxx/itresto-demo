'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from '@/hooks/useForm';
import { Input, Select, Textarea, Button, Alert } from '@/components/ui';
import { apiClient } from '@/lib/apiClient';

interface Table {
  id: string;
  number: string;
  capacity: number;
}

interface ReservationFormProps {
  restaurantId: string;
  restaurantSlug: string;
}

export function ReservationForm({ restaurantId, restaurantSlug }: ReservationFormProps) {
  const router = useRouter();
  
  const [availableTables, setAvailableTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [searchingTables, setSearchingTables] = useState(false);
  const [success, setSuccess] = useState(false);

  const { values, errors, handleChange, handleSubmit, isSubmitting, setFieldError } = useForm({
    initialValues: {
      date: '',
      time: '',
      duration: '120',
      guests: '2',
      notes: '',
    },
    onSubmit: async (values) => {
      if (!selectedTable) {
        setFieldError('date', 'Выберите столик');
        throw new Error('No table selected');
      }

      const reservedFrom = new Date(`${values.date}T${values.time}`);
      const reservedUntil = new Date(
        reservedFrom.getTime() + parseInt(values.duration) * 60 * 1000
      );

      await apiClient.post('/api/reservations', {
        tableId: selectedTable,
        reservedFrom: reservedFrom.toISOString(),
        reservedUntil: reservedUntil.toISOString(),
        guestCount: parseInt(values.guests),
        notes: values.notes || undefined,
      });

      setSuccess(true);

      // Через 2 секунды перенаправить на профиль
      setTimeout(() => {
        router.push(`/${restaurantSlug}/profile`);
      }, 2000);
    },
  });

  const handleSearchTables = async () => {
    if (!values.date || !values.time) {
      setFieldError('date', 'Укажите дату и время');
      return;
    }

    setSearchingTables(true);
    setFieldError('date', '');
    setAvailableTables([]);
    setSelectedTable(null);

    try {
      // Используем новый endpoint с учетом смен
      const response = await fetch(
        `/api/tables/available-with-shift?restaurantId=${restaurantId}&date=${values.date}&time=${values.time}`
      );
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка загрузки столиков');
      }

      setAvailableTables(data.tables || []);
      
      if (!data.tables || data.tables.length === 0) {
        setFieldError('date', data.message || 'Нет доступных столиков на выбранное время');
      }
    } catch (err) {
      setFieldError('date', 'Не удалось найти столики');
    } finally {
      setSearchingTables(false);
    }
  };

  // Минимальная дата - сегодня
  const today = new Date().toISOString().split('T')[0];

  if (success) {
    return (
      <div className="py-8 text-center">
        <div className="mb-4 text-6xl">✅</div>
        <h3 className="mb-2 text-2xl font-bold text-[#16a34a]">
          Бронирование подтверждено!
        </h3>
        <p className="text-[#4b5563]">
          Мы ждём вас {new Date(`${values.date}T${values.time}`).toLocaleString('ru-RU')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Форма поиска столиков */}
      <div className="space-y-4">
        {errors.date && <Alert variant="error">{errors.date}</Alert>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Дата"
            type="date"
            value={values.date}
            onChange={(e) => handleChange('date', e.target.value)}
            min={today}
            required
          />

          <Input
            label="Время"
            type="time"
            value={values.time}
            onChange={(e) => handleChange('time', e.target.value)}
            required
          />

          <Select
            label="Продолжительность"
            value={values.duration}
            onChange={(e) => handleChange('duration', e.target.value)}
          >
            <option value="60">1 час</option>
            <option value="90">1.5 часа</option>
            <option value="120">2 часа</option>
            <option value="150">2.5 часа</option>
            <option value="180">3 часа</option>
          </Select>

          <Input
            label="Количество гостей"
            type="number"
            value={values.guests}
            onChange={(e) => handleChange('guests', e.target.value)}
            min="1"
            max="20"
            required
          />
        </div>

        <Textarea
          label="Комментарий (необязательно)"
          value={values.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          rows={3}
          placeholder="Особые пожелания, аллергии..."
        />

        <Button
          onClick={handleSearchTables}
          variant="primary"
          isLoading={searchingTables}
          className="w-full"
        >
          Найти свободные столики
        </Button>
      </div>

      {/* Доступные столики */}
      {availableTables.length > 0 && (
        <div>
          <h3 className="mb-4 text-lg font-semibold text-[#111827]">
            Доступные столики ({availableTables.length})
          </h3>
          
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {availableTables.map((table) => (
              <button
                key={table.id}
                onClick={() => setSelectedTable(table.id)}
                className={`rounded-lg border-2 p-4 text-left transition ${
                  selectedTable === table.id
                    ? 'border-[#3b82f6] bg-[#eff6ff]'
                    : 'border-[#e5e7eb] hover:border-[#d1d5db]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-[#111827]">
                    Столик {table.number}
                  </span>
                  {selectedTable === table.id && (
                    <span className="text-[#2563eb]">✓</span>
                  )}
                </div>
                <p className="mt-1 text-sm text-[#4b5563]">
                  До {table.capacity} человек
                </p>
              </button>
            ))}
          </div>

          <Button
            onClick={handleSubmit}
            variant="success"
            isLoading={isSubmitting}
            disabled={!selectedTable}
            className="mt-6 w-full"
          >
            Забронировать выбранный столик
          </Button>
        </div>
      )}
    </div>
  );
}
