import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { orders, users, orderItems, menuItems, orderItemModifiers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !['supervisor', 'manager', 'owner', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Fetch order with basic info
    const orderData = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        totalAmount: orders.total,
        discount: orders.discount,
        billType: orders.billType,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        createdAt: orders.createdAt,
        completedAt: orders.completedAt,
        tableNumber: orders.tableNumber,
        waiterName: users.firstName,
        waiterLastName: users.lastName,
        clientId: orders.clientId,
        guestDeviceId: orders.guestDeviceId,
      })
      .from(orders)
      .leftJoin(users, eq(orders.waiterId, users.id))
      .where(eq(orders.id, id))
      .limit(1);

    if (!orderData.length) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orderData[0];

    // Fetch order items
    const items = await db
      .select({
        id: orderItems.id,
        name: menuItems.name,
        quantity: orderItems.quantity,
        price: orderItems.priceAtOrder,
      })
      .from(orderItems)
      .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
      .where(eq(orderItems.orderId, id));

    // Fetch modifiers for each item
    const itemsWithModifiers = await Promise.all(
      items.map(async (item) => {
        const itemModifiers = await db
          .select({
            name: menuItems.name,
            price: orderItemModifiers.priceModifier,
            modifierId: orderItemModifiers.modifierId,
          })
          .from(orderItemModifiers)
          .innerJoin(menuItems, eq(orderItemModifiers.modifierId, menuItems.id))
          .where(eq(orderItemModifiers.orderItemId, item.id));

        return {
          name: item.name,
          quantity: item.quantity,
          price: parseFloat(item.price),
          modifiers: itemModifiers.map((mod) => ({
            name: mod.name,
            price: parseFloat(mod.price),
          })),
        };
      })
    );

    const waiterName = order.waiterName
      ? `${order.waiterName}${order.waiterLastName ? ' ' + order.waiterLastName : ''}`
      : null;

    return NextResponse.json({
      id: order.id,
      orderNumber: order.orderNumber,
      totalAmount: parseFloat(order.totalAmount),
      discount: parseFloat(order.discount),
      billType: order.billType,
      status: order.status,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      completedAt: order.completedAt,
      tableNumber: order.tableNumber,
      waiterName,
      clientId: order.clientId,
      guestDeviceId: order.guestDeviceId,
      items: itemsWithModifiers,
    });
  } catch (error) {
    console.error('Error fetching order details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
