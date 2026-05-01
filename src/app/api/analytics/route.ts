import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { orders, orderItems, menuItems } from '@/lib/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';

// GET /api/analytics - получить статистику ресторана
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Только менеджер может смотреть аналитику
    if (session.user.role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || '7'; // дней
    const daysAgo = parseInt(period);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Общая статистика по завершённым заказам
    const completedOrders = await db.query.orders.findMany({
      where: and(
        eq(orders.restaurantId, session.user.restaurantId),
        eq(orders.status, 'completed'),
        sql`${orders.createdAt} >= ${startDate}`
      ),
    });

    // Подсчёт общих метрик
    const totalRevenue = completedOrders.reduce(
      (sum, order) => sum + parseFloat(order.total),
      0
    );
    const totalOrders = completedOrders.length;
    const averageCheck = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Активные заказы (не завершённые)
    const activeOrders = await db.query.orders.findMany({
      where: and(
        eq(orders.restaurantId, session.user.restaurantId),
        sql`${orders.status} != 'completed' AND ${orders.status} != 'cancelled'`
      ),
    });

    // Популярные блюда за период
    const popularItems = await db
      .select({
        menuItemId: orderItems.menuItemId,
        name: menuItems.name,
        totalQuantity: sql<number>`SUM(${orderItems.quantity})`,
        totalRevenue: sql<number>`SUM(${orderItems.quantity} * CAST(${orderItems.priceAtOrder} AS DECIMAL))`,
        orderCount: sql<number>`COUNT(DISTINCT ${orderItems.orderId})`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
      .where(
        and(
          eq(orders.restaurantId, session.user.restaurantId),
          eq(orders.status, 'completed'),
          sql`${orders.createdAt} >= ${startDate}`
        )
      )
      .groupBy(orderItems.menuItemId, menuItems.name)
      .orderBy(desc(sql`SUM(${orderItems.quantity})`))
      .limit(10);

    // Статистика по статусам активных заказов
    const ordersByStatus = {
      pending: activeOrders.filter((o) => o.status === 'pending').length,
      preparing: activeOrders.filter((o) => o.status === 'preparing').length,
      ready: activeOrders.filter((o) => o.status === 'ready').length,
    };

    return NextResponse.json({
      period: {
        days: daysAgo,
        startDate: startDate.toISOString(),
      },
      revenue: {
        total: totalRevenue.toFixed(2),
        ordersCount: totalOrders,
        averageCheck: averageCheck.toFixed(2),
      },
      activeOrders: {
        total: activeOrders.length,
        byStatus: ordersByStatus,
      },
      popularItems: popularItems.map((item) => ({
        id: item.menuItemId,
        name: item.name,
        totalQuantity: Number(item.totalQuantity),
        totalRevenue: Number(item.totalRevenue).toFixed(2),
        orderCount: Number(item.orderCount),
      })),
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
