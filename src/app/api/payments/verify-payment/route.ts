import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, paymentSettings, tables } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { decrypt } from '@/lib/encryption';
import { createCloudPaymentsClient } from '@/lib/payments/cloudpayments';
import { createStripeClient } from '@/lib/payments/stripe';
import { sendNotification } from '@/lib/notifications';
import { updateClientLoyalty } from '@/lib/promotions';

/**
 * POST /api/payments/verify-payment
 * Проверка статуса платежа через API платёжной системы (fallback если webhook не пришёл)
 */
export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: 'orderId обязателен' },
        { status: 400 }
      );
    }

    // Получить заказ
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        restaurant: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Заказ не найден' },
        { status: 404 }
      );
    }

    // Если заказ уже оплачен, возвращаем успех
    if (order.paymentStatus === 'paid') {
      return NextResponse.json({
        success: true,
        status: 'paid',
        message: 'Заказ уже оплачен',
      });
    }

    // Если нет paymentId, значит платёж не был создан
    if (!order.paymentId || !order.paymentProvider) {
      return NextResponse.json(
        { error: 'Платёж не был инициирован' },
        { status: 400 }
      );
    }

    // Получить настройки платежей ресторана
    const settings = await db.query.paymentSettings.findFirst({
      where: eq(paymentSettings.restaurantId, order.restaurantId),
    });

    if (!settings || !settings.publicKey || !settings.secretKey) {
      return NextResponse.json(
        { error: 'Настройки платежей не найдены' },
        { status: 400 }
      );
    }

    // Расшифровать секретный ключ
    const secretKey = decrypt(settings.secretKey);

    // Проверить статус платежа через API платёжной системы
    let isPaid = false;
    let paymentAmount = 0;

    if (order.paymentProvider === 'cloudpayments') {
      const client = createCloudPaymentsClient(settings.publicKey, secretKey);
      
      try {
        const paymentStatus = await client.getPaymentStatus(parseInt(order.paymentId));
        
        // CloudPayments статусы: Completed, Authorized, Cancelled, Declined
        if (paymentStatus.Status === 'Completed') {
          isPaid = true;
          paymentAmount = paymentStatus.Amount;
        }
      } catch (error) {
        console.error('[Verify Payment] CloudPayments API error:', error);
        return NextResponse.json(
          { error: 'Ошибка проверки статуса платежа' },
          { status: 500 }
        );
      }
    } 
    
    else if (order.paymentProvider === 'stripe') {
      const client = createStripeClient(settings.publicKey, secretKey);
      
      try {
        const session = await client.getSession(order.paymentId);
        
        // Stripe session.payment_status: paid, unpaid, no_payment_required
        if (session.payment_status === 'paid') {
          isPaid = true;
          paymentAmount = session.amount_total / 100; // Конвертируем из центов
        }
      } catch (error) {
        console.error('[Verify Payment] Stripe API error:', error);
        return NextResponse.json(
          { error: 'Ошибка проверки статуса платежа' },
          { status: 500 }
        );
      }
    }

    // Если не оплачен, возвращаем статус
    if (!isPaid) {
      return NextResponse.json({
        success: false,
        status: 'pending',
        message: 'Платёж ещё не завершён',
      });
    }

    // ПЛАТЁЖ УСПЕШЕН - закрываем заказ (то же самое что делает webhook)
    
    // Определяем список заказов для закрытия (для shared bills)
    const orderIdsToClose = [orderId]; // TODO: добавить поддержку shared bills если нужно
    
    // Обновить статус оплаты
    await db
      .update(orders)
      .set({
        paymentStatus: 'paid',
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

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
        console.error('[Verify Payment] Error updating loyalty points:', error);
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
    sendNotification({
      type: 'payment_completed',
      restaurantId: order.restaurantId,
      role: 'waiter',
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        tableId: order.tableId,
        amount: paymentAmount,
        tipAmount: parseFloat(order.tipAmount || '0'),
        tipPercent: order.tipPercent || 0,
        message: `Заказ ${order.orderNumber} оплачен (проверено через API)`,
      },
    });

    return NextResponse.json({
      success: true,
      status: 'paid',
      message: 'Заказ успешно оплачен и закрыт',
    });
  } catch (error) {
    console.error('[Verify Payment] Error:', error);
    return NextResponse.json(
      { error: 'Ошибка при проверке платежа' },
      { status: 500 }
    );
  }
}
