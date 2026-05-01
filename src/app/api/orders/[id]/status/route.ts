import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/orders/[id]/status
 * Получить текущий статус заказа (для polling на странице payment-success)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      columns: {
        id: true,
        status: true,
        paymentStatus: true,
        completedAt: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Заказ не найден' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      orderId: order.id,
      status: order.status,
      paymentStatus: order.paymentStatus,
      isPaid: order.paymentStatus === 'paid',
      isCompleted: order.status === 'completed',
      completedAt: order.completedAt,
    });
  } catch (error) {
    console.error('[Order Status] Error:', error);
    return NextResponse.json(
      { error: 'Ошибка получения статуса заказа' },
      { status: 500 }
    );
  }
}
