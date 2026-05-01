import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { orders, tables, menuItems } from '@/lib/db/schema';
import { eq, and, notInArray } from 'drizzle-orm';

// POST /api/orders/[id]/complete - завершить заказ и освободить стол
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Только официант или менеджер могут закрывать заказы
    if (session.user.role !== 'waiter' && session.user.role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const orderId = id;

    // Получаем заказ с позициями и связанными блюдами
    const order = await db.query.orders.findFirst({
      where: and(
        eq(orders.id, orderId),
        eq(orders.restaurantId, session.user.restaurantId)
      ),
      with: {
        orderItems: {
          with: {
            menuItem: {
              with: {
                prepDepartment: true,
              },
            },
          },
        },
        table: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status === 'completed' || order.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Order is already completed or cancelled' },
        { status: 400 }
      );
    }

    // Проверяем, что все позиции доставлены
    const allDelivered = order.orderItems.every((item) => {
      const deptName = item.menuItem?.prepDepartment?.name;
      if (deptName === 'Бар') {
        return item.barStatus === 'delivered';
      } else if (deptName) {
        // Кухня или другой отдел приготовления
        return item.kitchenStatus === 'delivered';
      }
      // Если нет отдела приготовления, считаем доставленным
      return true;
    });

    if (!allDelivered) {
      return NextResponse.json(
        { error: 'Cannot complete order: not all items are delivered' },
        { status: 400 }
      );
    }

    // Обновляем статус заказа
    await db
      .update(orders)
      .set({ status: 'completed' })
      .where(eq(orders.id, orderId));

    // Освобождаем стол и сбрасываем PIN если это последний заказ
    if (order.tableId) {
      // Проверяем, есть ли другие активные заказы за этим столиком
      const otherActiveOrders = await db.query.orders.findMany({
        where: and(
          eq(orders.tableId, order.tableId),
          eq(orders.restaurantId, session.user.restaurantId),
          notInArray(orders.status, ['completed', 'cancelled'])
        ),
      });

      // Если других активных заказов нет, освобождаем стол и сбрасываем PIN
      if (otherActiveOrders.length === 0) {
        await db
          .update(tables)
          .set({ 
            status: 'available',
            pin: null // Сбрасываем PIN когда стол освобождается
          })
          .where(eq(tables.id, order.tableId));
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Order completed and table is now available',
    });
  } catch (error) {
    console.error('Error completing order:', error);
    return NextResponse.json(
      { error: 'Failed to complete order' },
      { status: 500 }
    );
  }
}
