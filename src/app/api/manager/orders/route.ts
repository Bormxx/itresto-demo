import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { orders, shifts } from '@/lib/db/schema';
import { eq, desc, and, gte, lte } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      );
    }

    // Проверка роли
    if (!['manager', 'supervisor', 'admin'].includes(session.user.role || '')) {
      return NextResponse.json(
        { error: 'Нет доступа' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');
    const shiftId = searchParams.get('shiftId');

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'RestaurantId обязателен' },
        { status: 400 }
      );
    }

    // Если передан shiftId, получаем информацию о смене для фильтрации
    let whereConditions: any[] = [eq(orders.restaurantId, restaurantId)];
    
    if (shiftId) {
      const shift = await db.query.shifts.findFirst({
        where: eq(shifts.id, shiftId),
      });
      
      if (shift) {
        whereConditions.push(gte(orders.createdAt, shift.startedAt));
        if (shift.endedAt) {
          whereConditions.push(lte(orders.createdAt, shift.endedAt));
        }
      }
    }

    // Загружаем заказы ресторана с информацией об официанте и столике
    const restaurantOrders = await db.query.orders.findMany({
      where: and(...whereConditions),
      orderBy: [desc(orders.createdAt)],
      with: {
        table: true,
        waiter: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        client: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Форматируем данные для клиента
    const formattedOrders = restaurantOrders.map(order => ({
      id: order.id,
      tableNumber: order.table?.number || order.tableNumber || 'N/A',
      orderNumber: order.orderNumber,
      totalAmount: order.total,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      waiterName: order.waiter 
        ? `${order.waiter.firstName} ${order.waiter.lastName}`.trim()
        : undefined,
      customerId: order.clientId || undefined,
      customerName: order.client
        ? `${order.client.firstName} ${order.client.lastName}`.trim()
        : undefined,
      billType: order.billType,
    }));

    return NextResponse.json(formattedOrders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Ошибка при загрузке заказов' },
      { status: 500 }
    );
  }
}
