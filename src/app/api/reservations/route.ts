import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { reservations, tables } from '@/lib/db/schema';
import { and, eq, gte, lte, or } from 'drizzle-orm';
import { z } from 'zod';

const createReservationSchema = z.object({
  restaurantId: z.string(),
  tableId: z.string().uuid(),
  reservedFrom: z.string().datetime(),
  reservedTo: z.string().datetime(),
  partySize: z.number().int().positive(),
  notes: z.string().optional(),
});

// POST /api/reservations - создать бронирование
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'client') {
      return NextResponse.json(
        { error: 'Только авторизованные клиенты могут бронировать столики' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validatedData = createReservationSchema.parse(body);

    const reservedFrom = new Date(validatedData.reservedFrom);
    const reservedTo = new Date(validatedData.reservedTo);

    // Проверка, что время бронирования в будущем
    if (reservedFrom < new Date()) {
      return NextResponse.json(
        { error: 'Время бронирования должно быть в будущем' },
        { status: 400 }
      );
    }

    // Проверка, что время окончания после начала
    if (reservedTo <= reservedFrom) {
      return NextResponse.json(
        { error: 'Время окончания должно быть после времени начала' },
        { status: 400 }
      );
    }

    // Получить информацию о столике
    const table = await db.query.tables.findFirst({
      where: eq(tables.id, validatedData.tableId),
    });

    if (!table) {
      return NextResponse.json({ error: 'Столик не найден' }, { status: 404 });
    }

    // Проверить вместимость
    if (validatedData.partySize > (table.capacity || 4)) {
      return NextResponse.json(
        { error: `Столик вмещает не более ${table.capacity} человек` },
        { status: 400 }
      );
    }

    // Проверить, что столик свободен в указанное время
    const conflictingReservations = await db.query.reservations.findMany({
      where: and(
        eq(reservations.tableId, validatedData.tableId),
        eq(reservations.status, 'confirmed'),
        or(
          // Новое бронирование начинается во время существующего
          and(
            lte(reservations.reservedFrom, reservedFrom),
            gte(reservations.reservedTo, reservedFrom)
          ),
          // Новое бронирование заканчивается во время существующего
          and(
            lte(reservations.reservedFrom, reservedTo),
            gte(reservations.reservedTo, reservedTo)
          ),
          // Новое бронирование полностью покрывает существующее
          and(
            gte(reservations.reservedFrom, reservedFrom),
            lte(reservations.reservedTo, reservedTo)
          )
        )
      ),
    });

    if (conflictingReservations.length > 0) {
      return NextResponse.json(
        { error: 'Столик занят в указанное время' },
        { status: 409 }
      );
    }

    // Создать бронирование
    const [newReservation] = await db
      .insert(reservations)
      .values({
        restaurantId: validatedData.restaurantId,
        tableId: validatedData.tableId,
        clientId: session.user.id,
        reservedFrom,
        reservedTo,
        partySize: validatedData.partySize,
        notes: validatedData.notes || null,
        status: 'confirmed',
      })
      .returning();

    return NextResponse.json(
      {
        message: 'Бронирование создано успешно',
        reservation: newReservation,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create reservation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Неверные данные', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Не удалось создать бронирование' },
      { status: 500 }
    );
  }
}

// GET /api/reservations - получить бронирования текущего пользователя
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userReservations = await db.query.reservations.findMany({
      where: eq(reservations.clientId, session.user.id),
      with: {
        table: true,
        restaurant: true,
      },
      orderBy: (reservations, { desc }) => [desc(reservations.reservedFrom)],
    });

    return NextResponse.json({ reservations: userReservations }, { status: 200 });
  } catch (error) {
    console.error('Get reservations error:', error);
    return NextResponse.json(
      { error: 'Не удалось получить бронирования' },
      { status: 500 }
    );
  }
}
