"use client";

import { useState } from 'react';
import type { Schedule, Table, WaiterStaffAssignment, TableAssignment as TableAssignmentType } from '@/types/shift';

interface WaiterTableAssignmentModalProps {
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

export function WaiterTableAssignmentModal({
  schedule,
  availableTables,
  waiters,
  tableAssignments,
  loading,
  error,
  onAssignTable,
  onUnassignTable,
  onClose,
}: WaiterTableAssignmentModalProps) {
  const [selectedWaiterId, setSelectedWaiterId] = useState<string | null>(
    waiters.length > 0 ? waiters[0].id : null
  );
  const [selectedTableIds, setSelectedTableIds] = useState<Set<string>>(new Set());
  const [startTime, setStartTime] = useState('09:00');
  const [durationHours, setDurationHours] = useState(8);

  if (!schedule) return null;

  const selectedWaiter = waiters.find(w => w.id === selectedWaiterId);

  // Получить столики, назначенные выбранному официанту
  const waiterAssignedTables = Object.entries(tableAssignments)
    .filter(([_, assignment]) => assignment.staffAssignmentId === selectedWaiterId)
    .map(([tableId, _]) => tableId);

  // Обработка выбора/снятия выбора столика
  const toggleTable = (tableId: string) => {
    const newSelected = new Set(selectedTableIds);
    if (newSelected.has(tableId)) {
      newSelected.delete(tableId);
    } else {
      newSelected.add(tableId);
    }
    setSelectedTableIds(newSelected);
  };

  // Обработка переключения всех столиков
  const toggleAll = () => {
    if (selectedTableIds.size === availableTables.length) {
      setSelectedTableIds(new Set());
    } else {
      setSelectedTableIds(new Set(availableTables.map(t => t.id)));
    }
  };

  // Назначить выбранные столики
  const handleAssignSelected = async () => {
    if (!selectedWaiterId || selectedTableIds.size === 0) return;

    for (const tableId of selectedTableIds) {
      await onAssignTable(tableId, selectedWaiterId, startTime, durationHours);
    }
    
    setSelectedTableIds(new Set());
  };

  // Отменить назначения выбранного официанта
  const handleUnassignAll = async () => {
    if (!selectedWaiterId) return;

    for (const tableId of waiterAssignedTables) {
      const assignment = tableAssignments[tableId];
      if (assignment?.id) {
        await onUnassignTable(tableId, assignment.id);
      }
    }
  };

  // Инициализация значений по умолчанию при смене официанта
  const handleWaiterChange = (waiterId: string) => {
    setSelectedWaiterId(waiterId);
    setSelectedTableIds(new Set());
    
    const waiter = waiters.find(w => w.id === waiterId);
    if (waiter) {
      setStartTime(waiter.startTime?.substring(0, 5) || '09:00');
      setDurationHours(waiter.durationHours || 8);
    }
  };

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

        {waiters.length > 0 && (
          <>
            {/* Выбор официанта */}
            <div className="mb-4 rounded-xl border-2 border-[#e5e7eb] bg-[#f9fafb] p-4">
              <label className="mb-2 block text-sm font-semibold text-[#111827]">
                Выберите официанта
              </label>
              <select
                value={selectedWaiterId || ''}
                onChange={(e) => handleWaiterChange(e.target.value)}
                disabled={loading}
                className="w-full rounded-lg border border-[#d1d5db] bg-[#ffffff] px-3 py-2 text-[#111827] disabled:opacity-50"
              >
                {waiters.map((waiter) => (
                  <option key={waiter.id} value={waiter.id}>
                    {waiter.userName}
                    {waiterAssignedTables.filter(tid => 
                      tableAssignments[tid]?.staffAssignmentId === waiter.id
                    ).length > 0 && 
                      ` (${waiterAssignedTables.filter(tid => 
                        tableAssignments[tid]?.staffAssignmentId === waiter.id
                      ).length} столиков)`
                    }
                  </option>
                ))}
              </select>

              {selectedWaiter && waiterAssignedTables.length > 0 && (
                <div className="mt-3 flex items-center justify-between rounded-lg bg-[#eff6ff] p-3">
                  <div>
                    <p className="text-sm font-semibold text-[#1e40af]">
                      Назначено столиков: {waiterAssignedTables.length}
                    </p>
                    <p className="text-xs text-[#6b7280]">
                      №{waiterAssignedTables.map(tid => 
                        availableTables.find(t => t.id === tid)?.number
                      ).join(', ')}
                    </p>
                  </div>
                  <button
                    onClick={handleUnassignAll}
                    disabled={loading}
                    className="text-sm text-[#dc2626] hover:underline disabled:opacity-50"
                  >
                    Отменить всё
                  </button>
                </div>
              )}
            </div>

            {/* Параметры назначения */}
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#111827]">
                  Время начала
                </label>
                <input
                  type="time"
                  step="60"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-[#111827] disabled:opacity-50"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#111827]">
                  Длительность (часов)
                </label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={durationHours}
                  onChange={(e) => setDurationHours(parseInt(e.target.value) || 1)}
                  disabled={loading}
                  className="w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-[#111827] disabled:opacity-50"
                />
              </div>
            </div>

            {/* Выбор столиков */}
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-semibold text-[#111827]">
                  Выберите столики ({selectedTableIds.size} выбрано)
                </label>
                <button
                  onClick={toggleAll}
                  disabled={loading || availableTables.length === 0}
                  className="text-sm text-[#3b82f6] hover:underline disabled:opacity-50"
                >
                  {selectedTableIds.size === availableTables.length ? 'Снять все' : 'Выбрать все'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {availableTables.map((table) => {
                  const isSelected = selectedTableIds.has(table.id);
                  const currentAssignment = tableAssignments[table.id];
                  const isAssignedToOther = currentAssignment && 
                    currentAssignment.staffAssignmentId !== selectedWaiterId;

                  return (
                    <div
                      key={table.id}
                      onClick={() => !isAssignedToOther && !loading && toggleTable(table.id)}
                      className={`cursor-pointer rounded-lg border-2 p-3 transition ${
                        isSelected
                          ? 'border-[#3b82f6] bg-[#eff6ff]'
                          : isAssignedToOther
                          ? 'border-[#d1d5db] bg-[#f3f4f6] opacity-50 cursor-not-allowed'
                          : 'border-[#e5e7eb] bg-[#ffffff] hover:border-[#3b82f6]'
                      }`}
                    >
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isAssignedToOther || loading}
                          readOnly
                          className="mr-2 h-4 w-4 rounded border-[#d1d5db] text-[#3b82f6] focus:ring-[#3b82f6]"
                        />
                        <div className="flex-1">
                          <p className="font-bold text-[#111827]">№{table.number}</p>
                          <p className="text-xs text-[#6b7280]">{table.capacity} мест</p>
                          {isAssignedToOther && (
                            <p className="mt-1 text-xs text-[#dc2626]">
                              Занят другим
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {availableTables.length === 0 && !loading && (
                <div className="py-8 text-center text-[#9ca3af]">
                  <p>Нет доступных столиков</p>
                </div>
              )}
            </div>

            {/* Кнопка назначения */}
            {selectedTableIds.size > 0 && (
              <div className="mb-4">
                <button
                  onClick={handleAssignSelected}
                  disabled={loading || !selectedWaiterId}
                  className="w-full rounded-lg bg-[#3b82f6] px-6 py-3 font-semibold text-[#ffffff] hover:bg-[#2563eb] disabled:opacity-50"
                >
                  Назначить выбранные столики ({selectedTableIds.size})
                </button>
              </div>
            )}
          </>
        )}

        <div className="flex justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg bg-[#6b7280] px-6 py-2 font-semibold text-[#ffffff] hover:bg-[#4b5563] disabled:opacity-50"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
