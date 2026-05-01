/**
 * Библиотека для отправки Expo Push Notifications
 */
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { db } from '@/lib/db';
import { expoPushTokens, users } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

const expo = new Expo();

interface SendPushToWaitersParams {
  restaurantId: string;
  tableNumber: number;
  message: string;
  userRole?: 'waiter' | 'manager' | 'supervisor';
}

/**
 * Отправить push-уведомления всем официантам ресторана
 */
export async function sendPushToWaiters({
  restaurantId,
  tableNumber,
  message,
  userRole = 'waiter',
}: SendPushToWaitersParams): Promise<{ success: boolean; sent: number }> {
  try {
    // Найти пользователей с нужной ролью
    const targetUsers = await db.query.users.findMany({
      where: and(
        eq(users.restaurantId, restaurantId),
        inArray(users.role, ['waiter', 'manager', 'supervisor'])
      ),
    });

    if (targetUsers.length === 0) {
      console.warn('No users found for restaurant:', restaurantId);
      return { success: false, sent: 0 };
    }

    const userIds = targetUsers.map((u) => u.id);

    // Получить все Expo Push Tokens этих пользователей
    const tokens = await db.query.expoPushTokens.findMany({
      where: and(
        eq(expoPushTokens.restaurantId, restaurantId),
        inArray(expoPushTokens.userId, userIds)
      ),
    });

    if (tokens.length === 0) {
      console.warn('No push tokens found for restaurant:', restaurantId);
      return { success: false, sent: 0 };
    }

    // Фильтровать только валидные Expo Push Tokens
    const pushTokens = tokens
      .map((t) => t.token)
      .filter((token) => Expo.isExpoPushToken(token));

    if (pushTokens.length === 0) {
      console.warn('No valid Expo push tokens found');
      return { success: false, sent: 0 };
    }

    // Создать сообщения
    const messages: ExpoPushMessage[] = pushTokens.map((pushToken) => ({
      to: pushToken,
      sound: 'default',
      title: `🔔 Стол ${tableNumber}`,
      body: message,
      data: {
        type: 'waiter_call',
        tableNumber,
        restaurantId,
        timestamp: new Date().toISOString(),
      },
      priority: 'high',
      channelId: 'waiter-calls',
    }));

    // Разбить на чанки (Expo рекомендует максимум 100 сообщений за раз)
    const chunks = expo.chunkPushNotifications(messages);
    let sentCount = 0;

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        
        // Подсчитать успешно отправленные
        sentCount += ticketChunk.filter((ticket) => ticket.status === 'ok').length;

        // Логировать ошибки
        ticketChunk.forEach((ticket, index) => {
          if (ticket.status === 'error') {
            console.error(
              `Error sending push notification to token ${chunk[index].to}:`,
              ticket.message
            );
          }
        });
      } catch (error) {
        console.error('Error sending push notification chunk:', error);
      }
    }

    return { success: sentCount > 0, sent: sentCount };
  } catch (error) {
    console.error('Error in sendPushToWaiters:', error);
    return { success: false, sent: 0 };
  }
}

/**
 * Отправить тестовое push-уведомление на конкретный токен
 */
export async function sendTestPush(pushToken: string): Promise<boolean> {
  try {
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error('Invalid Expo push token:', pushToken);
      return false;
    }

    const message: ExpoPushMessage = {
      to: pushToken,
      sound: 'default',
      title: 'Тестовое уведомление',
      body: 'Это тестовое push-уведомление от ITResto',
      data: { type: 'test' },
    };

    const tickets = await expo.sendPushNotificationsAsync([message]);
    return tickets[0]?.status === 'ok';
  } catch (error) {
    console.error('Error sending test push:', error);
    return false;
  }
}

/**
 * Отправить уведомление о готовом блюде официантам
 */
export async function sendDishReadyNotification(params: {
  restaurantId: string;
  tableNumber: string | number;
  dishName: string;
  orderId?: string;
}): Promise<{ success: boolean; sent: number }> {
  try {
    const { restaurantId, tableNumber, dishName, orderId } = params;

    // Найти всех официантов, менеджеров и супервайзеров ресторана
    const targetUsers = await db.query.users.findMany({
      where: and(
        eq(users.restaurantId, restaurantId),
        inArray(users.role, ['waiter', 'manager', 'supervisor'])
      ),
    });

    if (targetUsers.length === 0) {
      console.warn('[Expo] No users found for restaurant:', restaurantId);
      return { success: false, sent: 0 };
    }

    const userIds = targetUsers.map((u) => u.id);

    // Получить все Expo Push Tokens этих пользователей
    const tokens = await db.query.expoPushTokens.findMany({
      where: and(
        eq(expoPushTokens.restaurantId, restaurantId),
        inArray(expoPushTokens.userId, userIds)
      ),
    });

    if (tokens.length === 0) {
      console.warn('[Expo] No push tokens found for restaurant:', restaurantId);
      return { success: false, sent: 0 };
    }

    // Фильтровать только валидные Expo Push Tokens
    const pushTokens = tokens
      .map((t) => t.token)
      .filter((token) => Expo.isExpoPushToken(token));

    if (pushTokens.length === 0) {
      console.warn('[Expo] No valid Expo push tokens found');
      return { success: false, sent: 0 };
    }

    // Создать сообщения
    const messages: ExpoPushMessage[] = pushTokens.map((pushToken) => ({
      to: pushToken,
      sound: 'default',
      title: `✅ Блюдо готово - Стол ${tableNumber}`,
      body: `Готово: ${dishName}`,
      data: {
        type: 'dish_ready',
        tableNumber,
        dishName,
        restaurantId,
        orderId,
        timestamp: new Date().toISOString(),
      },
      priority: 'high',
      channelId: 'dish-ready',
    }));

    // Разбить на чанки
    const chunks = expo.chunkPushNotifications(messages);
    let sentCount = 0;

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        
        // Подсчитать успешно отправленные
        sentCount += ticketChunk.filter((ticket) => ticket.status === 'ok').length;

        // Логировать ошибки
        ticketChunk.forEach((ticket, index) => {
          if (ticket.status === 'error') {
            console.error(
              `[Expo] Error sending push notification to token ${chunk[index].to}:`,
              ticket.message
            );
          }
        });
      } catch (error) {
        console.error('[Expo] Error sending push notification chunk:', error);
      }
    }

    return { success: sentCount > 0, sent: sentCount };
  } catch (error) {
    console.error('[Expo] Error in sendDishReadyNotification:', error);
    return { success: false, sent: 0 };
  }
}
