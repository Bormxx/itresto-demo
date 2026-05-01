import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { orderItems, orderItemDeliveries, users, menuItems } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Проверяем роль (waiter, kitchen_staff могут просматривать)
    if (!['waiter', 'kitchen_staff', 'manager', 'supervisor'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    const { orderId } = await params;

    // Получаем все позиции заказа с информацией о заборе
    const items = await db
      .select({
        orderItemId: orderItems.id,
        quantity: orderItems.quantity,
        quantityDelivered: orderItems.quantityDelivered,
        menuItemName: menuItems.name,
        menuItemTranslations: menuItems.translations,
        deliveryId: orderItemDeliveries.id,
        deliveryQuantity: orderItemDeliveries.quantity,
        pickedUpAt: orderItemDeliveries.pickedUpAt,
        waiterId: users.id,
        waiterFirstName: users.firstName,
        waiterLastName: users.lastName,
      })
      .from(orderItems)
      .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
      .leftJoin(orderItemDeliveries, eq(orderItems.id, orderItemDeliveries.orderItemId))
      .leftJoin(users, eq(orderItemDeliveries.waiterId, users.id))
      .where(eq(orderItems.orderId, orderId));

    // Группируем результаты по позициям заказа
    const itemsMap = new Map();

    for (const item of items) {
      const key = item.orderItemId;
      
      if (!itemsMap.has(key)) {
        itemsMap.set(key, {
          orderItemId: item.orderItemId,
          menuItemName: item.menuItemName,
          menuItemTranslations: item.menuItemTranslations,
          quantity: item.quantity,
          quantityDelivered: item.quantityDelivered,
          deliveries: [],
        });
      }

      if (item.deliveryId) {
        itemsMap.get(key).deliveries.push({
          id: item.deliveryId,
          quantity: item.deliveryQuantity,
          pickedUpAt: item.pickedUpAt,
          waiter: {
            id: item.waiterId,
            firstName: item.waiterFirstName,
            lastName: item.waiterLastName,
          },
        });
      }
    }

    const result = Array.from(itemsMap.values());

    return NextResponse.json({ items: result });

  } catch (error) {
    console.error('Error fetching item deliveries:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
