import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { shiftTableAssignments, shiftSchedules } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// DELETE - удалить назначение столика
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    if (!['supervisor', 'manager'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    const { id: scheduleId, assignmentId } = await params;

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

    // Удаляем назначение
    const [deleted] = await db
      .delete(shiftTableAssignments)
      .where(
        and(
          eq(shiftTableAssignments.id, assignmentId),
          eq(shiftTableAssignments.shiftScheduleId, scheduleId)
        )
      )
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'Назначение не найдено' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting table assignment:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
