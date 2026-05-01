'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Tooltip from '@/components/common/Tooltip';
import { useShiftTemplates } from '@/hooks/useShiftTemplates';
import { useShiftSchedules } from '@/hooks/useShiftSchedules';
import { useStaffAssignments } from '@/hooks/useStaffAssignments';
import { useTableAssignments } from '@/hooks/useTableAssignments';
import { WaiterTableAssignmentModal } from './shifts/WaiterTableAssignmentModal';

type ShiftTemplate = {
  id: string;
  name: string;
  startTime: string;
  durationHours: string;
  departmentCounts: Record<string, number>;
  departmentAssignments?: Record<string, Array<{
    userId: string;
    firstName: string;
    lastName: string;
    startTime: string;
    durationHours: string;
    hasTableAssignments: boolean;
  }>>;
};

type Schedule = {
  id: string;
  date: string;
  shiftTemplateId: string | null;
  isDayOff: boolean;
  template: {
    id: string;
    name: string;
    startTime: string;
    durationHours: string;
  } | null;
};

type Department = {
  id: string;
  name: string;
};

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  departmentId: string | null;
};

type StaffAssignment = {
  userId: string;
  departmentId: string | null;
  startTime: string;
  durationHours: number;
};

type Table = {
  id: string;
  number: string;
  capacity: number;
  description: string | null;
};

type WaiterStaffAssignment = {
  id: string;
  userId: string;
  userName: string;
  startTime: string;
  durationHours: number;
};

type TableAssignment = {
  id?: string;
  tableId: string;
  staffAssignmentId: string;
  startTime: string;
  durationHours: number;
};

type Props = {
  initialTemplates: ShiftTemplate[];
  initialSchedules: Schedule[];
  departments: Department[];
  dateRange: { startDate: string; endDate: string };
  locale: string;
  restaurantSlug: string;
};

