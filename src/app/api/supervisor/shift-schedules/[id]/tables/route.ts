import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { 
  shiftTableAssignments,
  shiftStaffAssignments,
  shiftSchedules,
  tables,
  users 
} from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { checkTimeOverlap, calculateShiftAbsoluteTime } from '@/lib/shifts';

const assignTableSchema = z.object({
  staffAssignmentId: z.string().uuid(), // ID назначения официанта на смену
  tableId: z.string().uuid(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  durationHours: z.number().min(0.5).max(24),
});

// GET - получить назначения столиков для смены
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    if (!['supervisor', 'manager'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    const scheduleId = (await params).id;

    // Проверяем доступ
    const [schedule] = await db
      .select()
      .from(shiftSchedules)
      .where(
        and(
          eq(shiftSchedules.id, scheduleId),
          eq(shiftSchedules.restaurantId, session.user.restaurantId!)
        )
      );

    if (!schedule) {
      return NextResponse.json({ error: 'Расписание не найдено' }, { status: 404 });
    }

    // Получаем назначения столиков с информацией
    const assignments = await db
      .select({
        id: shiftTableAssignments.id,
        staffAssignmentId: shiftTableAssignments.shiftStaffAssignmentId,
        tableId: shiftTableAssignments.tableId,
        startTime: shiftTableAssignments.startTime,
        durationHours: shiftTableAssignments.durationHours,
        table: {
          id: tables.id,
          number: tables.number,
          capacity: tables.capacity,
        },
        waiter: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(shiftTableAssignments)
      .innerJoin(shiftStaffAssignments, eq(shiftTableAssignments.shiftStaffAssignmentId, shiftStaffAssignments.id))
      .innerJoin(users, eq(shiftStaffAssignments.userId, users.id))
      .innerJoin(tables, eq(shiftTableAssignments.tableId, tables.id))
      .where(eq(shiftTableAssignments.shiftScheduleId, scheduleId));

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error('Error fetching table assignments:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// POST - назначить официанта на столик
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    if (!['supervisor', 'manager'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    const scheduleId = (await params).id;

    // Проверяем доступ
    const [schedule] = await db
      .select()
      .from(shiftSchedules)
      .where(
        and(
          eq(shiftSchedules.id, scheduleId),
          eq(shiftSchedules.restaurantId, session.user.restaurantId!)
        )
      );

    if (!schedule) {
      return NextResponse.json({ error: 'Расписание не найдено' }, { status: 404 });
    }

    const body = await request.json();
    const validation = assignTableSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Неверные данные', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { staffAssignmentId, tableId, startTime, durationHours } = validation.data;

    // Проверяем, что staffAssignment относится к этому scheduleId
    const [staffAssignment] = await db
      .select()
      .from(shiftStaffAssignments)
      .where(
        and(
          eq(shiftStaffAssignments.id, staffAssignmentId),
          eq(shiftStaffAssignments.shiftScheduleId, scheduleId)
        )
      );

    if (!staffAssignment) {
      return NextResponse.json(
        { error: 'Назначение сотрудника не найдено' },
        { status: 404 }
      );
    }

    // Валидация 1: Время обслуживания столика должно быть в пределах смены официанта
    const { startsAt: tableStart, endsAt: tableEnd } = calculateShiftAbsoluteTime(
      schedule.date,
      startTime,
      durationHours
    );

    const { startsAt: staffStart, endsAt: staffEnd } = calculateShiftAbsoluteTime(
      schedule.date,
      staffAssignment.startTime,
      parseFloat(staffAssignment.durationHours)
    );

    if (tableStart < staffStart || tableEnd > staffEnd) {
      return NextResponse.json(
        {
          error: 'Время обслуживания столика выходит за пределы рабочей смены официанта',
          waiterShift: {
            start: staffAssignment.startTime,
            duration: staffAssignment.durationHours,
          },
        },
        { status: 400 }
      );
    }

    // Валидация 2: Проверяем пересечения с другими столиками этого официанта
    const otherTables = await db
      .select({
        id: shiftTableAssignments.id,
        tableNumber: tables.number,
        startTime: shiftTableAssignments.startTime,
        durationHours: shiftTableAssignments.durationHours,
      })
      .from(shiftTableAssignments)
      .innerJoin(tables, eq(shiftTableAssignments.tableId, tables.id))
      .where(
        and(
          eq(shiftTableAssignments.shiftStaffAssignmentId, staffAssignmentId),
          eq(shiftTableAssignments.shiftScheduleId, scheduleId)
        )
      );

    const conflicts = [];
    for (const table of otherTables) {
      const { startsAt: otherStart, endsAt: otherEnd } = calculateShiftAbsoluteTime(
        schedule.date,
        table.startTime,
        parseFloat(table.durationHours)
      );

      if (checkTimeOverlap(tableStart, tableEnd, otherStart, otherEnd)) {
        conflicts.push({
          tableNumber: table.tableNumber,
          startTime: table.startTime,
          durationHours: table.durationHours,
        });
      }
    }

    if (conflicts.length > 0) {
      return NextResponse.json(
        {
          error: 'Официант уже обслуживает другие столики в это время',
          conflicts,
        },
        { status: 400 }
      );
    }

    // Создаем назначение
    const [assignment] = await db
      .insert(shiftTableAssignments)
      .values({
        shiftScheduleId: scheduleId,
        shiftStaffAssignmentId: staffAssignmentId,
        tableId,
        startTime,
        durationHours,
      })
      .returning();

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error) {
    console.error('Error assigning table:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
