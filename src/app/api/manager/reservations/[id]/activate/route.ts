import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { reservations, tables } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Проверка роли
    if (!['manager', 'supervisor', 'admin'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    // Получить бронирование
    const reservation = await db.query.reservations.findFirst({
      where: eq(reservations.id, id),
    });

    if (!reservation) {
      return NextResponse.json({ error: 'Бронирование не найдено' }, { status: 404 });
    }

    // Обновить статус бронирования на "confirmed" и установить время активации
    await db
      .update(reservations)
      .set({
        status: 'confirmed',
        actualStartTime: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(reservations.id, id));

    // Опционально: обновить статус столика на "occupied"
    await db
      .update(tables)
      .set({
        status: 'occupied',
      })
      .where(eq(tables.id, reservation.tableId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reservation activation error:', error);
    return NextResponse.json(
      { error: 'Ошибка активации бронирования' },
      { status: 500 }
    );
  }
}