export default function ShiftManagement({
  initialTemplates,
  initialSchedules,
  departments,
  dateRange,
  locale,
  restaurantSlug,
}: Props) {
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>(initialSchedules);

  // Синхронизируем schedules с props при изменении данных с сервера
  useEffect(() => {
    setSchedules(initialSchedules);
  }, [JSON.stringify(initialSchedules)]);

  // Инициализация хуков
  const templateHook = useShiftTemplates({ initialTemplates });
  const scheduleHook = useShiftSchedules({ schedules, dateRange, locale, restaurantSlug });
  const staffHook = useStaffAssignments({ templates: templateHook.templates, setTemplates: templateHook.setTemplates });
  const tableHook = useTableAssignments({ templates: templateHook.templates, setTemplates: templateHook.setTemplates });

  // Вспомогательные функции для работы с датами
  const parseDateString = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDisplayDate = (date: Date) => {
    const day = date.getDate();
    const month = date.toLocaleString('ru-RU', { month: 'short' });
    return `${day} ${month}`;
  };

  const getDayName = (date: Date) => {
    return date.toLocaleDateString('ru-RU', { weekday: 'short' });
  };

  const generate14Days = () => {
    const days = [];
    const start = parseDateString(dateRange.startDate);
    
    for (let i = 0; i < 14; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      days.push(date);
    }
    
    return days;
  };

  const isWaiterDepartment = (department: Department) => {
    return department.name.toLowerCase().includes('официант') || 
           department.name.toLowerCase().includes('waiter');
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return formatDate(date) === formatDate(today);
  };

  const isPast = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const days = generate14Days();

  // Состояние для прокрутки карточек на мобильных устройствах
  const [mobileScrollIndex, setMobileScrollIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const daysContainerRef = useRef<HTMLDivElement>(null);

  // Определяем, мобильное ли устройство и центрируем текущий день
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Центрируем текущий день при загрузке на мобильных
  useEffect(() => {
    if (isMobile) {
      const todayIndex = days.findIndex(day => isToday(day));
      if (todayIndex !== -1) {
        // Центрируем текущий день
        setMobileScrollIndex(todayIndex);
      }
    }
  }, [isMobile, days.length]);

  // Функции для прокрутки карточек на мобильных
  const scrollMobileDays = (direction: 'left' | 'right') => {
    const maxIndex = days.length - 1; // Показываем 1 карточку по центру
    if (direction === 'left') {
      setMobileScrollIndex(prev => Math.max(0, prev - 1));
    } else {
      setMobileScrollIndex(prev => Math.min(maxIndex, prev + 1));
    }
  };

  // Локальный state для формы создания/редактирования шаблона
  const [templateForm, setTemplateForm] = useState({
    name: '',
    startTime: '09:00',
    duration: '08:00',
  });

  // Синхронизируем форму с selectedTemplate из хука
  useEffect(() => {
    if (templateHook.selectedTemplate) {
      if (templateHook.selectedTemplate.id) {
        // Редактирование
        setTemplateForm({
          name: templateHook.selectedTemplate.name,
          startTime: templateHook.selectedTemplate.startTime,
          duration: templateHook.durationToTime(templateHook.selectedTemplate.durationHours),
        });
      } else {
        // Создание нового
        setTemplateForm({
          name: '',
          startTime: '09:00',
          duration: '08:00',
        });
      }
    }
  }, [templateHook.selectedTemplate]);

  return (
    <div className="min-h-screen bg-[#f3f4f6] p-6">
      <div className="mx-auto max-w-7xl">
        {/* Заголовок */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#111827]">Управление сменами</h1>
          <p className="mt-2 text-[#6b7280]">
            Планирование расписания и назначение персонала
          </p>
        </div>

        {/* Управление по дням */}
        <div className="mb-8 rounded-2xl bg-[#ffffff] p-6 shadow-sm">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-[#111827]">
                Управление по дням
              </h2>
              <button
                onClick={scheduleHook.handleCopyWeek}
                disabled={scheduleHook.loading}
                className="hidden md:inline-block rounded-lg bg-[#3b82f6] px-4 py-2 text-sm font-semibold text-[#ffffff] hover:bg-[#2563eb] disabled:opacity-50"
              >
                Вставить пред. неделю
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center md:justify-start">
              <button
                onClick={scheduleHook.handleCopyWeek}
                disabled={scheduleHook.loading}
                className="md:hidden rounded-lg bg-[#3b82f6] px-3 py-2 text-sm font-semibold text-[#ffffff] hover:bg-[#2563eb] disabled:opacity-50"
              >
                Вставить пред. неделю
              </button>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => scheduleHook.navigateWeeks('prev')}
                  className="rounded-lg bg-[#e5e7eb] px-3 py-2 text-sm font-semibold text-[#374151] hover:bg-[#d1d5db] flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  Неделя назад
                </button>
                <button
                  onClick={() => scheduleHook.navigateWeeks('next')}
                  className="rounded-lg bg-[#e5e7eb] px-3 py-2 text-sm font-semibold text-[#374151] hover:bg-[#d1d5db] flex items-center gap-2"
                >
                  Неделя вперёд
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Сетка дней - с навигацией на мобильных */}
          <div className="relative">
            {/* Кнопки навигации для мобильных - слева и справа */}
            <button
              onClick={() => scrollMobileDays('left')}
              disabled={mobileScrollIndex === 0}
              className="md:hidden absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white shadow-lg p-2 text-[#374151] hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition border border-gray-200"
              aria-label="Предыдущий день"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => scrollMobileDays('right')}
              disabled={mobileScrollIndex >= days.length - 1}
              className="md:hidden absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white shadow-lg p-2 text-[#374151] hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition border border-gray-200"
              aria-label="Следующий день"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Контейнер дней */}
            <div 
              ref={daysContainerRef}
              className="overflow-hidden px-11 md:px-0"
            >
              <div 
                className="
                  flex md:grid md:grid-cols-7 gap-3
                  transition-transform duration-300 ease-in-out
                "
                style={{
                  transform: isMobile 
                    ? `translateX(calc(-${mobileScrollIndex} * (85% + 0.75rem) + 7.5%))` 
                    : 'none'
                }}
              >
                {days.map((day, index) => {
                  const daySchedules = scheduleHook.getSchedulesForDate(day);
                  const today = isToday(day);
                  const past = isPast(day);

                  return (
                    <button
                      key={index}
                      onClick={() => {
                        // Всегда открываем модальное окно выбора/изменения смены
                        scheduleHook.setSelectedDate(formatDate(day));
                      }}
                      disabled={past}
                      className={`
                        rounded-xl border-2 p-4 text-left transition
                        shrink-0 w-[85%] md:w-auto
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
                          {daySchedules.map((schedule, idx) => (
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
          </div>
        </div>

        {/* Управление сменами */}
        <div className="rounded-2xl bg-[#ffffff] p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#111827]">
              Управление сменами
            </h2>
            <button
              onClick={() => templateHook.openTemplateModal()}
              className="rounded-lg bg-[#16a34a] px-4 py-2 text-sm font-semibold text-[#ffffff] hover:bg-[#15803d]"
            >
              Добавить
            </button>
          </div>

          {/* Список шаблонов */}
          <div className="space-y-4">
            {templateHook.templates.map((template) => (
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
                      onClick={() => templateHook.openTemplateModal(template)}
                      className="text-sm text-[#3b82f6] hover:underline"
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={() => templateHook.handleDeleteTemplate(template.id)}
                      disabled={templateHook.loading}
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
                    
                    // Функция для вычисления времени окончания
                    const calculateEndTime = (startTime: string, durationHours: number) => {
                      const [hours, minutes] = startTime.split(':').map(Number);
                      const totalMinutes = hours * 60 + minutes + durationHours * 60;
                      const endHours = Math.floor(totalMinutes / 60) % 24;
                      const endMinutes = totalMinutes % 60;
                      return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
                    };

                    // Контент для tooltip
                    const tooltipContent = assignments.length > 0 ? (
                      <div className="space-y-1">
                        {assignments.map((assignment, idx) => (
                          <div key={idx} className="flex flex-col">
                            <span className="font-semibold">
                              {assignment.lastName} {assignment.firstName}
                            </span>
                            <span className="text-gray-300">
                              {assignment.startTime.slice(0, 5)} - {calculateEndTime(assignment.startTime, assignment.durationHours)}
                            </span>
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
                            // Для отдела официантов открываем окно управления столиками
                            if (isWaiterDepartment(dept)) {
                              tableHook.openTemplateTablesView(template, dept);
                            } else {
                              // Для остальных отделов - обычное назначение персонала
                              staffHook.openTemplateDepartmentModal(template, dept);
                            }
                          }}
                          disabled={templateHook.loading || staffHook.loading || tableHook.loading}
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

            {templateHook.templates.length === 0 && (
              <div className="py-12 text-center text-[#9ca3af]">
                <p className="text-lg">Нет созданных смен</p>
                <p className="text-sm">Создайте первую смену, чтобы начать планирование</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Модальное окно выбора смены для дня */}
      {scheduleHook.selectedDate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000] bg-opacity-50 p-4"
          onClick={() => scheduleHook.setSelectedDate(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#ffffff] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-xl font-bold text-[#111827]">
              Выбрать смену
            </h3>
            <p className="mb-4 text-sm text-[#6b7280]">
              {new Date(scheduleHook.selectedDate).toLocaleDateString('ru-RU', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>

            {(() => {
              const currentSchedules = scheduleHook.getSchedulesForDate(new Date(scheduleHook.selectedDate));
              if (currentSchedules.length > 0) {
                return (
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
                          onClick={() => scheduleHook.handleRemoveShift(
                            schedule.id, 
                            schedule.isDayOff ? 'Выходной день' : schedule.template?.name || 'Смена'
                          )}
                          disabled={scheduleHook.loading}
                          className="mt-2 w-full rounded-lg bg-[#dc2626] py-2 text-sm font-semibold text-[#ffffff] hover:bg-[#b91c1c] disabled:opacity-50"
                        >
                          🗑️ Удалить
                        </button>
                      </div>
                    ))}
                  </div>
                );
              }
              return null;
            })()}

            <div className="mb-2 text-xs font-semibold uppercase text-[#6b7280]">
              Добавить новую смену:
            </div>

            <div className="space-y-2">
              <button
                onClick={() => scheduleHook.handleAssignShift(new Date(scheduleHook.selectedDate), null)}
                disabled={scheduleHook.loading}
                className="w-full rounded-lg border-2 border-[#e5e7eb] bg-[#f9fafb] p-3 text-left hover:border-[#3b82f6] disabled:opacity-50"
              >
                <div className="font-semibold text-[#6b7280]">Выходной день</div>
                <div className="text-xs text-[#9ca3af]">Обозначить день как выходной</div>
              </button>

              {templateHook.templates.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-[#d1d5db] bg-[#f9fafb] p-4 text-center">
                  <p className="text-sm text-[#6b7280] mb-1">
                    Смены не созданы
                  </p>
                  <p className="text-xs text-[#9ca3af]">
                    Создайте хотя бы один шаблон смены в разделе "Управление сменами" ниже
                  </p>
                </div>
              ) : (
                templateHook.templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => scheduleHook.handleAssignShift(new Date(scheduleHook.selectedDate), template.id)}
                    disabled={scheduleHook.loading}
                    className="w-full rounded-lg border-2 border-[#e5e7eb] bg-[#ffffff] p-3 text-left hover:border-[#3b82f6] disabled:opacity-50"
                  >
                    <div className="font-semibold text-[#111827]">{template.name}</div>
                    <div className="text-sm text-[#6b7280]">
                      {template.startTime.slice(0, 5)} • {template.durationHours} часов
                    </div>
                  </button>
                ))
              )}
            </div>

            <button
              onClick={() => scheduleHook.setSelectedDate(null)}
              className="mt-4 w-full rounded-lg bg-[#e5e7eb] py-2 font-semibold text-[#374151] hover:bg-[#d1d5db]"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Модальное окно создания/редактирования смены */}
      {templateHook.selectedTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000] bg-opacity-50 p-4"
          onClick={templateHook.closeTemplateModal}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#ffffff] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-xl font-bold text-[#111827]">
              {templateHook.selectedTemplate.id ? 'Редактировать смену' : 'Создать смену'}
            </h3>

            {templateHook.templateError && (
              <div className="mb-4 rounded-lg bg-[#fee2e2] p-3 text-sm text-[#dc2626]">
                {templateHook.templateError}
              </div>
            )}

            <div className="space-y-4">
              {/* Название */}
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#374151]">
                  Название смены <span className="text-[#dc2626]">*</span>
                </label>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  placeholder="Утренняя смена"
                  className="w-full rounded-lg border-2 border-[#e5e7eb] px-4 py-2 text-[#111827] placeholder:text-[#9ca3af] focus:border-[#3b82f6] focus:outline-none"
                  disabled={templateHook.loading}
                />
              </div>

              {/* Время начала */}
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#374151]">
                  Время начала <span className="text-[#dc2626]">*</span>
                </label>
                <input
                  type="time"
                  step="60"
                  value={(templateForm.startTime || '09:00').substring(0, 5)}
                  onChange={(e) => {
                    const value = e.target.value.substring(0, 5);
                    setTemplateForm({ ...templateForm, startTime: value });
                  }}
                  className="w-full rounded-lg border-2 border-[#e5e7eb] px-4 py-2 text-[#111827] focus:border-[#3b82f6] focus:outline-none"
                  disabled={templateHook.loading}
                />
                <p className="mt-1 text-xs text-[#6b7280]">
                  Формат: ЧЧ:ММ (например, 09:00)
                </p>
              </div>

              {/* Длительность */}
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#374151]">
                  Длительность <span className="text-[#dc2626]">*</span>
                </label>
                <input
                  type="time"
                  step="60"
                  value={(templateForm.duration || '08:00').substring(0, 5)}
                  onChange={(e) => {
                    const value = e.target.value.substring(0, 5);
                    setTemplateForm({ ...templateForm, duration: value });
                  }}
                  className="w-full rounded-lg border-2 border-[#e5e7eb] px-4 py-2 text-[#111827] focus:border-[#3b82f6] focus:outline-none"
                  disabled={templateHook.loading}
                />
                <p className="mt-1 text-xs text-[#6b7280]">
                  Формат: ЧЧ:ММ (например, 08:00 или 08:30). Для смен через полночь (20:00-04:00) укажите 08:00.
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => templateHook.handleSaveTemplate(templateForm)}
                disabled={templateHook.loading}
                className="flex-1 rounded-lg bg-[#3b82f6] py-2 font-semibold text-[#ffffff] hover:bg-[#2563eb] disabled:opacity-50"
              >
                {templateHook.loading ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button
                onClick={templateHook.closeTemplateModal}
                disabled={templateHook.loading}
                className="flex-1 rounded-lg bg-[#e5e7eb] py-2 font-semibold text-[#374151] hover:bg-[#d1d5db] disabled:opacity-50"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно назначения персонала */}
      {staffHook.selectedSchedule && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000] bg-opacity-50 p-4"
          onClick={staffHook.closeStaffModal}
        >
          <div
            className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#ffffff] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-xl font-bold text-[#111827]">
              Назначить персонал на смену
            </h3>
            <p className="mb-4 text-sm text-[#6b7280]">
              {new Date(staffHook.selectedSchedule.date).toLocaleDateString('ru-RU', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              {' • '}
              {staffHook.selectedSchedule.template?.name}
              {' • '}
              {staffHook.selectedSchedule.template?.startTime.slice(0, 5)} ({staffHook.selectedSchedule.template?.durationHours}ч)
            </p>

            {staffHook.staffError && (
              <div className="mb-4 rounded-lg bg-[#fee2e2] p-3 text-sm text-[#dc2626]">
                {staffHook.staffError}
              </div>
            )}

            {staffHook.staffConflicts.length > 0 && (
              <div className="mb-4 rounded-lg bg-[#fef3c7] p-3">
                <p className="mb-2 text-sm font-semibold text-[#92400e]">
                  ⚠️ Конфликты расписания:
                </p>
                {staffHook.staffConflicts.map((conflict, idx) => (
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
                const deptStaff = staffHook.availableStaff.filter(
                  (s) => s.departmentId === dept.id
                );

                if (deptStaff.length === 0) return null;

                return (
                  <div key={dept.id} className="rounded-xl border-2 border-[#e5e7eb] p-4">
                    <h4 className="mb-3 font-bold text-[#111827]">{dept.name}</h4>
                    <div className="space-y-3">
                      {deptStaff.map((user) => {
                        const isAssigned = !!staffHook.currentAssignments[user.id];
                        const assignment = staffHook.currentAssignments[user.id];

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
                                onChange={() => staffHook.toggleStaffAssignment(user.id, user)}
                                className="mt-1"
                                disabled={staffHook.loading}
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
                                          staffHook.updateStaffAssignment(user.id, {
                                            startTime: time,
                                          });
                                        }}
                                        className="w-full rounded border border-[#d1d5db] px-2 py-1 text-sm text-[#111827] focus:border-[#3b82f6] focus:outline-none"
                                        disabled={staffHook.loading}
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
                                          staffHook.updateStaffAssignment(user.id, {
                                            durationHours: parseInt(e.target.value) || 1,
                                          })
                                        }
                                        className="w-full rounded border border-[#d1d5db] px-2 py-1 text-sm text-[#111827] focus:border-[#3b82f6] focus:outline-none"
                                        disabled={staffHook.loading}
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

              {staffHook.availableStaff.length === 0 && !staffHook.loading && (
                <div className="py-8 text-center text-[#9ca3af]">
                  <p>Нет доступных сотрудников</p>
                </div>
              )}

              {staffHook.loading && staffHook.availableStaff.length === 0 && (
                <div className="py-8 text-center text-[#9ca3af]">
                  <p>Загрузка...</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={async () => {
                  const saved = await staffHook.handleSaveStaffAssignments();
                  if (saved) {
                    staffHook.closeStaffModal();
                  }
                }}
                disabled={staffHook.loading || Object.keys(staffHook.currentAssignments).length === 0}
                className="flex-1 rounded-lg bg-[#3b82f6] py-2 font-semibold text-[#ffffff] hover:bg-[#2563eb] disabled:opacity-50"
              >
                {staffHook.loading ? 'Сохранение...' : `Сохранить (${Object.keys(staffHook.currentAssignments).length})`}
              </button>
              <button
                onClick={async () => {
                  if (staffHook.selectedSchedule && Object.keys(staffHook.currentAssignments).length > 0) {
                    // Сначала сохраняем назначения официантов
                    const saved = await staffHook.handleSaveStaffAssignments();
                    // Затем открываем модальное окно столиков только если сохранение успешно
                    if (saved) {
                      staffHook.closeStaffModal();
                      tableHook.openTablesModal(staffHook.selectedSchedule);
                    }
                  }
                }}
                disabled={staffHook.loading || Object.keys(staffHook.currentAssignments).length === 0}
                className="flex-1 rounded-lg bg-[#16a34a] py-2 font-semibold text-[#ffffff] hover:bg-[#15803d] disabled:opacity-50"
              >
                Сохранить и назначить столики →
              </button>
              <button
                onClick={staffHook.closeStaffModal}
                disabled={staffHook.loading}
                className="flex-1 rounded-lg bg-[#e5e7eb] py-2 font-semibold text-[#374151] hover:bg-[#d1d5db] disabled:opacity-50"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно назначения столиков */}
      {tableHook.selectedScheduleForTables && (
        <WaiterTableAssignmentModal
          schedule={tableHook.selectedScheduleForTables}
          availableTables={tableHook.availableTables}
          waiters={tableHook.waiters}
          tableAssignments={tableHook.tableAssignments}
          loading={tableHook.loading}
          error={tableHook.tableError}
          onAssignTable={tableHook.handleAssignTable}
          onUnassignTable={tableHook.handleUnassignTable}
          onClose={tableHook.closeTablesModal}
        />
      )}

      {/* Модальное окно назначения стандартного состава отдела в шаблоне */}
      {staffHook.selectedTemplateForDept && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000] bg-opacity-50 p-4"
          onClick={staffHook.closeTemplateDepartmentModal}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#ffffff] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-xl font-bold text-[#111827]">
              {staffHook.selectedTemplateForDept.department.name}
            </h3>
            <p className="mb-4 text-sm text-[#6b7280]">
              Смена: {staffHook.selectedTemplateForDept.template.name} • {staffHook.selectedTemplateForDept.template.startTime.slice(0, 5)} ({staffHook.selectedTemplateForDept.template.durationHours}ч)
            </p>
            <p className="mb-4 text-xs text-[#9ca3af]">
              Назначения будут применены ко всем дням, где используется эта смена
            </p>

            {staffHook.templateStaffError && (
              <div className="mb-4 rounded-lg bg-[#fee2e2] p-3 text-sm text-[#dc2626]">
                {staffHook.templateStaffError}
              </div>
            )}

            <div className="space-y-3">
              {staffHook.deptStaff.map((user) => {
                const isAssigned = !!staffHook.templateStaffAssignments[user.id];
                const assignment = staffHook.templateStaffAssignments[user.id];

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
                        onChange={() => staffHook.toggleTemplateStaffAssignment(user.id, user)}
                        className="mt-1"
                        disabled={staffHook.templateStaffLoading}
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-[#111827]">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-xs text-[#6b7280]">{user.email}</div>

                        {isAssigned && assignment && (
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <div>
                              <label className="mb-1 block text-xs font-semibold text-[#374151]">
                                Начало
                              </label>
                              <input
                                type="time"
                                step="60"
                                value={(assignment.startTime || '09:00').substring(0, 5)}
                                onChange={(e) => {
                                  const time = e.target.value.substring(0, 5);
                                  staffHook.updateTemplateStaffAssignment(user.id, {
                                    startTime: time,
                                  });
                                }}
                                className="w-full rounded border border-[#d1d5db] px-2 py-1 text-sm text-[#111827]"
                                disabled={staffHook.templateStaffLoading}
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
                                onChange={(e) =>
                                  staffHook.updateTemplateStaffAssignment(user.id, {
                                    duration: e.target.value,
                                  })
                                }
                                className="w-full rounded border border-[#d1d5db] px-2 py-1 text-sm text-[#111827]"
                                disabled={staffHook.templateStaffLoading}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {staffHook.deptStaff.length === 0 && !staffHook.templateStaffLoading && (
                <div className="py-8 text-center text-[#9ca3af]">
                  <p>Нет сотрудников в этом отделе</p>
                </div>
              )}

              {staffHook.templateStaffLoading && staffHook.deptStaff.length === 0 && (
                <div className="py-8 text-center text-[#9ca3af]">
                  <p>Загрузка...</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={staffHook.handleSaveTemplateStaffAssignments}
                disabled={staffHook.templateStaffLoading}
                className="flex-1 rounded-lg bg-[#3b82f6] py-2 font-semibold text-[#ffffff] hover:bg-[#2563eb] disabled:opacity-50"
              >
                {staffHook.templateStaffLoading ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button
                onClick={staffHook.closeTemplateDepartmentModal}
                disabled={staffHook.templateStaffLoading}
                className="flex-1 rounded-lg bg-[#e5e7eb] py-2 font-semibold text-[#374151] hover:bg-[#d1d5db] disabled:opacity-50"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно управления столиками для отдела официантов */}
      {tableHook.selectedTemplateTablesView && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000] bg-opacity-50 p-4"
          onClick={tableHook.closeTemplateTablesView}
        >
          <div
            className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#ffffff] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-xl font-bold text-[#111827]">
              Управление столиками: {tableHook.selectedTemplateTablesView.department.name}
            </h3>
            <p className="mb-4 text-sm text-[#6b7280]">
              Смена: {tableHook.selectedTemplateTablesView.template.name} • {tableHook.selectedTemplateTablesView.template.startTime.slice(0, 5)} ({tableHook.selectedTemplateTablesView.template.durationHours}ч)
            </p>

            {tableHook.templateTablesError && (
              <div className="mb-4 rounded-lg bg-[#fee2e2] p-3 text-sm text-[#dc2626]">
                {tableHook.templateTablesError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tableHook.templateTables.map((table) => {
                // Найти назначения для этого столика
                const assignments = tableHook.templateTableAssignments.filter(a => a.tableId === table.id);
                
                return (
                  <div
                    key={table.id}
                    onClick={() => tableHook.openTableWaiterAssignment(table, tableHook.selectedTemplateTablesView.template, tableHook.selectedTemplateTablesView.department)}
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

              {tableHook.templateTables.length === 0 && !tableHook.loading && (
                <div className="col-span-full py-12 text-center text-[#9ca3af]">
                  <p className="text-lg">Нет столиков</p>
                  <p className="text-sm">Добавьте столики в разделе управления столиками</p>
                </div>
              )}

              {tableHook.loading && tableHook.templateTables.length === 0 && (
                <div className="col-span-full py-12 text-center text-[#9ca3af]">
                  <p>Загрузка...</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={tableHook.closeTemplateTablesView}
                disabled={tableHook.loading}
                className="rounded-lg bg-[#3b82f6] px-6 py-2 font-semibold text-[#ffffff] hover:bg-[#2563eb] disabled:opacity-50"
              >
                Готово
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно назначения официантов на столик */}
      {tableHook.selectedTableForWaiterAssignment && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-[#000000] bg-opacity-50 p-4"
          onClick={tableHook.closeTableWaiterAssignment}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#ffffff] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-xl font-bold text-[#111827]">
              Назначить официантов на столик {tableHook.selectedTableForWaiterAssignment.table.number}
            </h3>
            <p className="mb-4 text-sm text-[#6b7280]">
              Смена: {tableHook.selectedTableForWaiterAssignment.template.name} • {tableHook.selectedTableForWaiterAssignment.template.startTime.slice(0, 5)} ({tableHook.selectedTableForWaiterAssignment.template.durationHours}ч)
            </p>

            {tableHook.tableWaiterError && (
              <div className="mb-4 rounded-lg bg-[#fee2e2] p-3 text-sm text-[#dc2626]">
                {tableHook.tableWaiterError}
              </div>
            )}

            <div className="space-y-3">
              {tableHook.waitersList.map((waiter) => {
                const isAssigned = !!tableHook.tableWaiterAssignments[waiter.id];
                const assignment = tableHook.tableWaiterAssignments[waiter.id];

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
                        onChange={() => tableHook.toggleTableWaiterAssignment(waiter.id, waiter)}
                        className="mt-1"
                        disabled={tableHook.loading}
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
                                  const time = e.target.value.substring(0, 5); // HH:MM без секунд
                                  tableHook.updateTableWaiterAssignment(waiter.id, {
                                    startTime: time,
                                  });
                                }}
                                className="w-full rounded border border-[#d1d5db] px-2 py-1 text-sm text-[#111827]"
                                disabled={tableHook.loading}
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
                                  const time = e.target.value.substring(0, 5); // HH:MM без секунд
                                  tableHook.updateTableWaiterAssignment(waiter.id, {
                                    duration: time,
                                  });
                                }}
                                className="w-full rounded border border-[#d1d5db] px-2 py-1 text-sm text-[#111827]"
                                disabled={tableHook.loading}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {tableHook.waitersList.length === 0 && !tableHook.loading && (
                <div className="py-8 text-center text-[#9ca3af]">
                  <p>Нет официантов</p>
                </div>
              )}

              {tableHook.loading && tableHook.waitersList.length === 0 && (
                <div className="py-8 text-center text-[#9ca3af]">
                  <p>Загрузка...</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={tableHook.handleSaveTableWaiterAssignments}
                disabled={tableHook.loading}
                className="flex-1 rounded-lg bg-[#3b82f6] py-2 font-semibold text-[#ffffff] hover:bg-[#2563eb] disabled:opacity-50"
              >
                {tableHook.loading ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button
                onClick={tableHook.closeTableWaiterAssignment}
                disabled={tableHook.loading}
                className="flex-1 rounded-lg bg-[#e5e7eb] py-2 font-semibold text-[#374151] hover:bg-[#d1d5db] disabled:opacity-50"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения удаления смены */}
      {/* Модальное окно ошибок валидации */}
      {scheduleHook.validationError && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-60 p-4"
          onClick={() => scheduleHook.setValidationError(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-xl font-bold text-red-600">
              ❌ Ошибка валидации
            </h3>
            <div className="mb-6 whitespace-pre-wrap text-gray-700">
              {validationError}
            </div>
            <button
              onClick={() => scheduleHook.setValidationError(null)}
              className="w-full rounded-lg bg-blue-600 py-2.5 font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Понятно
            </button>
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения удаления */}
      {scheduleHook.deleteConfirmation && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-60 p-4"
          onClick={() => scheduleHook.setDeleteConfirmation(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-xl font-bold text-gray-900">
              Подтверждение удаления
            </h3>
            <p className="mb-6 text-gray-700">
              Вы действительно хотите удалить смену <span className="font-semibold">"{scheduleHook.deleteConfirmation.shiftName}"</span>?
            </p>
            <p className="mb-6 text-sm text-gray-500">
              Это действие нельзя отменить.
            </p>
            <div className="flex gap-3">
              <button
                onClick={scheduleHook.confirmDeleteShift}
                disabled={scheduleHook.loading}
                className="flex-1 rounded-lg bg-red-600 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {scheduleHook.loading ? 'Удаление...' : 'Удалить'}
              </button>
              <button
                onClick={() => scheduleHook.setDeleteConfirmation(null)}
                disabled={scheduleHook.loading}
                className="flex-1 rounded-lg bg-gray-200 py-2.5 font-semibold text-gray-800 hover:bg-gray-300 disabled:opacity-50 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
