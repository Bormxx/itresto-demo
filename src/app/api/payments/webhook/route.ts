import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, tables } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { sendNotification } from '@/lib/notifications';
import { updateClientLoyalty } from '@/lib/promotions';

// POST /api/payments/webhook - обработка уведомлений от ЮKassa
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // ЮKassa отправляет event в поле "event"
    const eventType = body.event;
    
    // Обработка события payment.succeeded
    if (eventType === 'payment.succeeded') {
      const payment = body.object;
      const { 
        orderId, 
        orderIds, 
        orderNumber, 
        restaurantId, 
        tipAmount, 
        tipPercent,
        isSharedBill,
        tableNumber 
      } = payment.metadata;

      // Определяем список заказов для закрытия
      const orderIdsToClose = orderIds ? orderIds.split(',') : [orderId];
      
      // Получить все заказы
      const ordersToClose = await db.query.orders.findMany({
        where: inArray(orders.id, orderIdsToClose),
      });

      if (ordersToClose.length === 0) {
        console.error(`[Webhook] No orders found for IDs: ${orderIdsToClose}`);
        return NextResponse.json({ received: true });
      }

      // Обновить статус оплаты всех заказов
      await db
        .update(orders)
        .set({
          paymentStatus: 'paid',
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(inArray(orders.id, orderIdsToClose));

      // Обновить баллы лояльности для авторизованных клиентов
      for (const order of ordersToClose) {
        if (order.clientId && order.loyaltyPointsEarned) {
          try {
            await updateClientLoyalty(
              order.restaurantId,
              order.clientId,
              order.loyaltyPointsEarned,
              parseFloat(order.total)
            );
          } catch (error) {
            console.error('[Webhook] Error updating loyalty points:', error);
            // Не прерываем обработку платежа из-за ошибки в лояльности
          }
        }
      }

      // Освободить столики (если есть)
      const tableIds = ordersToClose
        .map(o => o.tableId)
        .filter((id): id is string => id !== null);
      
      if (tableIds.length > 0) {
        await db
          .update(tables)
          .set({ status: 'available' })
          .where(inArray(tables.id, tableIds));
      }

      // Отправить уведомление официанту об оплате
      const message = isSharedBill === 'true'
        ? `Совместный счёт стола ${tableNumber} оплачен (${orderIdsToClose.length} заказов)${tipAmount ? ` с чаевыми ${tipAmount} ₽` : ''}`
        : `Заказ ${orderNumber} оплачен${tipAmount ? ` с чаевыми ${tipAmount} ₽` : ''}`;

      sendNotification({
        type: 'payment_completed',
        restaurantId,
        role: 'waiter',
        data: {
          orderId,
          orderNumber,
          tableId: ordersToClose[0].tableId,
          amount: parseFloat(payment.amount.value),
          tipAmount: parseFloat(tipAmount || '0'),
          tipPercent: parseFloat(tipPercent || '0'),
          orderCount: orderIdsToClose.length,
          message,
        },
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Webhook] Error processing payment:', error);
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    );
  }
}
