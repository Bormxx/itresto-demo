/**
 * API endpoint для получения данных дашборда официанта
 * GET /api/mobile/waiter/dashboard
 */
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db';
import { tables, orders, waiterCalls } from '@/lib/db/schema';
import { eq, and, isNull, desc, notInArray } from 'drizzle-orm';

async function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const secret = new TextEncoder().encode(
    process.env.NEXTAUTH_SECRET || 'default-secret'
  );

  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Проверить авторизацию
    const payload = await verifyToken(request);
    if (!payload || !payload.userId || !payload.restaurantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const restaurantId = payload.restaurantId as string;

    // Загрузить все столики ресторана
    const allTables = await db.query.tables.findMany({
      where: eq(tables.restaurantId, restaurantId),
      orderBy: [tables.number],
    });

    // Сортировать по номеру как число (number хранится как varchar)
    allTables.sort((a, b) => {
      const numA = parseInt(String(a.number), 10) || 0;
      const numB = parseInt(String(b.number), 10) || 0;
      return numA - numB;
    });

    // Загрузить все активные заказы (все кроме completed и cancelled)
    const activeOrders = await db.query.orders.findMany({
      where: and(
        eq(orders.restaurantId, restaurantId),
        notInArray(orders.status, ['completed', 'cancelled'])
      ),
      orderBy: [desc(orders.createdAt)],
      with: {
        orderItems: {
          with: {
            menuItem: true,
          },
        },
      },
    });

    // Загрузить активные вызовы официанта
    const activeWaiterCalls = await db.query.waiterCalls.findMany({
      where: and(
        eq(waiterCalls.restaurantId, restaurantId),
        isNull(waiterCalls.acknowledgedAt)
      ),
      orderBy: [desc(waiterCalls.createdAt)],
    });

    // Связать столики с заказами и вызовами
    const tablesWithData = allTables.map((table) => ({
      ...table,
      orders: activeOrders.filter((order) => order.tableId === table.id),
      hasWaiterCall: Boolean(activeWaiterCalls.some((call) => call.tableId === table.id)),
    }));

    // Сериализовать вызовы
    const serializedCalls = activeWaiterCalls.map((call) => ({
      id: call.id,
      tableId: call.tableId,
      tableNumber: allTables.find((t) => t.id === call.tableId)?.number || 0,
      message: call.message,
      createdAt: call.createdAt.toISOString(),
      acknowledgedAt: call.acknowledgedAt?.toISOString() || null,
    }));

    return NextResponse.json({
      tables: tablesWithData,
      waiterCalls: serializedCalls,
      activeOrdersCount: activeOrders.length,
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
