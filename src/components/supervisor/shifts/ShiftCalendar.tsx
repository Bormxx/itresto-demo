'use client';

import { Schedule } from '@/types/shift';
import { formatDate, getDayName, isToday, isPast } from '@/lib/shiftUtils';
import { Button } from '@/components/ui';

interface ShiftCalendarProps {
  days: Date[];
  schedules: Schedule[];
  loading: boolean;
  onCopyWeek: () => void;
  onNavigateWeek: (direction: 'prev' | 'next') => void;
  onSelectDate: (dateStr: string) => void;
}

export default function ShiftCalendar({
  days,
  schedules,
  loading,
  onCopyWeek,
  onNavigateWeek,
  onSelectDate,
}: ShiftCalendarProps) {
  const getSchedulesForDate = (date: Date) => {
    const dateStr = formatDate(date);
    return schedules.filter(s => s.date === dateStr);
  };

  return (
    <div className="mb-8 rounded-2xl bg-[#ffffff] p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#111827]">
          📅 Управление по дням
        </h2>
        <div className="flex gap-2">
          <Button
            onClick={onCopyWeek}
            disabled={loading}
            variant="primary"
            size="sm"
          >
            📋 Копировать прошлую неделю
          </Button>
          <Button
            onClick={() => onNavigateWeek('prev')}
            variant="secondary"
            size="sm"
          >
            ← Назад
          </Button>
          <Button
            onClick={() => onNavigateWeek('next')}
            variant="secondary"
            size="sm"
          >
            Вперед →
          </Button>
        </div>
      </div>

      {/* Сетка дней */}
      <div className="grid grid-cols-7 gap-3">
        {days.map((day, index) => {
          const daySchedules = getSchedulesForDate(day);
          const today = isToday(day);
          const past = isPast(day);

          return (
            <button
              key={index}
              onClick={() => onSelectDate(formatDate(day))}
              disabled={past}
              className={`
                rounded-xl border-2 p-4 text-left transition
                ${today ? 'border-[#3b82f6] bg-[#eff6ff]' : 'border-[#e5e7eb] bg-[#ffffff]'}
                ${past ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#3b82f6] cursor-pointer'}
              `}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-[#6b7280]">
                  {getDayName(day)}
                </span>
                {today && (
                  <span className="text-xs font-bold text-[#3b82f6]">Сегодня</span>
                )}
              </div>
              <div className="mb-2 text-2xl font-bold text-[#111827]">
                {day.getDate()}
              </div>
              <div className="text-xs text-[#6b7280]">
                {day.toLocaleDateString('ru-RU', { month: 'long' })}
              </div>
              
              {daySchedules.length > 0 ? (
                <div className="mt-3 space-y-1">
                  {daySchedules.map((schedule) => (
                    <div key={schedule.id} className="rounded-lg bg-[#f3f4f6] px-2 py-1">
                      {schedule.isDayOff ? (
                        <span className="text-xs font-semibold text-[#9ca3af]">
                          Выходной
                        </span>
                      ) : schedule.template ? (
                        <div>
                          <div className="text-xs font-semibold text-[#111827]">
                            {schedule.template.name}
                          </div>
                          <div className="text-xs text-[#6b7280]">
                            {schedule.template.startTime.slice(0, 5)} • {schedule.template.durationHours}ч
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                !past && (
                  <div className="mt-3 text-xs text-[#9ca3af]">Не назначено</div>
                )
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
