import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { shiftTemplates, shiftSchedules } from '@/lib/db/schema';
import { eq, and, gte } from 'drizzle-orm';
import { z } from 'zod';

const updateShiftTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  durationHours: z.number().min(0.5).max(24).optional(),
});

// GET - получить один шаблон смены
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

    const { id } = await params;

    const [template] = await db
      .select()
      .from(shiftTemplates)
      .where(
        and(
          eq(shiftTemplates.id, id),
          eq(shiftTemplates.restaurantId, session.user.restaurantId!)
        )
      );

    if (!template) {
      return NextResponse.json({ error: 'Шаблон не найден' }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error fetching shift template:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// PUT - обновить шаблон смены
export async function PUT(
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

    // Проверяем существование шаблона
    const [existing] = await db
      .select()
      .from(shiftTemplates)
      .where(
        and(
          eq(shiftTemplates.id, id),
          eq(shiftTemplates.restaurantId, session.user.restaurantId!)
        )
      );

    if (!existing) {
      return NextResponse.json({ error: 'Шаблон не найден' }, { status: 404 });
    }

    const body = await request.json();
    const validation = updateShiftTemplateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Неверные данные', details: validation.error.issues },
        { status: 400 }
      );
    }

    const updates = validation.data;

    // Если меняется название, проверяем уникальность
    if (updates.name && updates.name !== existing.name) {
      const [duplicate] = await db
        .select()
        .from(shiftTemplates)
        .where(
          and(
            eq(shiftTemplates.restaurantId, session.user.restaurantId!),
            eq(shiftTemplates.name, updates.name)
          )
        );

      if (duplicate) {
        return NextResponse.json(
          { error: 'Смена с таким названием уже существует' },
          { status: 400 }
        );
      }
    }

    const [updated] = await db
      .update(shiftTemplates)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(shiftTemplates.id, id))
      .returning();

    return NextResponse.json({ template: updated });
  } catch (error) {
    console.error('Error updating shift template:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// DELETE - удалить шаблон смены
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

    // Проверяем существование шаблона
    const [existing] = await db
      .select()
      .from(shiftTemplates)
      .where(
        and(
          eq(shiftTemplates.id, id),
          eq(shiftTemplates.restaurantId, session.user.restaurantId!)
        )
      );

    if (!existing) {
      return NextResponse.json({ error: 'Шаблон не найден' }, { status: 404 });
    }

    // Проверяем, используется ли шаблон в текущем или будущем расписании
    const today = new Date().toISOString().split('T')[0];
    const activeSchedules = await db
      .select()
      .from(shiftSchedules)
      .where(
        and(
          eq(shiftSchedules.shiftTemplateId, id),
          gte(shiftSchedules.date, today)
        )
      );

    if (activeSchedules.length > 0) {
      return NextResponse.json(
        {
          error: 'Нельзя удалить шаблон смены, который используется в текущем или будущем расписании',
          usedInDates: activeSchedules.map(s => s.date),
        },
        { status: 400 }
      );
    }

    await db.delete(shiftTemplates).where(eq(shiftTemplates.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting shift template:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
