import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { orders, tables, orderItems, menuItems } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Не авторизован' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'waiter') {
      return NextResponse.json(
        { success: false, error: 'Доступ запрещен' },
        { status: 403 }
      );
    }

    // Загрузить все заказы ресторана официанта
    const restaurantOrders = await db.query.orders.findMany({
      where: eq(orders.restaurantId, session.user.restaurantId),
      orderBy: [desc(orders.createdAt)],
      with: {
        table: true,
        orderItems: {
          with: {
            menuItem: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      orders: restaurantOrders,
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при загрузке заказов' },
      { status: 500 }
    );
  }
}
