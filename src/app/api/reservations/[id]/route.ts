import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { reservations } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// DELETE /api/reservations/[id] - отменить бронирование
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'client') {
      return NextResponse.json(
        { error: 'Только авторизованные клиенты могут отменять бронирования' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Найти бронирование
    const reservation = await db.query.reservations.findFirst({
      where: and(
        eq(reservations.id, id),
        eq(reservations.clientId, session.user.id)
      ),
    });

    if (!reservation) {
      return NextResponse.json(
        { error: 'Бронирование не найдено' },
        { status: 404 }
      );
    }

    // Проверка, что бронь еще не началась (можно отменить только будущие)
    if (new Date(reservation.reservedFrom) < new Date()) {
      return NextResponse.json(
        { error: 'Нельзя отменить уже начавшееся бронирование' },
        { status: 400 }
      );
    }

    // Обновить статус на cancelled
    await db
      .update(reservations)
      .set({ status: 'cancelled' })
      .where(eq(reservations.id, id));

    return NextResponse.json(
      { message: 'Бронирование отменено успешно' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Cancel reservation error:', error);
    return NextResponse.json(
      { error: 'Не удалось отменить бронирование' },
      { status: 500 }
    );
  }
}
