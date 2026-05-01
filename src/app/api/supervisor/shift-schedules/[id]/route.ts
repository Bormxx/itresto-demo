import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { 
  shiftSchedules, 
  shiftTemplates, 
  shiftStaffAssignments,
  shiftTableAssignments 
} from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const updateScheduleSchema = z.object({
  shiftTemplateId: z.string().uuid().nullable().optional(),
  isDayOff: z.boolean().optional(),
});

// GET - получить детальное расписание с назначениями
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    if (!['supervisor', 'manager', 'waiter', 'kitchen_staff', 'bar_staff'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    const { id } = await params;

    const [schedule] = await db
      .select()
      .from(shiftSchedules)
      .where(
        and(
          eq(shiftSchedules.id, id),
          eq(shiftSchedules.restaurantId, session.user.restaurantId!)
        )
      );

    if (!schedule) {
      return NextResponse.json({ error: 'Расписание не найдено' }, { status: 404 });
    }

    // Загружаем template
    let template = null;
    if (schedule.shiftTemplateId) {
      [template] = await db
        .select()
        .from(shiftTemplates)
        .where(eq(shiftTemplates.id, schedule.shiftTemplateId));
    }

    // Загружаем назначения персонала
    const staffAssignments = await db
      .select()
      .from(shiftStaffAssignments)
      .where(eq(shiftStaffAssignments.shiftScheduleId, id));

    // Загружаем назначения столиков
    const tableAssignments = await db
      .select()
      .from(shiftTableAssignments)
      .where(eq(shiftTableAssignments.shiftScheduleId, id));

    return NextResponse.json({
      schedule: {
        ...schedule,
        template,
        staffAssignments,
        tableAssignments,
      },
    });
  } catch (error) {
    console.error('Error fetching shift schedule:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// DELETE - удалить расписание (только будущие даты)
export async function DELETE(
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

    const { id } = await params;

    const [schedule] = await db
      .select()
      .from(shiftSchedules)
      .where(
        and(
          eq(shiftSchedules.id, id),
          eq(shiftSchedules.restaurantId, session.user.restaurantId!)
        )
      );


    if (!schedule) {
      return NextResponse.json({ error: 'Расписание не найдено' }, { status: 404 });
    }

    // Проверяем, что это не сегодняшний день с назначенными сотрудниками
    const today = new Date().toISOString().split('T')[0];
    
    if (schedule.date === today) {
      
      // Проверяем, есть ли назначенные сотрудники
      const staffAssignments = await db
        .select()
        .from(shiftStaffAssignments)
        .where(eq(shiftStaffAssignments.shiftScheduleId, id));
      
      
      if (staffAssignments.length > 0) {
        return NextResponse.json(
          { error: 'Нельзя удалить расписание текущего дня с назначенными сотрудниками' },
          { status: 400 }
        );
      }
      
    }

    await db.delete(shiftSchedules).where(eq(shiftSchedules.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting shift schedule:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
