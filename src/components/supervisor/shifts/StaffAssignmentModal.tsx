"use client";

import type { Schedule, Department, User, StaffAssignment } from '@/types/shift';

interface Conflict {
  userName: string;
  conflicts: Array<{
    shiftName: string;
    date: string;
    startTime: string;
    durationHours: number;
  }>;
}

interface CurrentAssignments {
  [userId: string]: StaffAssignment;
}

interface StaffAssignmentModalProps {
  schedule: Schedule | null;
  departments: Department[];
  availableStaff: User[];
  currentAssignments: CurrentAssignments;
  staffConflicts: Conflict[];
  loading: boolean;
  error: string | null;
  onToggleAssignment: (userId: string, user: User) => void;
  onUpdateAssignment: (userId: string, updates: Partial<StaffAssignment>) => void;
  onSave: () => void;
  onOpenTables: (schedule: Schedule) => void;
  onClose: () => void;
}

export function StaffAssignmentModal({
  schedule,
  departments,
  availableStaff,
  currentAssignments,
  staffConflicts,
  loading,
  error,
  onToggleAssignment,
  onUpdateAssignment,
  onSave,
  onOpenTables,
  onClose,
}: StaffAssignmentModalProps) {
  if (!schedule) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000] bg-opacity-50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#ffffff] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-2 text-xl font-bold text-[#111827]">
          Назначить персонал на смену
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
          {' • '}
          {schedule.template?.startTime.slice(0, 5)} ({schedule.template?.durationHours}ч)
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-[#fee2e2] p-3 text-sm text-[#dc2626]">
            {error}
          </div>
        )}

        {staffConflicts.length > 0 && (
          <div className="mb-4 rounded-lg bg-[#fef3c7] p-3">
            <p className="mb-2 text-sm font-semibold text-[#92400e]">
              ⚠️ Конфликты расписания:
            </p>
            {staffConflicts.map((conflict, idx) => (
              <div key={idx} className="mb-2 text-xs text-[#92400e]">
                <p className="font-semibold">{conflict.userName}</p>
                {conflict.conflicts.map((c: any, i: number) => (
                  <p key={i} className="ml-4">
                    • {c.shiftName || 'Смена'} на {c.date} ({c.startTime.slice(0, 5)} • {c.durationHours}ч)
                  </p>
                ))}
              </div>
            ))}
          </div>
        )}

        <div className="space-y-4">
          {departments.map((dept) => {
            const deptStaff = availableStaff.filter(
              (s) => s.departmentId === dept.id
            );

            if (deptStaff.length === 0) return null;

            return (
              <div key={dept.id} className="rounded-xl border-2 border-[#e5e7eb] p-4">
                <h4 className="mb-3 font-bold text-[#111827]">{dept.name}</h4>
                <div className="space-y-3">
                  {deptStaff.map((user) => {
                    const isAssigned = !!currentAssignments[user.id];
                    const assignment = currentAssignments[user.id];

                    return (
                      <div
                        key={user.id}
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
                            onChange={() => onToggleAssignment(user.id, user)}
                            className="mt-1"
                            disabled={loading}
                          />
                          <div className="flex-1">
                            <div className="font-semibold text-[#111827]">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-xs text-[#6b7280]">
                              {user.email} • {user.role}
                            </div>

                            {isAssigned && assignment && (
                              <div className="mt-2 grid grid-cols-2 gap-2">
                                <div>
                                  <label className="mb-1 block text-xs font-semibold text-[#374151]">
                                    Время начала
                                  </label>
                                  <input
                                    type="time"
                                    step="60"
                                    value={(assignment.startTime || '09:00').substring(0, 5)}
                                    onChange={(e) => {
                                      const time = e.target.value.substring(0, 5);
                                      onUpdateAssignment(user.id, {
                                        startTime: time,
                                      });
                                    }}
                                    className="w-full rounded border border-[#d1d5db] px-2 py-1 text-sm text-[#111827] focus:border-[#3b82f6] focus:outline-none"
                                    disabled={loading}
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-semibold text-[#374151]">
                                    Длительность (ч)
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    max="24"
                                    value={assignment.durationHours}
                                    onChange={(e) =>
                                      onUpdateAssignment(user.id, {
                                        durationHours: parseInt(e.target.value) || 1,
                                      })
                                    }
                                    className="w-full rounded border border-[#d1d5db] px-2 py-1 text-sm text-[#111827] focus:border-[#3b82f6] focus:outline-none"
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
                </div>
              </div>
            );
          })}

          {availableStaff.length === 0 && !loading && (
            <div className="py-8 text-center text-[#9ca3af]">
              <p>Нет доступных сотрудников</p>
            </div>
          )}

          {loading && availableStaff.length === 0 && (
            <div className="py-8 text-center text-[#9ca3af]">
              <p>Загрузка...</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onSave}
            disabled={loading || Object.keys(currentAssignments).length === 0}
            className="flex-1 rounded-lg bg-[#3b82f6] py-2 font-semibold text-[#ffffff] hover:bg-[#2563eb] disabled:opacity-50"
          >
            {loading ? 'Сохранение...' : `Сохранить (${Object.keys(currentAssignments).length})`}
          </button>
          <button
            onClick={() => onOpenTables(schedule)}
            disabled={loading}
            className="flex-1 rounded-lg bg-[#16a34a] py-2 font-semibold text-[#ffffff] hover:bg-[#15803d] disabled:opacity-50"
          >
            Далее: Столики →
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
