import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { orderItems, orderItemDeliveries } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { z } from 'zod';

const pickItemsSchema = z.object({
  items: z.array(z.object({
    orderItemId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Проверяем роль официанта
    if (session.user.role !== 'waiter') {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    const body = await request.json();
    const validation = pickItemsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Неверные данные', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { items } = validation.data;
    const waiterId = session.user.id;

    // Обрабатываем каждую позицию
    const results = [];
    
    for (const item of items) {
      const { orderItemId, quantity } = item;

      // Получаем информацию о позиции заказа с данными о блюде
      const [orderItem] = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.id, orderItemId));

      if (!orderItem) {
        return NextResponse.json(
          { error: `Позиция заказа ${orderItemId} не найдена` },
          { status: 404 }
        );
      }

      // Получаем информацию о блюде для определения отдела приготовления
      const orderItemWithMenu = await db.query.orderItems.findFirst({
        where: eq(orderItems.id, orderItemId),
        with: {
          menuItem: {
            with: {
              prepDepartment: true,
            },
          },
        },
      });

      // Проверяем, сколько уже забрано
      const deliveredResult = await db
        .select({ 
          total: sql<number>`COALESCE(SUM(${orderItemDeliveries.quantity}), 0)` 
        })
        .from(orderItemDeliveries)
        .where(eq(orderItemDeliveries.orderItemId, orderItemId));

      const alreadyDelivered = Number(deliveredResult[0]?.total || 0);
      const remaining = orderItem.quantity - alreadyDelivered;

      // Проверяем, что не пытаемся забрать больше, чем осталось
      if (quantity > remaining) {
        return NextResponse.json(
          { 
            error: `Нельзя забрать ${quantity} шт. из позиции ${orderItemId}. Доступно только ${remaining} шт.` 
          },
          { status: 400 }
        );
      }

      // Создаем запись о заборе
      const [delivery] = await db
        .insert(orderItemDeliveries)
        .values({
          orderItemId,
          waiterId,
          quantity,
        })
        .returning();

      results.push(delivery);

      // Проверяем, полностью ли доставлена позиция
      const newQuantityDelivered = alreadyDelivered + quantity;
      const isFullyDelivered = newQuantityDelivered >= orderItem.quantity;

      // Определяем, какие статусы нужно обновить
      const deptName = orderItemWithMenu?.menuItem?.prepDepartment?.name;
      const updates: any = { 
        quantityDelivered: newQuantityDelivered,
        updatedAt: new Date(),
      };

      // Если полностью доставлено - обновить статусы на delivered
      if (isFullyDelivered) {
        if (deptName === 'Бар') {
          updates.barStatus = 'delivered';
        } else {
          // По умолчанию (для "Кухня" и других отделов) используем kitchenStatus
          updates.kitchenStatus = 'delivered';
        }
        updates.status = 'delivered';
      }

      // Обновляем позицию заказа
      await db
        .update(orderItems)
        .set(updates)
        .where(eq(orderItems.id, orderItemId));
    }

    return NextResponse.json({ 
      success: true, 
      deliveries: results 
    });

  } catch (error) {
    console.error('Error picking items:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
