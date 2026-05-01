"use client";

import type { ShiftTemplate, Department, Table, User } from '@/types/shift';

interface TableWaiterAssignment {
  startTime: string;
  duration: string;
}

interface TableWaiterAssignments {
  [userId: string]: TableWaiterAssignment;
}

interface TableWaiterModalProps {
  tableInfo: {
    table: Table;
    template: ShiftTemplate;
    department: Department;
  } | null;
  waitersList: User[];
  tableWaiterAssignments: TableWaiterAssignments;
  loading: boolean;
  error: string | null;
  onToggleAssignment: (userId: string, user: User) => void;
  onUpdateAssignment: (userId: string, updates: Partial<TableWaiterAssignment>) => void;
  onSave: () => void;
  onClose: () => void;
}

export function TableWaiterModal({
  tableInfo,
  waitersList,
  tableWaiterAssignments,
  loading,
  error,
  onToggleAssignment,
  onUpdateAssignment,
  onSave,
  onClose,
}: TableWaiterModalProps) {
  if (!tableInfo) return null;

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-[#000000] bg-opacity-50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#ffffff] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-2 text-xl font-bold text-[#111827]">
          Назначить официантов на столик {tableInfo.table.number}
        </h3>
        <p className="mb-4 text-sm text-[#6b7280]">
          Смена: {tableInfo.template.name} • {tableInfo.template.startTime.slice(0, 5)} ({tableInfo.template.durationHours}ч)
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-[#fee2e2] p-3 text-sm text-[#dc2626]">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {waitersList.map((waiter) => {
            const isAssigned = !!tableWaiterAssignments[waiter.id];
            const assignment = tableWaiterAssignments[waiter.id];

            return (
              <div
                key={waiter.id}
                className={`rounded-lg border-2 p-3 transition ${
                  isAssigned
                    ? 'border-[#3b82f6] bg-[#eff6ff]'
                    : 'border-[#e5e7eb] bg-[#ffffff]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isAssigned}
                    onChange={() => onToggleAssignment(waiter.id, waiter)}
                    className="mt-1"
                    disabled={loading}
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-[#111827]">
                      {waiter.firstName} {waiter.lastName}
                    </div>
                    <div className="text-xs text-[#6b7280]">{waiter.email}</div>

                    {isAssigned && assignment && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-[#374151]">
                            Начало обслуживания
                          </label>
                          <input
                            type="time"
                            step="60"
                            value={(assignment.startTime || '09:00').substring(0, 5)}
                            onChange={(e) => {
                              const time = e.target.value.substring(0, 5);
                              onUpdateAssignment(waiter.id, {
                                startTime: time,
                              });
                            }}
                            className="w-full rounded border border-[#d1d5db] px-2 py-1 text-sm text-[#111827]"
                            disabled={loading}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-[#374151]">
                            Продолжительность
                          </label>
                          <input
                            type="time"
                            step="60"
                            value={assignment.duration || '08:00'}
                            onChange={(e) => {
                              const time = e.target.value.substring(0, 5);
                              onUpdateAssignment(waiter.id, {
                                duration: time,
                              });
                            }}
                            className="w-full rounded border border-[#d1d5db] px-2 py-1 text-sm text-[#111827]"
                            disabled={loading}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {waitersList.length === 0 && !loading && (
            <div className="py-8 text-center text-[#9ca3af]">
              <p>Нет официантов</p>
            </div>
          )}

          {loading && waitersList.length === 0 && (
            <div className="py-8 text-center text-[#9ca3af]">
              <p>Загрузка...</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onSave}
            disabled={loading}
            className="flex-1 rounded-lg bg-[#3b82f6] py-2 font-semibold text-[#ffffff] hover:bg-[#2563eb] disabled:opacity-50"
          >
            {loading ? 'Сохранение...' : 'Сохранить'}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-lg bg-[#e5e7eb] py-2 font-semibold text-[#374151] hover:bg-[#d1d5db] disabled:opacity-50"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
