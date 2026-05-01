/**
 * API endpoint для получения истории заказов официанта
 * GET /api/mobile/orders/history?shiftId=xxx&tableId=xxx&from=xxx&to=xxx
 */
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db';
import { orders, orderItemDeliveries, orderItems, shifts, tables } from '@/lib/db/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

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
    const payload = await verifyToken(request);
    if (!payload || !payload.userId || !payload.restaurantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = payload.userId as string;
    const restaurantId = payload.restaurantId as string;

    // Параметры фильтрации
    const { searchParams } = new URL(request.url);
    const shiftId = searchParams.get('shiftId');
    const tableId = searchParams.get('tableId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Построить условия фильтрации
    const conditions = [
      eq(orders.restaurantId, restaurantId),
      eq(orders.status, 'completed'),
    ];

    if (tableId) {
      conditions.push(eq(orders.tableId, tableId));
    }

    if (from) {
      conditions.push(gte(orders.createdAt, new Date(from)));
    }

    if (to) {
      conditions.push(lte(orders.createdAt, new Date(to)));
    }

    // Получить ID заказов, в которых официант забирал блюда
    const waiterOrderIds = await db
      .selectDistinct({ orderId: orderItems.orderId })
      .from(orderItemDeliveries)
      .innerJoin(orderItems, eq(orderItemDeliveries.orderItemId, orderItems.id))
      .where(eq(orderItemDeliveries.waiterId, userId));

    const waiterOrderIdsSet = new Set(waiterOrderIds.map((row) => row.orderId));

    if (waiterOrderIdsSet.size === 0) {
      return NextResponse.json({
        orders: [],
        totalOrders: 0,
        totalAmount: 0,
      });
    }

    // Загрузить заказы
    let ordersQuery = db.query.orders.findMany({
      where: and(...conditions),
      orderBy: [desc(orders.createdAt)],
      with: {
        table: {
          columns: {
            id: true,
            number: true,
          },
        },
        orderItems: {
          with: {
            menuItem: {
              columns: {
                name: true,
              },
            },
          },
        },
      },
    });

    let allOrders = await ordersQuery;

    // Фильтровать только заказы, где официант забирал блюда
    allOrders = allOrders.filter((order) => waiterOrderIdsSet.has(order.id));

    // Если указан shiftId, фильтровать по смене
    if (shiftId) {
      const shift = await db.query.shifts.findFirst({
        where: eq(shifts.id, shiftId),
        columns: {
          startedAt: true,
          endedAt: true,
        },
      });

      if (shift) {
        allOrders = allOrders.filter((order) => {
          const orderTime = new Date(order.createdAt);
          return orderTime >= shift.startedAt && (!shift.endedAt || orderTime <= shift.endedAt);
        });
      }
    }

    // Группировать по сменам
    const ordersByShift: Record<
      string,
      {
        shiftId: string;
        shiftName: string;
        shiftDate: string;
        orders: typeof allOrders;
      }
    > = {};

    for (const order of allOrders) {
      // Найти смену для этого заказа
      const orderShifts = await db.query.shifts.findMany({
        where: and(
          eq(shifts.restaurantId, restaurantId),
          lte(shifts.startedAt, order.createdAt),
          sql`(${shifts.endedAt} IS NULL OR ${shifts.endedAt} >= ${order.createdAt})`
        ),
        orderBy: [desc(shifts.startedAt)],
        limit: 1,
      });

      const orderShift = orderShifts[0];
      const shiftKey = orderShift?.id || 'no-shift';
      const shiftName = orderShift 
        ? `Смена (${new Date(orderShift.startedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} - ${orderShift.endedAt ? new Date(orderShift.endedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : 'текущая'})`
        : 'Без смены';
      const shiftDate = orderShift
        ? new Date(orderShift.startedAt).toLocaleDateString('ru-RU')
        : new Date(order.createdAt).toLocaleDateString('ru-RU');

      if (!ordersByShift[shiftKey]) {
        ordersByShift[shiftKey] = {
          shiftId: shiftKey,
          shiftName,
          shiftDate,
          orders: [],
        };
      }

      ordersByShift[shiftKey].orders.push(order);
    }

    // Преобразовать в массив и отсортировать
    const groupedOrders = Object.values(ordersByShift).sort((a, b) => {
      return new Date(b.shiftDate).getTime() - new Date(a.shiftDate).getTime();
    });

    // Подсчитать статистику
    const totalAmount = allOrders.reduce(
      (sum, order) => sum + parseFloat(order.total),
      0
    );

    return NextResponse.json({
      ordersByShift: groupedOrders,
      totalOrders: allOrders.length,
      totalAmount: totalAmount.toFixed(2),
    });
  } catch (error) {
    console.error('Order history API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
