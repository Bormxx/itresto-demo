import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, tables } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { sendNotification } from '@/lib/notifications';
import { updateClientLoyalty } from '@/lib/promotions';
import crypto from 'crypto';

/**
 * POST /api/payments/webhook/cloudpayments
 * Обработка уведомлений от CloudPayments
 * Документация: https://developers.cloudpayments.ru/#uvedomleniya
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // CloudPayments проверка подлинности через HMAC (опционально, если настроено)
    // const hmac = request.headers.get('content-hmac');
    // if (hmac && !verifyCloudPaymentsHMAC(body, hmac)) {
    //   return NextResponse.json({ code: 13 }); // Invalid signature
    // }

    // CloudPayments отправляет уведомления для разных событий
    // Нас интересует успешная оплата
    
    // Проверяем статус платежа
    if (body.Status !== 'Completed') {
      // Платёж не завершён успешно
      return NextResponse.json({ code: 0 }); // OK
    }

    // Извлекаем метаданные из JsonData
    let metadata: any = {};
    if (body.JsonData) {
      try {
        metadata = typeof body.JsonData === 'string' 
          ? JSON.parse(body.JsonData) 
          : body.JsonData;
      } catch (e) {
        console.error('[CloudPayments Webhook] Failed to parse JsonData:', e);
      }
    }

    const { 
      orderId, 
      orderIds, 
      orderNumber, 
      restaurantId, 
      tipAmount, 
      tipPercent,
      isSharedBill,
      tableNumber 
    } = metadata;

    if (!orderId || !restaurantId) {
      console.error('[CloudPayments Webhook] Missing orderId or restaurantId in metadata');
      return NextResponse.json({ code: 0 }); // OK но ничего не делаем
    }

    // Определяем список заказов для закрытия
    const orderIdsToClose = orderIds ? orderIds.split(',') : [orderId];
    
    // Получить все заказы
    const ordersToClose = await db.query.orders.findMany({
      where: inArray(orders.id, orderIdsToClose),
    });

    if (ordersToClose.length === 0) {
      console.error(`[CloudPayments Webhook] No orders found for IDs: ${orderIdsToClose}`);
      return NextResponse.json({ code: 0 });
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
          console.error('[CloudPayments Webhook] Error updating loyalty points:', error);
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
        amount: body.Amount || 0,
        tipAmount: parseFloat(tipAmount || '0'),
        tipPercent: parseFloat(tipPercent || '0'),
        orderCount: orderIdsToClose.length,
        message,
      },
    });

    // CloudPayments ожидает ответ { code: 0 } для успешной обработки
    return NextResponse.json({ code: 0 });
  } catch (error) {
    console.error('[CloudPayments Webhook] Error processing payment:', error);
    // Возвращаем code: 0 чтобы CloudPayments не повторял запрос
    return NextResponse.json({ code: 0 });
  }
}

/**
 * Проверка HMAC подписи от CloudPayments (опционально)
 */
function verifyCloudPaymentsHMAC(body: any, receivedHMAC: string): boolean {
  const secret = process.env.CLOUDPAYMENTS_WEBHOOK_SECRET;
  if (!secret) return true; // Если секрет не настроен, не проверяем

  const bodyString = JSON.stringify(body);
  const calculatedHMAC = crypto
    .createHmac('sha256', secret)
    .update(bodyString)
    .digest('base64');

  return calculatedHMAC === receivedHMAC;
}
