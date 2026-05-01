import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { orders, users, orderItems, menuItems, tables } from '@/lib/db/schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !['supervisor', 'manager', 'owner', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const restaurantId = searchParams.get('restaurantId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const waiterId = searchParams.get('waiterId');
    const clientId = searchParams.get('clientId');

    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant ID required' }, { status: 400 });
    }

    // Build filters
    const filters = [eq(orders.restaurantId, restaurantId)];
    
    if (dateFrom) {
      filters.push(gte(orders.createdAt, new Date(dateFrom)));
    }
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      filters.push(lte(orders.createdAt, endDate));
    }
    if (waiterId) {
      filters.push(eq(orders.waiterId, waiterId));
    }
    if (clientId) {
      filters.push(eq(orders.clientId, clientId));
    }

    // Fetch orders with related data
    const ordersData = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        totalAmount: orders.total,
        discount: orders.discount,
        billType: orders.billType,
        status: orders.status,
        createdAt: orders.createdAt,
        completedAt: orders.completedAt,
        tableNumber: orders.tableNumber,
        waiterFirstName: users.firstName,
        waiterLastName: users.lastName,
        waiterId: orders.waiterId,
        clientId: orders.clientId,
        guestDeviceId: orders.guestDeviceId,
      })
      .from(orders)
      .leftJoin(users, eq(orders.waiterId, users.id))
      .where(and(...filters))
      .orderBy(desc(orders.createdAt));

    // Format orders with waiter name
    const formattedOrders = ordersData.map((order) => {
      const { waiterFirstName, waiterLastName, ...orderData } = order;
      return {
        ...orderData,
        waiterName: waiterFirstName
          ? `${waiterFirstName}${waiterLastName ? ' ' + waiterLastName : ''}`
          : null,
      };
    });

    // Get aggregated stats
    const stats = await db
      .select({
        totalOrders: sql<number>`COUNT(*)`,
        totalRevenue: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
        avgCheck: sql<number>`COALESCE(AVG(${orders.total}), 0)`,
        completedOrders: sql<number>`COUNT(CASE WHEN ${orders.status} = 'completed' THEN 1 END)`,
      })
      .from(orders)
      .where(and(...filters));

    // Get popular items
    const popularItems = await db
      .select({
        itemId: orderItems.menuItemId,
        itemName: menuItems.name,
        quantity: sql<number>`SUM(${orderItems.quantity})`,
        revenue: sql<number>`SUM(${orderItems.quantity} * ${orderItems.priceAtOrder})`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
      .where(and(...filters))
      .groupBy(orderItems.menuItemId, menuItems.name)
      .orderBy(desc(sql`SUM(${orderItems.quantity})`))
      .limit(5);

    return NextResponse.json({
      orders: formattedOrders,
      stats: stats[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        avgCheck: 0,
        completedOrders: 0,
      },
      popularItems,
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
