// Утилиты для работы со сменами и валидации пересечений времени

/**
 * Преобразует строку времени "HH:MM" в минуты с начала дня
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Преобразует минуты в строку времени "HH:MM"
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Вычисляет абсолютное время начала и конца смены с учетом переноса на следующий день
 * @param date - дата смены (YYYY-MM-DD)
 * @param startTime - время начала (HH:MM)
 * @param durationHours - продолжительность в часах
 * @returns объект с датой начала и конца
 */
export function calculateShiftAbsoluteTime(
  date: string,
  startTime: string,
  durationHours: number
): {
  startsAt: Date;
  endsAt: Date;
} {
  const startMinutes = timeToMinutes(startTime);
  const durationMinutes = durationHours * 60;
  const endMinutes = startMinutes + durationMinutes;

  const dateObj = new Date(date + 'T00:00:00');
  
  // Начало смены
  const startsAt = new Date(dateObj);
  startsAt.setMinutes(startsAt.getMinutes() + startMinutes);

  // Конец смены (может быть на следующий день)
  const endsAt = new Date(dateObj);
  endsAt.setMinutes(endsAt.getMinutes() + endMinutes);

  return { startsAt, endsAt };
}

/**
 * Проверяет пересечение двух временных интервалов
 */
export function checkTimeOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && start2 < end1;
}

/**
 * Проверяет конфликты в расписании сотрудника
 * @param existingAssignments - существующие назначения сотрудника
 * @param newDate - дата новой смены
 * @param newStartTime - время начала работы
 * @param newDurationHours - продолжительность работы
 * @returns массив конфликтующих назначений
 */
export function checkStaffConflicts(
  existingAssignments: Array<{
    date: string;
    startTime: string;
    durationHours: number;
    shiftName?: string;
  }>,
  newDate: string,
  newStartTime: string,
  newDurationHours: number
): Array<{
  date: string;
  startTime: string;
  durationHours: number;
  shiftName?: string;
  reason: string;
}> {
  const conflicts: Array<{
    date: string;
    startTime: string;
    durationHours: number;
    shiftName?: string;
    reason: string;
  }> = [];

  const { startsAt: newStart, endsAt: newEnd } = calculateShiftAbsoluteTime(
    newDate,
    newStartTime,
    newDurationHours
  );

  for (const assignment of existingAssignments) {
    const { startsAt: existingStart, endsAt: existingEnd } = calculateShiftAbsoluteTime(
      assignment.date,
      assignment.startTime,
      assignment.durationHours
    );

    if (checkTimeOverlap(newStart, newEnd, existingStart, existingEnd)) {
      const overlapStart = new Date(Math.max(newStart.getTime(), existingStart.getTime()));
      const overlapEnd = new Date(Math.min(newEnd.getTime(), existingEnd.getTime()));
      const overlapHours = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60);

      conflicts.push({
        ...assignment,
        reason: `Пересечение на ${overlapHours.toFixed(1)} ч (${overlapStart.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} - ${overlapEnd.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })})`,
      });
    }
  }

  return conflicts;
}

/**
 * Форматирует дату в YYYY-MM-DD (локальное время)
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Получает даты для 14-дневного календаря (текущая + следующая неделя)
 */
export function get14DayRange(startDate?: Date): { startDate: string; endDate: string } {
  const start = startDate || new Date();
  
  // Начинаем с понедельника текущей недели
  const dayOfWeek = start.getDay();
  const monday = new Date(start);
  monday.setDate(start.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);

  // Конец - через 13 дней (понедельник + 13 = воскресенье следующей недели)
  const end = new Date(monday);
  end.setDate(monday.getDate() + 13);

  return {
    startDate: formatDate(monday),
    endDate: formatDate(end),
  };
}
