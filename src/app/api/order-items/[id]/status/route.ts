import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { orderItems, orders, tables } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { sendDishReadyNotification } from '@/lib/expo-notifications';
import { sendNotification } from '@/lib/notifications';

const updateStatusSchema = z.object({
  statusType: z.enum(['kitchen', 'bar']),
  status: z.enum(['pending', 'preparing', 'ready', 'delivered']),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Не авторизован' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateStatusSchema.parse(body);

    // Проверка прав доступа
    if (
      (validatedData.statusType === 'kitchen' && session.user.role !== 'kitchen_staff') ||
      (validatedData.statusType === 'bar' && session.user.role !== 'kitchen_staff')
    ) {
      return NextResponse.json(
        { success: false, error: 'Доступ запрещен' },
        { status: 403 }
      );
    }

    // Получить информацию о блюде для уведомления (до обновления статуса)
    const orderItem = await db.query.orderItems.findFirst({
      where: eq(orderItems.id, id),
      with: {
        menuItem: true,
        order: {
          with: {
            table: true,
          },
        },
      },
    });

    // Обновить статус
    const updateData =
      validatedData.statusType === 'kitchen'
        ? { kitchenStatus: validatedData.status }
        : { barStatus: validatedData.status };

    await db.update(orderItems).set(updateData).where(eq(orderItems.id, id));

    // Если статус стал "ready", отправить уведомление официантам
    if (validatedData.status === 'ready' && orderItem) {
      const tableNumber = orderItem.order?.table?.number || 'N/A';
      const dishName = orderItem.menuItem?.name || 'Блюдо';
      const restaurantId = session.user.restaurantId;

      // Отправить push-уведомление официантам (Expo для мобильного)
      sendDishReadyNotification({
        restaurantId,
        tableNumber,
        dishName,
        orderId: orderItem.order?.id,
      }).catch((error) => {
        console.error('[API] Error sending dish ready notification:', error);
      });

      // Отправить SSE уведомление для веб-версии
      sendNotification({
        type: 'order_ready',
        restaurantId,
        role: 'waiter',
        data: {
          tableNumber,
          dishName,
          orderId: orderItem.order?.id,
          message: `Готово: ${dishName} для стола ${tableNumber}`,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Неверные данные', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating order item status:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при обновлении статуса' },
      { status: 500 }
    );
  }
}
