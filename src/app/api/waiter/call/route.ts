import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { waiterCalls } from '@/lib/db/schema';
import { sendNotification } from '@/lib/notifications';
import { sendPushToWaiters } from '@/lib/expo-notifications';

// POST /api/waiter/call - вызов официанта
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tableId, restaurantId, message } = body;

    if (!tableId || !restaurantId) {
      return NextResponse.json(
        { error: 'Table ID and restaurant ID are required' },
        { status: 400 }
      );
    }

    // Получаем столик с назначенным официантом
    const table = await db.query.tables.findFirst({
      where: (tables, { eq, and }) =>
        and(
          eq(tables.id, tableId),
          eq(tables.restaurantId, restaurantId)
        ),
      with: {
        waiterTables: {
          with: {
            waiter: true,
          },
        },
      },
    });

    if (!table) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      );
    }

    // Создаем запись о вызове официанта
    const [call] = await db.insert(waiterCalls).values({
      tableId: table.id,
      restaurantId,
      message: message || null,
    }).returning();

    // Находим назначенного официанта
    const assignedWaiter = table.waiterTables?.[0]?.waiter;

    // Отправить уведомление официантам через SSE
    sendNotification({
      type: 'waiter_call',
      restaurantId,
      role: 'waiter',
      userId: assignedWaiter?.id, // Уведомить конкретного официанта, если назначен
      data: {
        callId: call.id,
        tableId: table.id,
        tableNumber: table.number,
        timestamp: new Date().toISOString(),
        message: message || `Клиент вызывает официанта за столиком ${table.number}`,
      },
    });

    // Отправить Push-уведомление на мобильные устройства (не блокирующее)
    sendPushToWaiters({
      restaurantId,
      tableNumber: table.number,
      message: message || `Клиент за столом ${table.number} вызывает официанта`,
    }).catch((error) => {
      console.error('Failed to send push notification:', error);
    });

    return NextResponse.json({
      success: true,
      message: 'Официант вызван',
      waiter: assignedWaiter ? {
        firstName: assignedWaiter.firstName,
        lastName: assignedWaiter.lastName,
      } : null,
    });
  } catch (error) {
    console.error('Error calling waiter:', error);
    return NextResponse.json(
      { error: 'Failed to call waiter' },
      { status: 500 }
    );
  }
}
