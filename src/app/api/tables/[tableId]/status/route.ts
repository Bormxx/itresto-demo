import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tables, orders } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/tables/[tableId]/status - проверить статус столика
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  try {
    const { tableId } = await params;

    // Получаем столик с активными заказами
    const table = await db.query.tables.findFirst({
      where: eq(tables.id, tableId),
      with: {
        orders: {
          where: (orders, { notInArray }) => 
            notInArray(orders.status, ['completed', 'cancelled']),
        },
        reservations: {
          where: (reservations, { gte, lte, and, sql }) =>
            and(
              gte(reservations.reservedFrom, sql`NOW() - INTERVAL '2 hours'`),
              lte(reservations.reservedFrom, sql`NOW() + INTERVAL '2 hours'`)
            ),
        },
      },
    });

    if (!table) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      );
    }

    // Проверяем статус
    const hasActiveOrders = table.orders && table.orders.length > 0;
    const hasReservation = table.reservations && table.reservations.length > 0;

    let status: 'available' | 'occupied' | 'reserved' = 'available';
    let message = 'Столик свободен';

    if (hasActiveOrders) {
      status = 'occupied';
      message = 'Столик занят другими гостями';
    } else if (hasReservation) {
      status = 'reserved';
      message = 'Столик забронирован';
    }

    return NextResponse.json({
      tableId: table.id,
      tableNumber: table.number,
      status,
      message,
      capacity: table.capacity,
      hasActiveOrders,
      hasReservation,
    });
  } catch (error) {
    console.error('Error checking table status:', error);
    return NextResponse.json(
      { error: 'Failed to check table status' },
      { status: 500 }
    );
  }
}
