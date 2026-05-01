import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { orders, guestDevices, orderItems, menuItems } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * POST /api/guest/link-account
 * Связывает гостевой deviceUuid с авторизованным userId
 * Переносит активные заказы на авторизованного пользователя
 * Пересчитывает цены с учетом лояльности
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { deviceUuid } = body;

    if (!deviceUuid) {
      return NextResponse.json(
        { error: 'deviceUuid is required' },
        { status: 400 }
      );
    }

    // Найти guestDevice
    const guestDevice = await db.query.guestDevices.findFirst({
      where: eq(guestDevices.deviceUuid, deviceUuid),
    });

    if (!guestDevice) {
      return NextResponse.json(
        { error: 'Guest device not found' },
        { status: 404 }
      );
    }

    // Установить linkedClientId
    await db.update(guestDevices)
      .set({ 
        linkedClientId: session.user.id,
        linkedAt: new Date(),
      })
      .where(eq(guestDevices.id, guestDevice.id));

    // Найти активные заказы гостя
    const activeOrders = await db.query.orders.findMany({
      where: and(
        eq(orders.guestDeviceId, guestDevice.id),
        eq(orders.status, 'pending')
      ),
      with: {
        orderItems: {
          with: {
            menuItem: true,
          },
        },
      },
    });

    if (activeOrders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Account linked, no active orders to transfer',
        ordersTransferred: 0,
      });
    }

    // Получить информацию о лояльности клиента (если есть)
    const clientLoyalty = await db.query.clientLoyalty.findFirst({
      where: eq(db.query.clientLoyalty.clientId, session.user.id),
    });

    const discountPercent = clientLoyalty?.discountPercent || 0;

    // Перенести заказы на clientId и пересчитать цены
    for (const order of activeOrders) {
      let newSubtotal = 0;

      // Пересчитать цену каждого item с учетом скидки
      for (const item of order.orderItems) {
        const originalPrice = Number(item.menuItem.price);
        const discountedPrice = discountPercent > 0
          ? originalPrice * (1 - discountPercent / 100)
          : originalPrice;
        
        const itemTotal = discountedPrice * item.quantity;
        newSubtotal += itemTotal;

        // Обновить priceAtOrder для item
        await db.update(orderItems)
          .set({ priceAtOrder: discountedPrice.toFixed(2) })
          .where(eq(orderItems.id, item.id));
      }

      const discount = Number(order.subtotal) - newSubtotal;
      
      // Обновить заказ: перенести на clientId и пересчитать суммы
      await db.update(orders)
        .set({
          clientId: session.user.id,
          guestDeviceId: null,
          subtotal: newSubtotal.toFixed(2),
          discount: discount.toFixed(2),
          total: newSubtotal.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id));
    }

    return NextResponse.json({
      success: true,
      message: 'Account linked and orders transferred',
      ordersTransferred: activeOrders.length,
      discountApplied: discountPercent > 0,
      discountPercent,
    });

  } catch (error) {
    console.error('Link account error:', error);
    return NextResponse.json(
      { error: 'Failed to link account' },
      { status: 500 }
    );
  }
}
