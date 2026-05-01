"use client";

import type { Schedule, Table, WaiterStaffAssignment, TableAssignment as TableAssignmentType } from '@/types/shift';

interface TableAssignmentModalProps {
  schedule: Schedule | null;
  availableTables: Table[];
  waiters: WaiterStaffAssignment[];
  tableAssignments: { [tableId: string]: TableAssignmentType };
  loading: boolean;
  error: string | null;
  onAssignTable: (tableId: string, staffAssignmentId: string, startTime: string, durationHours: number) => void;
  onUnassignTable: (tableId: string, assignmentId: string) => void;
  onClose: () => void;
}

export function TableAssignmentModal({
  schedule,
  availableTables,
  waiters,
  tableAssignments,
  loading,
  error,
  onAssignTable,
  onUnassignTable,
  onClose,
}: TableAssignmentModalProps) {
  if (!schedule) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000] bg-opacity-50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#ffffff] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-2 text-xl font-bold text-[#111827]">
          Назначить столики официантам
        </h3>
        <p className="mb-4 text-sm text-[#6b7280]">
          {new Date(schedule.date).toLocaleDateString('ru-RU', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
          {' • '}
          {schedule.template?.name}
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-[#fee2e2] p-3 text-sm text-[#dc2626]">
            {error}
          </div>
        )}

        {waiters.length === 0 && !loading && (
          <div className="mb-4 rounded-lg bg-[#fef3c7] p-3 text-sm text-[#92400e]">
            ⚠️ Сначала назначьте официантов на эту смену
          </div>
        )}

        <div className="space-y-3">
          {availableTables.map((table) => {
            const assignment = tableAssignments[table.id];
            const assignedWaiter = waiters.find((w) => w.id === assignment?.staffAssignmentId);

            return (
              <div
                key={table.id}
                className={`rounded-xl border-2 p-4 transition ${
                  assignment
                    ? 'border-[#3b82f6] bg-[#eff6ff]'
                    : 'border-[#e5e7eb] bg-[#ffffff]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-[#111827]">
                      Столик №{table.number}
                    </h4>
                    <p className="text-sm text-[#6b7280]">
                      Вместимость: {table.capacity} чел.
                      {table.description && ` • ${table.description}`}
                    </p>
                  </div>

                  {assignment && assignedWaiter && (
                    <button
                      onClick={() => onUnassignTable(table.id, assignment.id!)}
                      disabled={loading}
                      className="text-sm text-[#dc2626] hover:underline disabled:opacity-50"
                    >
                      Отменить
                    </button>
                  )}
                </div>

                {assignment && assignedWaiter ? (
                  <div className="mt-3 rounded-lg bg-[#f3f4f6] p-3">
                    <p className="text-sm font-semibold text-[#111827]">
                      ✓ Назначен: {assignedWaiter.userName}
                    </p>
                    <p className="text-xs text-[#6b7280]">
                      {assignment.startTime.slice(0, 5)} • {assignment.durationHours} часов
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {waiters.map((waiter) => (
                      <div
                        key={waiter.id}
                        className="rounded-lg border border-[#e5e7eb] p-3"
                      >
                        <p className="mb-2 text-sm font-semibold text-[#111827]">
                          {waiter.userName}
                        </p>
                        <div className="mb-2 grid grid-cols-2 gap-2">
                          <div>
                            <label className="mb-1 block text-xs text-[#6b7280]">
                              Начало
                            </label>
                            <input
                              type="time"
                              step="60"
                              defaultValue={(waiter.startTime || '09:00').substring(0, 5)}
                              id={`table-${table.id}-waiter-${waiter.id}-start`}
                              className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs text-[#111827]"
                              disabled={loading}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-[#6b7280]">
                              Часов
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="24"
                              defaultValue={waiter.durationHours}
                              id={`table-${table.id}-waiter-${waiter.id}-duration`}
                              className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs text-[#111827]"
                              disabled={loading}
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const startInput = document.getElementById(
                              `table-${table.id}-waiter-${waiter.id}-start`
                            ) as HTMLInputElement;
                            const durationInput = document.getElementById(
                              `table-${table.id}-waiter-${waiter.id}-duration`
                            ) as HTMLInputElement;

                            onAssignTable(
                              table.id,
                              waiter.id,
                              startInput.value,
                              parseInt(durationInput.value) || 1
                            );
                          }}
                          disabled={loading}
                          className="w-full rounded bg-[#3b82f6] px-3 py-1 text-xs font-semibold text-[#ffffff] hover:bg-[#2563eb] disabled:opacity-50"
                        >
                          Назначить
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {availableTables.length === 0 && !loading && (
            <div className="py-8 text-center text-[#9ca3af]">
              <p>Нет доступных столиков</p>
            </div>
          )}

          {loading && availableTables.length === 0 && (
            <div className="py-8 text-center text-[#9ca3af]">
              <p>Загрузка...</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg bg-[#3b82f6] px-6 py-2 font-semibold text-[#ffffff] hover:bg-[#2563eb] disabled:opacity-50"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
}
