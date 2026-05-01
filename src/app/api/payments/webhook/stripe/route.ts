import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, tables } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { sendNotification } from '@/lib/notifications';
import { updateClientLoyalty } from '@/lib/promotions';
import crypto from 'crypto';

/**
 * POST /api/payments/webhook/stripe
 * Обработка уведомлений от Stripe
 * Документация: https://stripe.com/docs/webhooks
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    // Проверка подписи Stripe (обязательно для production)
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      const isValid = verifyStripeSignature(body, signature, webhookSecret);
      if (!isValid) {
        console.error('[Stripe Webhook] Invalid signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 400 }
        );
      }
    }

    const event = JSON.parse(body);

    // Stripe отправляет разные типы событий
    // Нас интересует успешная оплата checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      // Получить payment intent для доступа к метаданным
      const paymentIntentId = session.payment_intent;
      
      // В Stripe метаданные находятся в payment_intent.metadata
      // Но в webhook мы получаем только session, поэтому нужно сделать дополнительный запрос
      // Для упрощения, можем использовать client_reference_id в сессии
      const orderId = session.client_reference_id || session.metadata?.orderId;

      if (!orderId) {
        console.error('[Stripe Webhook] Missing orderId in session');
        return NextResponse.json({ received: true });
      }

      // Получить заказ для извлечения metadata
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
      });

      if (!order) {
        console.error(`[Stripe Webhook] Order not found: ${orderId}`);
        return NextResponse.json({ received: true });
      }

      // Для shared bill нужно получить все связанные заказы
      // Эту информацию можно было сохранить в metadata сессии
      // Пока обрабатываем только один заказ
      const orderIdsToClose = [orderId];
      const ordersToClose = [order];

      // Обновить статус оплаты
      await db
        .update(orders)
        .set({
          paymentStatus: 'paid',
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(inArray(orders.id, orderIdsToClose));

      // Обновить баллы лояльности
      if (order.clientId && order.loyaltyPointsEarned) {
        try {
          await updateClientLoyalty(
            order.restaurantId,
            order.clientId,
            order.loyaltyPointsEarned,
            parseFloat(order.total)
          );
        } catch (error) {
          console.error('[Stripe Webhook] Error updating loyalty points:', error);
        }
      }

      // Освободить столик
      if (order.tableId) {
        await db
          .update(tables)
          .set({ status: 'available' })
          .where(eq(tables.id, order.tableId));
      }

      // Отправить уведомление официанту
      const amountInCents = session.amount_total || 0;
      const amountInDollars = amountInCents / 100;

      sendNotification({
        type: 'payment_completed',
        restaurantId: order.restaurantId,
        role: 'waiter',
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          tableId: order.tableId,
          amount: amountInDollars,
          message: `Заказ ${order.orderNumber} оплачен ($${amountInDollars.toFixed(2)})`,
        },
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook] Error processing payment:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

/**
 * Проверка подписи Stripe webhook
 * Документация: https://stripe.com/docs/webhooks/signatures
 */
function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const signatureParts = signature.split(',');
    const timestamp = signatureParts
      .find(part => part.startsWith('t='))
      ?.split('=')[1];
    const receivedSignature = signatureParts
      .find(part => part.startsWith('v1='))
      ?.split('=')[1];

    if (!timestamp || !receivedSignature) {
      return false;
    }

    // Проверка timestamp (не более 5 минут назад)
    const currentTime = Math.floor(Date.now() / 1000);
    const timeDiff = currentTime - parseInt(timestamp);
    if (timeDiff > 300) {
      console.error('[Stripe] Webhook timestamp too old');
      return false;
    }

    // Вычислить ожидаемую подпись
    const signedPayload = `${timestamp}.${payload}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    return receivedSignature === expectedSignature;
  } catch (error) {
    console.error('[Stripe] Error verifying signature:', error);
    return false;
  }
}
