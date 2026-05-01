import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { 
  shiftSchedules,
  shiftStaffAssignments,
  shiftTableAssignments 
} from '@/lib/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { z } from 'zod';

const copyWeekSchema = z.object({
  sourceStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // Начало недели-источника (понедельник)
  targetStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // Начало целевой недели (понедельник)
});

// POST - скопировать расписание недели
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    if (!['supervisor', 'manager'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    if (!session.user.restaurantId) {
      return NextResponse.json({ error: 'Ресторан не найден' }, { status: 400 });
    }

    const body = await request.json();
    const validation = copyWeekSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Неверные данные', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { sourceStartDate, targetStartDate } = validation.data;

    // Вычисляем конечные даты (понедельник + 6 дней = воскресенье)
    const sourceStart = new Date(sourceStartDate);
    const sourceEnd = new Date(sourceStart);
    sourceEnd.setDate(sourceEnd.getDate() + 6);

    const targetStart = new Date(targetStartDate);
    const targetEnd = new Date(targetStart);
    targetEnd.setDate(targetEnd.getDate() + 6);

    const sourceEndStr = sourceEnd.toISOString().split('T')[0];
    const targetEndStr = targetEnd.toISOString().split('T')[0];

    // Получаем все расписания исходной недели
    const sourceSchedules = await db
      .select()
      .from(shiftSchedules)
      .where(
        and(
          eq(shiftSchedules.restaurantId, session.user.restaurantId),
          gte(shiftSchedules.date, sourceStartDate),
          lte(shiftSchedules.date, sourceEndStr)
        )
      )
      .orderBy(shiftSchedules.date);

    if (sourceSchedules.length === 0) {
      return NextResponse.json(
        { error: 'Нет расписания в исходной неделе для копирования' },
        { status: 400 }
      );
    }

    const copiedSchedules = [];
    const copiedStaffAssignments = [];
    const copiedTableAssignments = [];

    // Копируем каждый день недели
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const sourceDate = new Date(sourceStart);
      sourceDate.setDate(sourceDate.getDate() + dayOffset);
      const sourceDateStr = sourceDate.toISOString().split('T')[0];

      const targetDate = new Date(targetStart);
      targetDate.setDate(targetDate.getDate() + dayOffset);
      const targetDateStr = targetDate.toISOString().split('T')[0];

      // Находим расписание исходного дня
      const sourceSchedule = sourceSchedules.find(s => s.date === sourceDateStr);

      if (!sourceSchedule) {
        // Если в исходной неделе нет расписания на этот день, пропускаем
        continue;
      }

      // Проверяем, есть ли уже расписание на целевую дату
      const [existingTarget] = await db
        .select()
        .from(shiftSchedules)
        .where(
          and(
            eq(shiftSchedules.restaurantId, session.user.restaurantId),
            eq(shiftSchedules.date, targetDateStr)
          )
        );

      let targetSchedule;

      if (existingTarget) {
        // Обновляем существующее
        [targetSchedule] = await db
          .update(shiftSchedules)
          .set({
            shiftTemplateId: sourceSchedule.shiftTemplateId,
            isDayOff: sourceSchedule.isDayOff,
            updatedAt: new Date(),
          })
          .where(eq(shiftSchedules.id, existingTarget.id))
          .returning();

        // Удаляем старые назначения
        await db
          .delete(shiftStaffAssignments)
          .where(eq(shiftStaffAssignments.shiftScheduleId, existingTarget.id));

        await db
          .delete(shiftTableAssignments)
          .where(eq(shiftTableAssignments.shiftScheduleId, existingTarget.id));
      } else {
        // Создаем новое
        [targetSchedule] = await db
          .insert(shiftSchedules)
          .values({
            restaurantId: session.user.restaurantId,
            date: targetDateStr,
            shiftTemplateId: sourceSchedule.shiftTemplateId,
            isDayOff: sourceSchedule.isDayOff,
          })
          .returning();
      }

      copiedSchedules.push(targetSchedule);

      // Копируем назначения персонала
      const sourceStaff = await db
        .select()
        .from(shiftStaffAssignments)
        .where(eq(shiftStaffAssignments.shiftScheduleId, sourceSchedule.id));

      const staffIdMapping = new Map<string, string>(); // source ID -> target ID

      for (const staff of sourceStaff) {
        const [newStaff] = await db
          .insert(shiftStaffAssignments)
          .values({
            shiftScheduleId: targetSchedule.id,
            userId: staff.userId,
            departmentId: staff.departmentId,
            startTime: staff.startTime,
            durationHours: staff.durationHours,
          })
          .returning();

        staffIdMapping.set(staff.id, newStaff.id);
        copiedStaffAssignments.push(newStaff);
      }

      // Копируем назначения столиков
      const sourceTables = await db
        .select()
        .from(shiftTableAssignments)
        .where(eq(shiftTableAssignments.shiftScheduleId, sourceSchedule.id));

      for (const table of sourceTables) {
        const newStaffAssignmentId = staffIdMapping.get(table.shiftStaffAssignmentId);
        
        if (newStaffAssignmentId) {
          const [newTable] = await db
            .insert(shiftTableAssignments)
            .values({
              shiftScheduleId: targetSchedule.id,
              shiftStaffAssignmentId: newStaffAssignmentId,
              tableId: table.tableId,
              startTime: table.startTime,
              durationHours: table.durationHours,
            })
            .returning();

          copiedTableAssignments.push(newTable);
        }
      }
    }

    return NextResponse.json({
      success: true,
      copiedSchedules: copiedSchedules.length,
      copiedStaffAssignments: copiedStaffAssignments.length,
      copiedTableAssignments: copiedTableAssignments.length,
    });
  } catch (error) {
    console.error('Error copying week schedule:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
