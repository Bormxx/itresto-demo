import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Загружаем заказ со всеми деталями
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
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
        orderItems: {
          with: {
            menuItem: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Заказ не найден' },
        { status: 404 }
      );
    }

    // Форматируем данные для клиента
    const formattedOrder = {
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
      items: order.orderItems.map(item => ({
        id: item.id,
        name: item.menuItem?.name || 'Unknown',
        quantity: item.quantity,
        price: item.priceAtOrder,
        total: (parseFloat(item.priceAtOrder) * item.quantity).toFixed(2),
      })),
    };

    return NextResponse.json(formattedOrder);
  } catch (error) {
    console.error('Error fetching order details:', error);
    return NextResponse.json(
      { error: 'Ошибка при загрузке деталей заказа' },
      { status: 500 }
    );
  }
}
