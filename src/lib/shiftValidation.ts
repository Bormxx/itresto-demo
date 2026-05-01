/**
 * Утилиты для работы со сменами и валидация пересечений
 */

type TimeString = string; // HH:MM format

/**
 * Конвертирует время HH:MM в минуты от начала дня
 */
export function timeToMinutes(time: TimeString): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Конвертирует минуты от начала дня в HH:MM
 */
export function minutesToTime(minutes: number): TimeString {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Вычисляет время окончания смены
 */
export function calculateEndTime(startTime: TimeString, durationHours: number): TimeString {
  const startMinutes = timeToMinutes(startTime);
  const durationMinutes = Math.round(durationHours * 60);
  const endMinutes = startMinutes + durationMinutes;
  return minutesToTime(endMinutes);
}

/**
 * Проверяет, пересекаются ли два временных интервала
 * @returns true если интервалы пересекаются
 */
export function doTimeIntervalsOverlap(
  start1: TimeString,
  end1: TimeString,
  start2: TimeString,
  end2: TimeString
): boolean {
  const start1Min = timeToMinutes(start1);
  const end1Min = timeToMinutes(end1);
  const start2Min = timeToMinutes(start2);
  const end2Min = timeToMinutes(end2);

  // Пересечение есть, если начало одного интервала < конца другого и наоборот
  return start1Min < end2Min && end1Min > start2Min;
}

export type ShiftInfo = {
  id?: string;
  name: string;
  startTime: TimeString;
  endTime: TimeString;
  durationHours: number;
};

export type StaffAssignmentInfo = {
  userId: string;
  userName: string;
  departmentId: string | null;
  departmentName: string | null;
  startTime: TimeString;
  endTime: TimeString;
  durationHours: number;
};

export type ValidationError = {
  type: 'shift_overlap' | 'staff_overlap';
  message: string;
  details?: any;
};

/**
 * Валидирует добавление новой смены к существующим сменам дня
 */
export function validateShiftAddition(
  newShift: ShiftInfo,
  existingShifts: ShiftInfo[]
): ValidationError | null {
  // Проверяем пересечение времени смен
  for (const existingShift of existingShifts) {
    if (
      doTimeIntervalsOverlap(
        newShift.startTime,
        newShift.endTime,
        existingShift.startTime,
        existingShift.endTime
      )
    ) {
      return {
        type: 'shift_overlap',
        message: `Смена "${newShift.name}" пересекается по времени со сменой "${existingShift.name}". Смена "${existingShift.name}" заканчивается в ${existingShift.endTime}, а "${newShift.name}" начинается в ${newShift.startTime}.`,
        details: {
          newShift,
          conflictingShift: existingShift,
        },
      };
    }
  }

  return null;
}

/**
 * Валидирует назначения сотрудников между несколькими сменами
 * Проверяет, что сотрудники не работают одновременно в разных сменах
 */
export function validateStaffAssignments(
  newShiftStaff: StaffAssignmentInfo[],
  existingShiftsStaff: StaffAssignmentInfo[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  const conflictsByDepartment: Record<string, string[]> = {};

  for (const newAssignment of newShiftStaff) {
    for (const existingAssignment of existingShiftsStaff) {
      // Проверяем только если это один и тот же сотрудник
      if (newAssignment.userId === existingAssignment.userId) {
        // Проверяем пересечение времени работы
        if (
          doTimeIntervalsOverlap(
            newAssignment.startTime,
            newAssignment.endTime,
            existingAssignment.startTime,
            existingAssignment.endTime
          )
        ) {
          const deptName = newAssignment.departmentName || 'Без отдела';
          if (!conflictsByDepartment[deptName]) {
            conflictsByDepartment[deptName] = [];
          }
          
          // Вычисляем когда сотрудник может начать работу
          const earliestStartTime = existingAssignment.endTime;
          
          conflictsByDepartment[deptName].push(
            `${newAssignment.userName} - смена должна начинаться не ранее ${earliestStartTime}`
          );
        }
      }
    }
  }

  if (Object.keys(conflictsByDepartment).length > 0) {
    const messages: string[] = [];
    for (const [dept, conflicts] of Object.entries(conflictsByDepartment)) {
      messages.push(`${dept}:\n${conflicts.join('\n')}`);
    }

    errors.push({
      type: 'staff_overlap',
      message: `Обнаружены конфликты в расписании сотрудников:\n\n${messages.join('\n\n')}`,
      details: conflictsByDepartment,
    });
  }

  return errors;
}
