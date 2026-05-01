import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  shiftSchedules,
  shiftStaffAssignments,
  shiftTableAssignments,
  shiftTemplateTableAssignments,
  tables,
} from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/tables/available-with-shift
 * Получить столики, доступные для бронирования с учетом смен
 * Query params:
 * - restaurantId: UUID ресторана
 * - date: дата в формате YYYY-MM-DD
 * - time: время в формате HH:MM
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');
    const date = searchParams.get('date');
    const time = searchParams.get('time');


    if (!restaurantId || !date || !time) {
      return NextResponse.json(
        { error: 'Необходимы параметры: restaurantId, date, time' },
        { status: 400 }
      );
    }

    // Проверка формата времени
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
      return NextResponse.json(
        { error: 'Неверный формат времени. Ожидается HH:MM' },
        { status: 400 }
      );
    }

    // Найти смену на указанную дату
    const schedule = await db.query.shiftSchedules.findFirst({
      where: and(
        eq(shiftSchedules.date, date),
        eq(shiftSchedules.restaurantId, restaurantId),
        eq(shiftSchedules.isDayOff, false)
      ),
    });


    // Если нет смены на эту дату - вернуть пустой массив
    if (!schedule) {
      return NextResponse.json({
        tables: [],
        message: 'На выбранную дату нет рабочей смены',
      });
    }

    // Получить назначения официантов на эту смену
    const staffAssignments = await db.query.shiftStaffAssignments.findMany({
      where: eq(shiftStaffAssignments.shiftScheduleId, schedule.id),
    });


    if (staffAssignments.length === 0) {
      return NextResponse.json({
        tables: [],
        message: 'На эту смену не назначены официанты',
      });
    }

    const staffAssignmentIds = staffAssignments.map((sa) => sa.id);

    // Получить назначения столиков для этих официантов в конкретной смене
    let tableAssignmentsData = await db
      .select({
        tableId: shiftTableAssignments.tableId,
        startTime: shiftTableAssignments.startTime,
        durationHours: shiftTableAssignments.durationHours,
        tableNumber: tables.number,
        tableCapacity: tables.capacity,
      })
      .from(shiftTableAssignments)
      .innerJoin(tables, eq(shiftTableAssignments.tableId, tables.id))
      .where(eq(shiftTableAssignments.shiftScheduleId, schedule.id));

    
    // Если в конкретной смене нет назначений, проверяем шаблон смены
    if (tableAssignmentsData.length === 0 && schedule.shiftTemplateId) {
      
      const templateAssignments = await db
        .select({
          tableId: shiftTemplateTableAssignments.tableId,
          startTime: shiftTemplateTableAssignments.startTime,
          durationHours: shiftTemplateTableAssignments.durationHours,
          tableNumber: tables.number,
          tableCapacity: tables.capacity,
        })
        .from(shiftTemplateTableAssignments)
        .innerJoin(tables, eq(shiftTemplateTableAssignments.tableId, tables.id))
        .where(eq(shiftTemplateTableAssignments.shiftTemplateId, schedule.shiftTemplateId));
      
      tableAssignmentsData = templateAssignments;
    }


    if (tableAssignmentsData.length === 0) {
      return NextResponse.json({
        tables: [],
        message: 'На эту смену не назначены столики официантам',
      });
    }

    // Фильтруем столики, которые доступны в указанное время
    const requestedTime = parseTime(time);
    
    const availableTables = tableAssignmentsData.filter((ta) => {
      const tableStartTime = parseTime(ta.startTime);
      const tableEndTime = tableStartTime + parseFloat(ta.durationHours) * 60;


      // Проверяем, что запрошенное время попадает в интервал обслуживания столика
      return requestedTime >= tableStartTime && requestedTime < tableEndTime;
    });


    // Убираем дубликаты столиков (если столик обслуживается несколькими официантами)
    const uniqueTables = Array.from(
      new Map(
        availableTables.map((t) => [
          t.tableId,
          {
            id: t.tableId,
            number: t.tableNumber,
            capacity: t.tableCapacity || 0,
          },
        ])
      ).values()
    );

    return NextResponse.json({
      tables: uniqueTables,
      scheduleId: schedule.id,
      message:
        uniqueTables.length > 0
          ? `Найдено ${uniqueTables.length} доступных столиков`
          : 'Нет доступных столиков на это время',
    });
  } catch (error) {
    console.error('Error fetching available tables with shift:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении доступных столиков' },
      { status: 500 }
    );
  }
}

/**
 * Преобразует время в минуты от начала дня
 * @param time - время в формате HH:MM, H:MM, HH:MM:SS или H:MM:SS
 * @returns количество минут от начала дня
 */
function parseTime(time: string): number {
  // Убираем секунды, если они есть (PostgreSQL TIME возвращает HH:MM:SS)
  const timeParts = time.split(':');
  const hours = parseInt(timeParts[0], 10);
  const minutes = parseInt(timeParts[1], 10);
  return hours * 60 + minutes;
}
