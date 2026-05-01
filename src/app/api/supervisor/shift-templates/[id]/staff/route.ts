import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { shiftTemplateStaffAssignments, shiftTemplates, users, departments } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { z } from 'zod';

const staffAssignmentSchema = z.object({
  userId: z.string().uuid(),
  departmentId: z.string().uuid().nullable(),
  startTime: z.string().regex(/^\d{1,2}:\d{2}$/), // H:MM or HH:MM
  durationHours: z.number().positive(),
});

const bulkAssignmentSchema = z.object({
  assignments: z.array(staffAssignmentSchema),
});

// GET - получить назначения сотрудников для шаблона
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

    // Получаем все назначения для шаблона
    const assignments = await db
      .select({
        id: shiftTemplateStaffAssignments.id,
        userId: shiftTemplateStaffAssignments.userId,
        departmentId: shiftTemplateStaffAssignments.departmentId,
        startTime: shiftTemplateStaffAssignments.startTime,
        durationHours: shiftTemplateStaffAssignments.durationHours,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
        department: {
          id: departments.id,
          name: departments.name,
        },
      })
      .from(shiftTemplateStaffAssignments)
      .leftJoin(users, eq(shiftTemplateStaffAssignments.userId, users.id))
      .leftJoin(departments, eq(shiftTemplateStaffAssignments.departmentId, departments.id))
      .where(eq(shiftTemplateStaffAssignments.shiftTemplateId, templateId));

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error('Error fetching template staff assignments:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// POST - сохранить назначения сотрудников для шаблона (заменяет все существующие)
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
    const validation = bulkAssignmentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Неверные данные', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { assignments } = validation.data;

    // Получаем текущие назначения для шаблона
    const currentAssignments = await db
      .select()
      .from(shiftTemplateStaffAssignments)
      .where(eq(shiftTemplateStaffAssignments.shiftTemplateId, templateId));

    // Создаем карту текущих назначений по userId
    const currentByUserId = new Map(
      currentAssignments.map(a => [a.userId, a])
    );

    // Определяем какие userId должны остаться
    const newUserIds = new Set(assignments.map(a => a.userId));

    // Удаляем назначения для пользователей, которых больше нет в списке
    const idsToDelete = currentAssignments
      .filter(a => !newUserIds.has(a.userId))
      .map(a => a.id);

    if (idsToDelete.length > 0) {
      await db
        .delete(shiftTemplateStaffAssignments)
        .where(inArray(shiftTemplateStaffAssignments.id, idsToDelete));
    }

    // Обновляем существующие и создаем новые назначения
    for (const assignment of assignments) {
      const existing = currentByUserId.get(assignment.userId);
      
      if (existing) {
        // Обновляем существующее назначение
        await db
          .update(shiftTemplateStaffAssignments)
          .set({
            departmentId: assignment.departmentId,
            startTime: assignment.startTime,
            durationHours: assignment.durationHours.toString(),
            updatedAt: new Date(),
          })
          .where(eq(shiftTemplateStaffAssignments.id, existing.id));
      } else {
        // Создаем новое назначение
        await db.insert(shiftTemplateStaffAssignments).values({
          shiftTemplateId: templateId,
          userId: assignment.userId,
          departmentId: assignment.departmentId,
          startTime: assignment.startTime,
          durationHours: assignment.durationHours.toString(),
        });
      }
    }

    // Возвращаем обновленные назначения
    const updatedAssignments = await db
      .select({
        id: shiftTemplateStaffAssignments.id,
        userId: shiftTemplateStaffAssignments.userId,
        departmentId: shiftTemplateStaffAssignments.departmentId,
        startTime: shiftTemplateStaffAssignments.startTime,
        durationHours: shiftTemplateStaffAssignments.durationHours,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
        department: {
          id: departments.id,
          name: departments.name,
        },
      })
      .from(shiftTemplateStaffAssignments)
      .leftJoin(users, eq(shiftTemplateStaffAssignments.userId, users.id))
      .leftJoin(departments, eq(shiftTemplateStaffAssignments.departmentId, departments.id))
      .where(eq(shiftTemplateStaffAssignments.shiftTemplateId, templateId));

    return NextResponse.json({ assignments: updatedAssignments });
  } catch (error) {
    console.error('Error saving template staff assignments:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
