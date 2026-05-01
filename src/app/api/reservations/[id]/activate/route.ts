import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { reservations, tables } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// POST /api/reservations/[id]/activate - активировать бронь и получить PIN
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'client') {
      return NextResponse.json(
        { error: 'Только авторизованные клиенты могут активировать бронирования' },
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
      with: {
        table: true,
      },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: 'Бронирование не найдено' },
        { status: 404 }
      );
    }

    // Проверка что бронь еще не активирована
    if (reservation.actualStartTime) {
      return NextResponse.json(
        { 
          error: 'Бронирование уже активировано',
          pin: reservation.table?.pin,
          activated: true,
        },
        { status: 200 }
      );
    }

    // Проверка что бронь не отменена
    if (reservation.status !== 'confirmed') {
      return NextResponse.json(
        { error: 'Бронирование отменено' },
        { status: 400 }
      );
    }

    // Проверка что можно активировать (не раньше чем за 15 мин до начала)
    const now = new Date();
    const reservedFrom = new Date(reservation.reservedFrom);
    const fifteenMinBefore = new Date(reservedFrom.getTime() - 15 * 60 * 1000);

    if (now < fifteenMinBefore) {
      const minutesUntil = Math.ceil((fifteenMinBefore.getTime() - now.getTime()) / (60 * 1000));
      return NextResponse.json(
        { error: `Столик можно занять за 15 минут до брони. Ещё ${minutesUntil} мин.` },
        { status: 400 }
      );
    }

    // Проверка что бронь не просрочена (30 мин после начала)
    const thirtyMinAfter = new Date(reservedFrom.getTime() + 30 * 60 * 1000);
    if (now > thirtyMinAfter) {
      // Отменить бронь
      await db
        .update(reservations)
        .set({ status: 'cancelled' })
        .where(eq(reservations.id, id));

      return NextResponse.json(
        { error: 'Бронирование просрочено и отменено' },
        { status: 400 }
      );
    }

    // Генерировать PIN для столика (4 цифры)
    const pin = Math.floor(1000 + Math.random() * 9000).toString();

    // Обновить бронь и столик
    await db
      .update(reservations)
      .set({ actualStartTime: now })
      .where(eq(reservations.id, id));

    await db
      .update(tables)
      .set({ pin: pin })
      .where(eq(tables.id, reservation.tableId));

    return NextResponse.json(
      {
        message: 'Столик успешно занят',
        pin,
        tableNumber: reservation.table?.number,
        reservedTo: reservation.reservedTo,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Activate reservation error:', error);
    return NextResponse.json(
      { error: 'Не удалось активировать бронирование' },
      { status: 500 }
    );
  }
}
