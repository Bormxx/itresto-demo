import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { orders, orderItems } from '@/lib/db/schema';
import { eq, gte, lte, and, sum, count } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Проверка роли
    if (!['manager', 'supervisor', 'admin'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Подсчитать количество заказов и общую сумму
    const ordersData = await db
      .select({
        count: count(),
        total: sum(orders.total),
      })
      .from(orders)
      .where(
        and(
          dateFrom ? gte(orders.createdAt, new Date(dateFrom)) : undefined,
          dateTo ? lte(orders.createdAt, new Date(dateTo)) : undefined
        )
      );

    return NextResponse.json({
      count: ordersData[0]?.count || 0,
      total: ordersData[0]?.total || '0',
    });
  } catch (error) {
    console.error('Orders report error:', error);
    return NextResponse.json(
      { error: 'Ошибка генерации отчета по заказам' },
      { status: 500 }
    );
  }
}
