import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { shiftTemplateTableAssignments, shiftTemplates, shiftTemplateStaffAssignments, tables, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const tableAssignmentSchema = z.object({
  tableId: z.string().uuid(),
  staffAssignmentId: z.string().uuid(),
  startTime: z.string().regex(/^\d{1,2}:\d{2}$/), // H:MM or HH:MM
  durationHours: z.number().positive(),
});

const bulkTableAssignmentSchema = z.object({
  assignments: z.array(tableAssignmentSchema),
});

// GET - получить назначения столиков для шаблона
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

    if (!session.user.restaurantId) {
      return NextResponse.json({ error: 'Ресторан не найден' }, { status: 400 });
    }

    const { id: templateId } = await params;

    // Проверяем что шаблон принадлежит ресторану
    const [template] = await db
      .select()
      .from(shiftTemplates)
      .where(
        and(
          eq(shiftTemplates.id, templateId),
          eq(shiftTemplates.restaurantId, session.user.restaurantId)
        )
      );

    if (!template) {
      return NextResponse.json({ error: 'Шаблон не найден' }, { status: 404 });
    }

    // Получаем все назначения столиков для шаблона
    const assignments = await db
      .select({
        id: shiftTemplateTableAssignments.id,
        tableId: shiftTemplateTableAssignments.tableId,
        staffAssignmentId: shiftTemplateTableAssignments.shiftTemplateStaffAssignmentId,
        startTime: shiftTemplateTableAssignments.startTime,
        durationHours: shiftTemplateTableAssignments.durationHours,
        userId: shiftTemplateStaffAssignments.userId,
        table: {
          id: tables.id,
          number: tables.number,
        },
        waiter: {
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(shiftTemplateTableAssignments)
      .leftJoin(tables, eq(shiftTemplateTableAssignments.tableId, tables.id))
      .leftJoin(
        shiftTemplateStaffAssignments,
        eq(shiftTemplateTableAssignments.shiftTemplateStaffAssignmentId, shiftTemplateStaffAssignments.id)
      )
      .leftJoin(users, eq(shiftTemplateStaffAssignments.userId, users.id))
      .where(eq(shiftTemplateTableAssignments.shiftTemplateId, templateId));

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error('Error fetching template table assignments:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// POST - сохранить назначения столиков для шаблона (заменяет все существующие)
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

    if (!session.user.restaurantId) {
      return NextResponse.json({ error: 'Ресторан не найден' }, { status: 400 });
    }

    const { id: templateId } = await params;

    // Проверяем что шаблон принадлежит ресторану
    const [template] = await db
      .select()
      .from(shiftTemplates)
      .where(
        and(
          eq(shiftTemplates.id, templateId),
          eq(shiftTemplates.restaurantId, session.user.restaurantId)
        )
      );

    if (!template) {
      return NextResponse.json({ error: 'Шаблон не найден' }, { status: 404 });
    }

    const body = await request.json();
    const validation = bulkTableAssignmentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Неверные данные', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { assignments } = validation.data;

    // Удаляем все существующие назначения столиков для шаблона
    await db
      .delete(shiftTemplateTableAssignments)
      .where(eq(shiftTemplateTableAssignments.shiftTemplateId, templateId));

    // Добавляем новые назначения
    if (assignments.length > 0) {
      await db.insert(shiftTemplateTableAssignments).values(
        assignments.map((assignment) => ({
          shiftTemplateId: templateId,
          shiftTemplateStaffAssignmentId: assignment.staffAssignmentId,
          tableId: assignment.tableId,
          startTime: assignment.startTime,
          durationHours: assignment.durationHours.toString(),
        }))
      );
    }

    // Возвращаем обновленные назначения
    const updatedAssignments = await db
      .select({
        id: shiftTemplateTableAssignments.id,
        tableId: shiftTemplateTableAssignments.tableId,
        staffAssignmentId: shiftTemplateTableAssignments.shiftTemplateStaffAssignmentId,
        startTime: shiftTemplateTableAssignments.startTime,
        durationHours: shiftTemplateTableAssignments.durationHours,
        table: {
          id: tables.id,
          number: tables.number,
        },
      })
      .from(shiftTemplateTableAssignments)
      .leftJoin(tables, eq(shiftTemplateTableAssignments.tableId, tables.id))
      .where(eq(shiftTemplateTableAssignments.shiftTemplateId, templateId));

    return NextResponse.json({ assignments: updatedAssignments });
  } catch (error) {
    console.error('Error saving template table assignments:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
