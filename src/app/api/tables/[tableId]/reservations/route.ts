import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reservations } from '@/lib/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  try {
    const { tableId } = await params;
    const now = new Date();
    
    // Получаем активные бронирования (подтвержденные, не истекшие)
    const tableReservations = await db
      .select()
      .from(reservations)
      .where(
        and(
          eq(reservations.tableId, tableId),
          eq(reservations.status, 'confirmed'),
          gte(reservations.reservedTo, now)
        )
      );

    return NextResponse.json(tableReservations);
  } catch (error) {
    console.error('Error fetching table reservations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reservations' },
      { status: 500 }
    );
  }
}
