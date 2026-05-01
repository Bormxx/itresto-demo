import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tables, reservations, orders } from '@/lib/db/schema';
import { eq, and, gte, lte, or } from 'drizzle-orm';

// GET /api/tables/available?restaurantId=...&date=...&time=...&duration=...&guests=...
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId');
    const dateStr = searchParams.get('date'); // YYYY-MM-DD
    const timeStr = searchParams.get('time'); // HH:MM
    const duration = parseInt(searchParams.get('duration') || '120'); // в минутах
    const guests = parseInt(searchParams.get('guests') || '2');

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Restaurant ID is required' },
        { status: 400 }
      );
    }

    if (!dateStr || !timeStr) {
      return NextResponse.json(
        { error: 'Date and time are required' },
        { status: 400 }
      );
    }

    // Создать временной диапазон
    const reservedFrom = new Date(`${dateStr}T${timeStr}`);
    const reservedUntil = new Date(reservedFrom.getTime() + duration * 60 * 1000);

    if (reservedFrom < new Date()) {
      return NextResponse.json(
        { error: 'Время бронирования должно быть в будущем' },
        { status: 400 }
      );
    }

    // Получить все столики ресторана
    const allTables = await db.query.tables.findMany({
      where: eq(tables.restaurantId, restaurantId),
    });

    // Фильтровать по вместимости
    const suitableTables = allTables.filter(
      (table) => (table.capacity || 4) >= guests
    );

    // Для каждого столика проверить доступность
    const availableTables = [];

    for (const table of suitableTables) {
      // Проверить пересечения с бронированиями
      const conflictingReservations = await db.query.reservations.findMany({
        where: and(
          eq(reservations.tableId, table.id),
          eq(reservations.status, 'confirmed'),
          or(
            and(
              lte(reservations.reservedFrom, reservedFrom),
              gte(reservations.reservedTo, reservedFrom)
            ),
            and(
              lte(reservations.reservedFrom, reservedUntil),
              gte(reservations.reservedTo, reservedUntil)
            ),
            and(
              gte(reservations.reservedFrom, reservedFrom),
              lte(reservations.reservedTo, reservedUntil)
            )
          )
        ),
      });

      // Проверить активные заказы
      const activeOrders = await db.query.orders.findMany({
        where: and(
          eq(orders.tableId, table.id),
          eq(orders.status, 'pending')
        ),
      });

      // Если нет конфликтов, столик доступен
      if (conflictingReservations.length === 0 && activeOrders.length === 0) {
        availableTables.push(table);
      }
    }

    return NextResponse.json(
      {
        tables: availableTables,
        requestedTime: {
          from: reservedFrom.toISOString(),
          until: reservedUntil.toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get available tables error:', error);
    return NextResponse.json(
      { error: 'Не удалось получить доступные столики' },
      { status: 500 }
    );
  }
}
