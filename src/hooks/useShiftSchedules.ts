import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate, parseDateString } from '@/lib/shiftUtils';

interface UseShiftSchedulesProps {
  schedules: any[];
  dateRange: { startDate: string; endDate: string };
  locale: string;
  restaurantSlug: string;
}

export function useShiftSchedules({
  schedules,
  dateRange,
  locale,
  restaurantSlug,
}: UseShiftSchedulesProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ scheduleId: string; shiftName: string } | null>(null);

  // Получить расписание для конкретной даты
  const getSchedulesForDate = (date: Date) => {
    const dateStr = formatDate(date);
    return schedules.filter((s) => s.date.startsWith(dateStr));
  };

  // Скопировать неделю
  const handleCopyWeek = async () => {
    if (!confirm('Скопировать расписание с прошлой недели?')) {
      return;
    }

    setLoading(true);
    try {
      const currentStart = parseDateString(dateRange.startDate);
      const prevStart = new Date(currentStart);
      prevStart.setDate(currentStart.getDate() - 7);

      const response = await fetch('/api/supervisor/shift-schedules/copy-week', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceStartDate: formatDate(prevStart),
          targetStartDate: formatDate(currentStart),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Ошибка при копировании');
        return;
      }

      router.refresh();
    } catch (error) {
      console.error('Error copying week:', error);
      alert('Ошибка при копировании недели');
    } finally {
      setLoading(false);
    }
  };

  // Навигация по неделям
  const navigateWeeks = (direction: 'prev' | 'next') => {
    const current = parseDateString(dateRange.startDate);
    const offset = direction === 'prev' ? -7 : 7;
    current.setDate(current.getDate() + offset);
    
    router.push(
      `/${locale}/${restaurantSlug}/supervisor/shifts?startDate=${formatDate(current)}`
    );
  };

  // Назначить смену на день
  const handleAssignShift = async (date: Date, templateId: string | null) => {
    setLoading(true);
    setValidationError(null);
    
    try {
      const response = await fetch('/api/supervisor/shift-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formatDate(date),
          shiftTemplateId: templateId,
          isDayOff: !templateId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        
        // Если это ошибка валидации, показываем её в модальном окне
        if (error.error) {
          setValidationError(error.error);
          setSelectedDate(null); // Закрываем модальное окно выбора смены
        } else {
          alert(error.error || 'Ошибка при назначении смены');
        }
        return;
      }

      router.refresh();
      setSelectedDate(null);
    } catch (error) {
      console.error('Error assigning shift:', error);
      alert('Ошибка при назначении смены');
    } finally {
      setLoading(false);
    }
  };

  // Удалить назначение смены
  const handleRemoveShift = (scheduleId: string, shiftName: string) => {
    setDeleteConfirmation({ scheduleId, shiftName });
  };

  // Подтверждение удаления смены
  const confirmDeleteShift = async () => {
    if (!deleteConfirmation) return;
    
    const { scheduleId } = deleteConfirmation;
    
    setDeleteConfirmation(null); // Закрываем модальное окно
    setLoading(true);
    
    try {
      const response = await fetch(`/api/supervisor/shift-schedules/${scheduleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Delete error:', error);
        alert(error.error || 'Ошибка при удалении');
        setLoading(false);
        return;
      }

      await router.refresh();
      setSelectedDate(null);
    } catch (error) {
      console.error('Error removing shift:', error);
      alert('Ошибка при удалении назначения');
    } finally {
      setLoading(false);
    }
  };

  return {
    selectedDate,
    setSelectedDate,
    loading,
    setLoading,
    validationError,
    setValidationError,
    deleteConfirmation,
    setDeleteConfirmation,
    getSchedulesForDate,
    handleCopyWeek,
    navigateWeeks,
    handleAssignShift,
    handleRemoveShift,
    confirmDeleteShift,
  };
}
