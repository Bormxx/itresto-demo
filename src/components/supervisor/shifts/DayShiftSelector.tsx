"use client";

import type { ShiftTemplate, Schedule } from '@/types/shift';

interface DayShiftSelectorProps {
  selectedDate: string | null;
  templates: ShiftTemplate[];
  schedules: Schedule[];
  loading: boolean;
  onAssignShift: (date: Date, templateId: string | null) => void;
  onRemoveShift: (scheduleId: string, shiftName: string) => void;
  onClose: () => void;
}

export function DayShiftSelector({
  selectedDate,
  templates,
  schedules,
  loading,
  onAssignShift,
  onRemoveShift,
  onClose,
}: DayShiftSelectorProps) {
  if (!selectedDate) return null;

  const getSchedulesForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return schedules.filter((s) => s.date.startsWith(dateStr));
  };

  const currentSchedules = getSchedulesForDate(new Date(selectedDate));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000] bg-opacity-50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-[#ffffff] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-xl font-bold text-[#111827]">
          Выбрать смену
        </h3>
        <p className="mb-4 text-sm text-[#6b7280]">
          {new Date(selectedDate).toLocaleDateString('ru-RU', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>

        {currentSchedules.length > 0 && (
          <div className="mb-4 space-y-2">
            <div className="text-xs font-semibold uppercase text-[#3b82f6]">
              Назначенные смены:
            </div>
            {currentSchedules.map((schedule) => (
              <div key={schedule.id} className="rounded-lg border-2 border-[#3b82f6] bg-[#eff6ff] p-3">
                {schedule.isDayOff ? (
                  <div className="font-semibold text-[#6b7280]">Выходной день</div>
                ) : schedule.template ? (
                  <div>
                    <div className="font-semibold text-[#111827]">
                      {schedule.template.name}
                    </div>
                    <div className="text-sm text-[#6b7280]">
                      {schedule.template.startTime.slice(0, 5)} • {schedule.template.durationHours} часов
                    </div>
                  </div>
                ) : null}
                <button
                  onClick={() => onRemoveShift(
                    schedule.id,
                    schedule.isDayOff ? 'Выходной день' : schedule.template?.name || 'Смена'
                  )}
                  disabled={loading}
                  className="mt-2 w-full rounded-lg bg-[#dc2626] py-2 text-sm font-semibold text-[#ffffff] hover:bg-[#b91c1c] disabled:opacity-50"
                >
                  🗑️ Удалить
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mb-2 text-xs font-semibold uppercase text-[#6b7280]">
          Добавить новую смену:
        </div>

        <div className="space-y-2">
          <button
            onClick={() => onAssignShift(new Date(selectedDate), null)}
            disabled={loading}
            className="w-full rounded-lg border-2 border-[#e5e7eb] bg-[#f9fafb] p-3 text-left hover:border-[#3b82f6] disabled:opacity-50"
          >
            <span className="font-semibold text-[#6b7280]">Выходной день</span>
          </button>

          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => onAssignShift(new Date(selectedDate), template.id)}
              disabled={loading}
              className="w-full rounded-lg border-2 border-[#e5e7eb] bg-[#ffffff] p-3 text-left hover:border-[#3b82f6] disabled:opacity-50"
            >
              <div className="font-semibold text-[#111827]">{template.name}</div>
              <div className="text-sm text-[#6b7280]">
                {template.startTime.slice(0, 5)} • {template.durationHours} часов
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-lg bg-[#e5e7eb] py-2 font-semibold text-[#374151] hover:bg-[#d1d5db]"
        >
          Отмена
        </button>
      </div>
    </div>
  );
}
