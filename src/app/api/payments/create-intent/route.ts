import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { orders, paymentSettings } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { decrypt } from '@/lib/encryption';
import { createCloudPaymentsClient } from '@/lib/payments/cloudpayments';
import { createStripeClient } from '@/lib/payments/stripe';

const createPaymentIntentSchema = z.object({
  orderId: z.string().uuid(),
  tipPercent: z.number().min(0).max(100).default(0),
  isSharedBill: z.boolean().optional().default(false),
  tableNumber: z.string().optional(),
});

// POST /api/payments/create-intent - создание платежа через ЮKassa
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { orderId, tipPercent, isSharedBill, tableNumber } = createPaymentIntentSchema.parse(body);

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

    // Для совместного счёта получаем все заказы стола
    let orderIds = [orderId];
    let orderTotal = parseFloat(order.total);
    
    if (isSharedBill && tableNumber) {
      const tableOrders = await db.query.orders.findMany({
        where: and(
          eq(orders.tableNumber, tableNumber),
          eq(orders.billType, 'shared'),
          eq(orders.status, 'pending')
        ),
      });

      // Проверяем, что все заказы не оплачены
      const alreadyPaid = tableOrders.some(o => o.paymentStatus === 'paid');
      if (alreadyPaid) {
        return NextResponse.json(
          { error: 'Счёт уже оплачен' },
          { status: 400 }
        );
      }

      // Суммируем все заказы стола
      orderIds = tableOrders.map(o => o.id);
      orderTotal = tableOrders.reduce((sum, o) => sum + parseFloat(o.total), 0);
    } else {
      // Проверить, что заказ не оплачен
      if (order.paymentStatus === 'paid') {
        return NextResponse.json(
          { error: 'Заказ уже оплачен' },
          { status: 400 }
        );
      }
    }

    // Подсчитать общую сумму с чаевыми
    const tipAmount = (orderTotal * tipPercent) / 100;
    const totalAmount = orderTotal + tipAmount;

    // Получить настройки платежей ресторана
    const settings = await db.query.paymentSettings.findFirst({
      where: eq(paymentSettings.restaurantId, order.restaurantId),
    });

    if (!settings || !settings.publicKey || !settings.secretKey) {
      return NextResponse.json(
        { error: 'Платёжная система не настроена. Обратитесь к администратору.' },
        { status: 400 }
      );
    }

    // Расшифровать секретный ключ
    let secretKey: string;
    try {
      secretKey = decrypt(settings.secretKey);
    } catch (error) {
      console.error('Failed to decrypt secret key:', error);
      return NextResponse.json(
        { error: 'Ошибка настроек платёжной системы' },
        { status: 500 }
      );
    }

    // Определить провайдера платежей
    const paymentProvider = process.env.PAYMENT_PROVIDER || 'cloudpayments';
    const returnUrl = `${process.env.NEXTAUTH_URL}/payment-success?orderId=${orderId}`;

    // Метаданные платежа
    const metadata = {
      orderId: order.id,
      orderIds: orderIds.join(','),
      orderNumber: order.orderNumber || '',
      restaurantId: order.restaurantId,
      orderTotal: orderTotal.toFixed(2),
      tipAmount: tipAmount.toFixed(2),
      tipPercent: tipPercent.toString(),
      isSharedBill: isSharedBill.toString(),
      tableNumber: tableNumber || '',
    };

    const description = isSharedBill 
      ? `Совместный счёт - Стол ${tableNumber} - ${order.restaurant?.name || 'Ресторан'}` 
      : `Заказ ${order.orderNumber} - ${order.restaurant?.name || 'Ресторан'}`;

    // Создать платёж через соответствующий провайдер
    if (paymentProvider === 'cloudpayments') {
      const client = createCloudPaymentsClient(settings.publicKey, secretKey);
      
      const payment = await client.createPayment({
        amount: totalAmount,
        currency: 'RUB',
        description,
        invoiceId: orderId,
        accountId: session.user.id,
        email: session.user.email || undefined,
        returnUrl,
        metadata,
      });

      if (!payment.success || !payment.model) {
        return NextResponse.json(
          { error: payment.message || 'Ошибка создания платежа' },
          { status: 500 }
        );
      }

      // Сохранить paymentId в заказ для последующей проверки
      await db
        .update(orders)
        .set({
          paymentId: payment.model.transactionId.toString(),
          paymentProvider: 'cloudpayments',
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));

      return NextResponse.json({
        confirmationUrl: payment.model.paymentUrl,
        paymentId: payment.model.transactionId.toString(),
        amount: totalAmount,
        tipAmount,
        provider: 'cloudpayments',
      });
    } 
    
    else if (paymentProvider === 'stripe') {
      const client = createStripeClient(settings.publicKey, secretKey);
      
      const payment = await client.createPayment({
        amount: totalAmount,
        currency: 'USD',
        description,
        orderId,
        customerEmail: session.user.email || undefined,
        returnUrl,
        metadata,
      });

      if (!payment.success || !payment.model) {
        return NextResponse.json(
          { error: payment.message || 'Ошибка создания платежа' },
          { status: 500 }
        );
      }

      // Сохранить paymentId в заказ для последующей проверки
      await db
        .update(orders)
        .set({
          paymentId: payment.model.sessionId,
          paymentProvider: 'stripe',
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));

      return NextResponse.json({
        confirmationUrl: payment.model.paymentUrl,
        paymentId: payment.model.sessionId,
        amount: totalAmount,
        tipAmount,
        provider: 'stripe',
      });
    }

    return NextResponse.json(
      { error: 'Неизвестный платёжный провайдер' },
      { status: 500 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Неверные данные', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating payment:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании платежа' },
      { status: 500 }
    );
  }
}
