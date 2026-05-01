import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { menuItems } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ restaurantId: string; itemId: string }> }
) {
  try {
    const session = await auth();
    const { restaurantId, itemId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Проверка роли
    if (!['kitchen_staff', 'manager', 'supervisor', 'admin'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    const body = await req.json();
    const { isActive } = body;

    // Обновить статус блюда
    await db
      .update(menuItems)
      .set({
        isAvailable: isActive,
        updatedAt: new Date(),
      })
      .where(eq(menuItems.id, itemId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Menu item update error:', error);
    return NextResponse.json(
      { error: 'Ошибка обновления блюда' },
      { status: 500 }
    );
  }
}
