import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { 
  shiftStaffAssignments, 
  shiftSchedules,
  shiftTemplates,
  users,
  departments 
} from '@/lib/db/schema';
import { eq, and, or, sql, gte, lte, ne } from 'drizzle-orm';
import { z } from 'zod';
import { checkStaffConflicts, calculateShiftAbsoluteTime, formatDate } from '@/lib/shifts';

const assignStaffSchema = z.object({
  assignments: z.array(z.object({
    userId: z.string().uuid(),
    departmentId: z.string().uuid().nullable().optional(),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    durationHours: z.number().min(0.5).max(24),
  })),
});

// GET - получить назначения персонала для смены
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

    // Проверяем доступ к расписанию
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

    // Получаем назначения с информацией о сотрудниках и отделах
    const assignments = await db
      .select({
        id: shiftStaffAssignments.id,
        userId: shiftStaffAssignments.userId,
        departmentId: shiftStaffAssignments.departmentId,
        startTime: shiftStaffAssignments.startTime,
        durationHours: shiftStaffAssignments.durationHours,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          role: users.role,
        },
        department: {
          id: departments.id,
          name: departments.name,
        },
      })
      .from(shiftStaffAssignments)
      .leftJoin(users, eq(shiftStaffAssignments.userId, users.id))
      .leftJoin(departments, eq(shiftStaffAssignments.departmentId, departments.id))
      .where(eq(shiftStaffAssignments.shiftScheduleId, scheduleId));

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error('Error fetching staff assignments:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// POST - назначить/обновить персонал на смену
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

    // Проверяем доступ к расписанию
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
    const validation = assignStaffSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Неверные данные', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { assignments: newAssignments } = validation.data;

    // Валидация: проверяем конфликты для каждого сотрудника
    const conflicts: Array<{
      userId: string;
      userName: string;
      conflicts: Array<any>;
    }> = [];

    for (const assignment of newAssignments) {
      // Получаем все назначения сотрудника в диапазоне дат (текущая дата ± 1 день)
      const checkDate = new Date(schedule.date);
      const prevDate = new Date(checkDate);
      prevDate.setDate(checkDate.getDate() - 1);
      const nextDate = new Date(checkDate);
      nextDate.setDate(checkDate.getDate() + 1);

      const existingAssignments = await db
        .select({
          date: shiftSchedules.date,
          startTime: shiftStaffAssignments.startTime,
          durationHours: shiftStaffAssignments.durationHours,
          shiftName: shiftTemplates.name,
        })
        .from(shiftStaffAssignments)
        .innerJoin(shiftSchedules, eq(shiftStaffAssignments.shiftScheduleId, shiftSchedules.id))
        .leftJoin(shiftTemplates, eq(shiftSchedules.shiftTemplateId, shiftTemplates.id))
        .where(
          and(
            eq(shiftStaffAssignments.userId, assignment.userId),
            gte(shiftSchedules.date, formatDate(prevDate)),
            lte(shiftSchedules.date, formatDate(nextDate)),
            ne(shiftStaffAssignments.shiftScheduleId, scheduleId) // Исключаем текущее расписание
          )
        );

      const staffConflicts = checkStaffConflicts(
        existingAssignments.map(a => ({ 
          date: a.date, 
          startTime: a.startTime, 
          durationHours: parseFloat(a.durationHours), 
          shiftName: a.shiftName ?? undefined 
        })),
        schedule.date,
        assignment.startTime,
        assignment.durationHours
      );

      if (staffConflicts.length > 0) {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, assignment.userId));

        conflicts.push({
          userId: assignment.userId,
          userName: `${user?.firstName} ${user?.lastName}`,
          conflicts: staffConflicts,
        });
      }
    }

    if (conflicts.length > 0) {
      return NextResponse.json(
        {
          error: 'Обнаружены конфликты расписания',
          conflicts,
        },
        { status: 400 }
      );
    }

    // Удаляем старые назначения
    await db
      .delete(shiftStaffAssignments)
      .where(eq(shiftStaffAssignments.shiftScheduleId, scheduleId));

    // Создаем новые назначения
    const created = [];
    for (const assignment of newAssignments) {
      const [result] = await db
        .insert(shiftStaffAssignments)
        .values({
          shiftScheduleId: scheduleId,
          userId: assignment.userId,
          departmentId: assignment.departmentId || null,
          startTime: assignment.startTime,
          durationHours: assignment.durationHours.toString(),
        })
        .returning();

      created.push(result);
    }

    return NextResponse.json({ assignments: created });
  } catch (error) {
    console.error('Error assigning staff:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
