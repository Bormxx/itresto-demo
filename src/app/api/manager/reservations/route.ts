import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { reservations, tables, users } from '@/lib/db/schema';
import { eq, gte, and } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Проверка роли
    if (!['manager', 'supervisor', 'admin'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId');

    if (!restaurantId) {
      return NextResponse.json({ error: 'Требуется ID ресторана' }, { status: 400 });
    }

    // Получить бронирования
    const reservationsList = await db.query.reservations.findMany({
      where: and(
        eq(reservations.restaurantId, restaurantId),
        gte(reservations.reservedFrom, new Date())
      ),
      with: {
        table: true,
        client: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        creator: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: (reservations, { asc }) => [asc(reservations.reservedFrom)],
    });

    return NextResponse.json({ reservations: reservationsList });
  } catch (error) {
    console.error('Reservations fetch error:', error);
    return NextResponse.json(
      { error: 'Ошибка получения бронирований' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Проверка роли
    if (!['manager', 'supervisor', 'admin'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    const body = await req.json();
    

    // Поддержка двух форматов: клиентский (с clientId) и менеджерский (с customerName/customerPhone)
    let reservationData: any;

    if (body.reservationDate && body.reservationTime) {
      // Формат от менеджера
      const {
        tableId,
        restaurantId,
        customerName,
        customerPhone,
        guestCount,
        reservationDate,
        reservationTime,
        duration,
        notes,
      } = body;

      if (!tableId || !restaurantId || !customerName || !customerPhone || !reservationDate || !reservationTime) {
        return NextResponse.json(
          { error: 'Не все обязательные поля заполнены' },
          { status: 400 }
        );
      }

      // Найти или создать клиента по телефону
      // Ищем только среди клиентов, не среди сотрудников
      let client = await db.query.users.findFirst({
        where: and(
          eq(users.phone, customerPhone),
          eq(users.role, 'client')
        ),
      });

      if (!client) {
        // Создать нового клиента
        
        // Разделить имя на firstName и lastName
        const nameParts = customerName.trim().split(/\s+/);
        const firstName = nameParts[0] || 'Гость';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        // Сгенерировать email на основе телефона
        const email = `${customerPhone.replace(/\D/g, '')}@guest.local`;
        
        const [newClient] = await db
          .insert(users)
          .values({
            firstName,
            lastName: lastName || null,
            phone: customerPhone,
            email,
            role: 'client',
            restaurantId,
          })
          .returning();
        client = newClient;
      } else {
      }

      // Создаем временные даты для бронирования
      const reservedFrom = new Date(`${reservationDate}T${reservationTime}`);
      const reservedTo = new Date(reservedFrom.getTime() + duration * 60 * 1000);

      reservationData = {
        tableId,
        restaurantId,
        clientId: client.id,
        createdBy: session.user.id, // Менеджер, который создал бронирование
        reservedFrom,
        reservedTo,
        partySize: guestCount,
        notes: notes || null,
        status: 'pending',
      };
    } else {
      // Формат от клиента (старый)
      const {
        tableId,
        restaurantId,
        clientId,
        reservedFrom,
        reservedTo,
        partySize,
        notes,
      } = body;

      reservationData = {
        tableId,
        restaurantId,
        clientId,
        createdBy: session.user.id, // Кто создал бронирование
        reservedFrom: new Date(reservedFrom),
        reservedTo: new Date(reservedTo),
        partySize,
        notes: notes || null,
        status: 'confirmed',
      };
    }


    // Создать бронирование
    const [reservation] = await db
      .insert(reservations)
      .values(reservationData)
      .returning();


    return NextResponse.json({ reservation });
  } catch (error) {
    console.error('Reservation creation error:', error);
    return NextResponse.json(
      { error: 'Ошибка создания бронирования' },
      { status: 500 }
    );
  }
}
