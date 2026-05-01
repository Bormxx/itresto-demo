import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { shiftTemplates } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const createShiftTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/), // HH:MM format
  durationHours: z.number().min(0.5).max(24),
});

// GET - получить все шаблоны смен ресторана
export async function GET(request: NextRequest) {
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

    const templates = await db
      .select()
      .from(shiftTemplates)
      .where(eq(shiftTemplates.restaurantId, session.user.restaurantId))
      .orderBy(shiftTemplates.startTime);

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching shift templates:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// POST - создать новый шаблон смены
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
    const validation = createShiftTemplateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Неверные данные', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { name, startTime, durationHours } = validation.data;

    // Проверяем, нет ли уже смены с таким названием
    const existing = await db
      .select()
      .from(shiftTemplates)
      .where(
        and(
          eq(shiftTemplates.restaurantId, session.user.restaurantId),
          eq(shiftTemplates.name, name)
        )
      );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Смена с таким названием уже существует' },
        { status: 400 }
      );
    }

    const [template] = await db
      .insert(shiftTemplates)
      .values({
        restaurantId: session.user.restaurantId,
        name,
        startTime,
        durationHours,
      })
      .returning();

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('Error creating shift template:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
