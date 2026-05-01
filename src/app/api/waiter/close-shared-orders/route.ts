import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { eq, inArray, and } from 'drizzle-orm';

/**
 * POST /api/waiter/close-shared-orders
 * Закрывает все совместные заказы стола одновременно
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || (session.user.role !== 'waiter' && session.user.role !== 'manager' && session.user.role !== 'supervisor')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { orderIds } = body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { error: 'Order IDs are required' },
        { status: 400 }
      );
    }

    // Проверяем что все заказы имеют тип shared
    const ordersToClose = await db.query.orders.findMany({
      where: and(
        inArray(orders.id, orderIds),
        eq(orders.billType, 'shared')
      ),
    });

    if (ordersToClose.length !== orderIds.length) {
      return NextResponse.json(
        { error: 'Some orders are not shared orders' },
        { status: 400 }
      );
    }

    // Закрываем все заказы
    await db
      .update(orders)
      .set({ 
        status: 'completed',
        completedAt: new Date(),
      })
      .where(inArray(orders.id, orderIds));

    return NextResponse.json({ 
      success: true,
      closedOrdersCount: orderIds.length,
    }, { status: 200 });

  } catch (error) {
    console.error('Close shared orders error:', error);
    return NextResponse.json(
      { error: 'Failed to close orders' },
      { status: 500 }
    );
  }
}
