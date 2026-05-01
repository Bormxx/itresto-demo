import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reservations } from '@/lib/db/schema';
import { eq, and, isNull, lt } from 'drizzle-orm';

/**
 * API endpoint to check and cancel reservations that are late by more than 30 minutes
 * This should be called periodically (e.g., via cron job or on-demand)
 */
export async function POST(request: NextRequest) {
  try {
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

    // Найти бронирования которые:
    // 1. Имеют статус 'confirmed'
    // 2. Не были активированы (actualStartTime = null)
    // 3. Время начала было более 30 минут назад
    const expiredReservations = await db
      .select()
      .from(reservations)
      .where(
        and(
          eq(reservations.status, 'confirmed'),
          isNull(reservations.actualStartTime),
          lt(reservations.reservedFrom, thirtyMinutesAgo)
        )
      );

    // Отменить найденные бронирования
    const cancelledIds: string[] = [];
    for (const reservation of expiredReservations) {
      await db
        .update(reservations)
        .set({
          status: 'cancelled',
        })
        .where(eq(reservations.id, reservation.id));
      
      cancelledIds.push(reservation.id);
    }

    return NextResponse.json({
      success: true,
      cancelledCount: cancelledIds.length,
      cancelledIds,
    });
  } catch (error) {
    console.error('Error cancelling expired reservations:', error);
    return NextResponse.json(
      { error: 'Failed to cancel expired reservations' },
      { status: 500 }
    );
  }
}
