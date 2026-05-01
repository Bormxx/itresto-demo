import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { orderItems } from '@/lib/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { z } from 'zod';

const deliverItemSchema = z.object({
  itemIds: z.array(z.string().uuid()).min(1),
});

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const validatedData = deliverItemSchema.parse(body);

    // Обновить статусы на delivered для всех позиций
    for (const itemId of validatedData.itemIds) {
      const item = await db.query.orderItems.findFirst({
        where: eq(orderItems.id, itemId),
        with: {
          menuItem: {
            with: {
              prepDepartment: true,
            },
          },
        },
      });

      if (!item) continue;

      const updateData: any = {};
      const deptName = item.menuItem?.prepDepartment?.name;

      // Определить какой статус обновлять в зависимости от отдела приготовления
      if (deptName === 'Бар') {
        if (item.barStatus === 'ready') {
          updateData.barStatus = 'delivered';
        }
      } else if (deptName) {
        // Кухня или другой отдел приготовления
        if (item.kitchenStatus === 'ready') {
          updateData.kitchenStatus = 'delivered';
        }
      }

      // Обновить общий статус позиции
      updateData.status = 'delivered';

      if (Object.keys(updateData).length > 0) {
        await db.update(orderItems).set(updateData).where(eq(orderItems.id, itemId));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Неверные данные', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error delivering items:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при обновлении статуса' },
      { status: 500 }
    );
  }
}
