'use client';

import { ShiftTemplate, Department } from '@/types/shift';
import { Button } from '@/components/ui';
import Tooltip from '@/components/common/Tooltip';

interface ShiftTemplateListProps {
  templates: ShiftTemplate[];
  departments: Department[];
  loading: boolean;
  onAddTemplate: () => void;
  onEditTemplate: (template: ShiftTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
  onManageDepartment: (template: ShiftTemplate, department: Department) => void;
  onManageTables: (template: ShiftTemplate, department: Department) => void;
  isWaiterDepartment: (department: Department) => boolean;
}

export default function ShiftTemplateList({
  templates,
  departments,
  loading,
  onAddTemplate,
  onEditTemplate,
  onDeleteTemplate,
  onManageDepartment,
  onManageTables,
  isWaiterDepartment,
}: ShiftTemplateListProps) {
  const calculateEndTime = (startTime: string, durationHours: number) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationHours * 60;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  };

  return (
    <div className="rounded-2xl bg-[#ffffff] p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#111827]">
          🔧 Управление сменами
        </h2>
        <Button onClick={onAddTemplate} variant="success">
          + Добавить смену
        </Button>
      </div>

      <div className="space-y-4">
        {templates.map((template) => (
          <div
            key={template.id}
            className="rounded-xl border-2 border-[#e5e7eb] bg-[#f9fafb] p-4"
          >
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#111827]">
                  {template.name}
                </h3>
                <p className="text-sm text-[#6b7280]">
                  {template.startTime.slice(0, 5)} • {template.durationHours} часов
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onEditTemplate(template)}
                  className="text-sm text-[#3b82f6] hover:underline"
                >
                  Редактировать
                </button>
                <button
                  onClick={() => onDeleteTemplate(template.id)}
                  disabled={loading}
                  className="text-sm text-[#dc2626] hover:underline disabled:opacity-50"
                >
                  Удалить
                </button>
              </div>
            </div>

            {/* Отделы */}
            <div className="flex flex-wrap gap-2">
              {departments.map((dept) => {
                const count = template.departmentCounts?.[dept.id] || 0;
                const assignments = template.departmentAssignments?.[dept.id] || [];

                const tooltipContent = assignments.length > 0 ? (
                  <div className="space-y-1">
                    {assignments.map((assignment, idx) => (
                      <div key={idx} className="flex flex-col">
                        <span className="font-semibold">
                          {assignment.lastName} {assignment.firstName}
                        </span>
                        <span className="text-gray-300">
                          {assignment.startTime.slice(0, 5)} - {calculateEndTime(assignment.startTime, parseFloat(assignment.durationHours))}
                        </span>
                        {isWaiterDepartment(dept) && !assignment.hasTableAssignments && (
                          <span className="text-yellow-300 text-xs mt-1">
                            ⚠️ Не назначен ни на один столик
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span>Нет назначенных сотрудников</span>
                );

                return (
                  <Tooltip key={dept.id} content={tooltipContent}>
                    <button
                      onClick={() => {
                        if (isWaiterDepartment(dept)) {
                          onManageTables(template, dept);
                        } else {
                          onManageDepartment(template, dept);
                        }
                      }}
                      disabled={loading}
                      className="rounded-lg bg-[#e5e7eb] px-3 py-1 text-sm font-semibold text-[#374151] hover:bg-[#d1d5db] disabled:opacity-50"
                    >
                      {dept.name} - {count}
                    </button>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        ))}

        {templates.length === 0 && (
          <div className="py-12 text-center text-[#9ca3af]">
            <p className="text-lg">Нет созданных смен</p>
            <p className="text-sm">Создайте первую смену, чтобы начать планирование</p>
          </div>
        )}
      </div>
    </div>
  );
}
