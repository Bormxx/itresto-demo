// Библиотека для отправки Web Push уведомлений
import webpush from 'web-push';

// VAPID ключи для Web Push (необходимо сгенерировать и добавить в .env)
// Генерация: npx web-push generate-vapid-keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@itresto.com';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );
}

interface PushSubscription {
  endpoint: string;
  p256dhKey: string;
  authKey: string;
}

interface NotificationPayload {
  title: string;
  body: string;
  tag?: string;
  data?: any;
  actions?: Array<{ action: string; title: string }>;
}

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: NotificationPayload
) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    throw new Error('VAPID keys are not configured. Please set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in .env');
  }

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dhKey,
      auth: subscription.authKey,
    },
  };

  const payloadString = JSON.stringify(payload);

  try {
    const result = await webpush.sendNotification(pushSubscription, payloadString);
    return result;
  } catch (error: any) {
    // Если получили 410 Gone, значит подписка больше не действительна
    if (error.statusCode === 410) {
      throw new Error('410: Subscription expired');
    }
    throw error;
  }
}

export function getVapidPublicKey() {
  return vapidPublicKey;
}

/**
 * Отправка push-уведомлений официантам (или другим ролям)
 */
export async function sendPushToWaiters(params: {
  restaurantId: string;
  tableNumber?: string | number;
  message: string;
  userRole?: string;
}) {
  const { db } = await import('@/lib/db');
  const { pushSubscriptions, users } = await import('@/lib/db/schema');
  const { eq, and } = await import('drizzle-orm');
  
  const { restaurantId, tableNumber, message, userRole = 'waiter' } = params;


  // Получаем всех пользователей с указанной ролью
  const targetUsers = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.restaurantId, restaurantId),
        eq(users.role, userRole as 'waiter' | 'kitchen_staff' | 'manager' | 'supervisor' | 'admin')
      )
    );


  if (targetUsers.length === 0) {
    return { success: true, sentCount: 0, message: 'No users found' };
  }

  // Получаем подписки для этих пользователей
  const userIds = targetUsers.map(u => u.id);
  const allSubscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.restaurantId, restaurantId));

  const filteredSubscriptions = allSubscriptions.filter(sub => userIds.includes(sub.userId));


  if (filteredSubscriptions.length === 0) {
    return { success: true, sentCount: 0, message: 'No active subscriptions' };
  }

  // Формируем уведомление
  const notificationTitle = tableNumber 
    ? `Вызов со стола ${tableNumber}`
    : 'Новое уведомление';

  const notificationData = {
    title: notificationTitle,
    body: message,
    tag: `table-${tableNumber}-${Date.now()}`,
    data: {
      url: `/${restaurantId}/waiter`,
      tableNumber,
      timestamp: Date.now(),
    },
    actions: [
      { action: 'open', title: 'Открыть' },
      { action: 'close', title: 'Закрыть' }
    ]
  };

  // Отправляем уведомления
  const results = await Promise.allSettled(
    filteredSubscriptions.map(async (subscription) => {
      try {
        await sendPushNotification(subscription, notificationData);
        return { success: true };
      } catch (error) {
        console.error(`   ❌ Ошибка отправки подписке ${subscription.id}:`, error);
        
        // Удаляем невалидные подписки
        if (error instanceof Error && error.message.includes('410')) {
          await db
            .delete(pushSubscriptions)
            .where(eq(pushSubscriptions.id, subscription.id));
        }
        
        return { success: false };
      }
    })
  );

  const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;


  return { 
    success: true, 
    sentCount: successCount,
    totalSubscriptions: filteredSubscriptions.length 
  };
}
