"use client";

import type { ShiftTemplate, Department, Table } from '@/types/shift';

interface TemplateTableAssignment {
  id?: string;
  tableId: string;
  waiter?: {
    firstName: string;
    lastName: string;
  };
  startTime?: string;
  durationHours?: number;
}

interface TemplateTablesModalProps {
  templateTablesInfo: {
    template: ShiftTemplate;
    department: Department;
  } | null;
  templateTables: Table[];
  templateTableAssignments: TemplateTableAssignment[];
  loading: boolean;
  error: string | null;
  onOpenTableWaiterAssignment: (table: Table, template: ShiftTemplate, department: Department) => void;
  onClose: () => void;
}

export function TemplateTablesModal({
  templateTablesInfo,
  templateTables,
  templateTableAssignments,
  loading,
  error,
  onOpenTableWaiterAssignment,
  onClose,
}: TemplateTablesModalProps) {
  if (!templateTablesInfo) return null;

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
          Управление столиками: {templateTablesInfo.department.name}
        </h3>
        <p className="mb-4 text-sm text-[#6b7280]">
          Смена: {templateTablesInfo.template.name} • {templateTablesInfo.template.startTime.slice(0, 5)} ({templateTablesInfo.template.durationHours}ч)
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-[#fee2e2] p-3 text-sm text-[#dc2626]">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templateTables.map((table) => {
            // Найти назначения для этого столика
            const assignments = templateTableAssignments.filter(a => a.tableId === table.id);
            
            return (
              <div
                key={table.id}
                onClick={() => onOpenTableWaiterAssignment(table, templateTablesInfo.template, templateTablesInfo.department)}
                className="cursor-pointer rounded-xl border-2 border-[#e5e7eb] bg-[#f9fafb] p-4 hover:border-[#3b82f6] hover:bg-[#eff6ff] transition"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-lg font-bold text-[#111827]">
                    Столик {table.number}
                  </span>
                  <span className="text-xs text-[#6b7280]">
                    Мест: {table.capacity}
                  </span>
                </div>
                
                {table.description && (
                  <p className="mb-2 text-xs text-[#6b7280]">{table.description}</p>
                )}

                {assignments.length > 0 ? (
                  <div className="space-y-1">
                    {assignments.map((assign, idx) => (
                      <div key={idx} className="rounded bg-[#e0f2fe] px-2 py-1 text-xs">
                        <div className="font-semibold text-[#1e40af]">
                          {assign.waiter?.firstName} {assign.waiter?.lastName}
                        </div>
                        <div className="text-[#1e40af]">
                          начало {assign.startTime?.substring(0, 5) || assign.startTime}
                        </div>
                        <div className="text-[#1e40af]">
                          продолжительность {assign.durationHours}ч
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-[#9ca3af]">
                    Не назначен
                  </div>
                )}
              </div>
            );
          })}

          {templateTables.length === 0 && !loading && (
            <div className="col-span-full py-12 text-center text-[#9ca3af]">
              <p className="text-lg">Нет столиков</p>
              <p className="text-sm">Добавьте столики в разделе управления столиками</p>
            </div>
          )}

          {loading && templateTables.length === 0 && (
            <div className="col-span-full py-12 text-center text-[#9ca3af]">
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
