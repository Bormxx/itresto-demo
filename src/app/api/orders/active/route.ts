import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { orders, orderItems } from '@/lib/db/schema';
import { eq, and, inArray, or, notInArray } from 'drizzle-orm';

// GET /api/orders/active - получить активные заказы клиента
export async function GET(req: Request) {
  try {
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const tableId = searchParams.get('tableId');
    const orderIds = searchParams.get('orderIds'); // Для неавторизованных клиентов
    const tableNumber = searchParams.get('tableNumber'); // Номер стола для совместного счёта
    const deviceUuid = searchParams.get('deviceUuid'); // UUID устройства клиента

    // Для клиентов с orderIds из localStorage (как авторизованных, так и неавторизованных)
    if (orderIds) {
      const orderIdArray = orderIds.split(',').filter(Boolean);
      
      if (orderIdArray.length === 0) {
        return NextResponse.json({ orders: [] }, { status: 200 });
      }

      // Получаем заказ клиента (все активные, кроме completed и cancelled)
      const myOrders = await db.query.orders.findMany({
        where: and(
          inArray(orders.id, orderIdArray),
          notInArray(orders.status, ['completed', 'cancelled'])
        ),
        with: {
          orderItems: {
            with: {
              menuItem: true,
              modifiers: {
                with: {
                  modifier: true,
                },
              },
            },
          },
          guestDevice: true, // Добавляем связь с guestDevice
        },
        orderBy: (orders, { desc }) => [desc(orders.createdAt)],
      });
      
      // Фильтруем заказы:
      // - Для авторизованных (session.user) - по client_id
      // - Для гостей (deviceUuid) - по guest_device_id через deviceUuid
      let filteredMyOrders;
      if (session?.user) {
        // Авторизованный пользователь - фильтруем по client_id
        filteredMyOrders = myOrders.filter(order => order.clientId === session.user.id);
      } else if (deviceUuid) {
        // Гость - фильтруем по deviceUuid
        filteredMyOrders = myOrders.filter(order => order.guestDevice?.deviceUuid === deviceUuid);
      } else {
        filteredMyOrders = myOrders;
      }

      // Для отображения всех заказов стола (только для просмотра, не для корзины)
      // Возвращаем все заказы стола, но помечаем какие принадлежат текущему пользователю
      let allTableOrders = filteredMyOrders;
      if (filteredMyOrders.length > 0 && filteredMyOrders[0].billType === 'shared' && tableNumber) {
        const tableOrders = await db.query.orders.findMany({
          where: and(
            eq(orders.tableNumber, tableNumber),
            eq(orders.billType, 'shared'),
            notInArray(orders.status, ['completed', 'cancelled'])
          ),
          with: {
            orderItems: {
              with: {
                menuItem: true,
                modifiers: {
                  with: {
                    modifier: true,
                  },
                },
              },
            },
            guestDevice: true, // Добавляем связь с guestDevice
          },
          orderBy: (orders, { desc }) => [desc(orders.createdAt)],
        });
        
        allTableOrders = tableOrders;
      }

      // Преобразуем заказы, добавляя deviceUuid из guestDevice
      const ordersWithDeviceUuid = allTableOrders.map(order => ({
        ...order,
        deviceUuid: order.guestDevice?.deviceUuid || null,
        guestDevice: undefined, // Убираем из ответа, чтобы не передавать лишнее
      }));

      // Определяем идентификатор текущего пользователя
      const currentUserId = session?.user?.id || deviceUuid;

      return NextResponse.json({ 
        orders: ordersWithDeviceUuid,
        myOrders: filteredMyOrders.map(order => ({
          ...order,
          deviceUuid: order.guestDevice?.deviceUuid || null,
          guestDevice: undefined,
        })),
        hasActiveOrders: ordersWithDeviceUuid.length > 0,
        myDeviceUuid: deviceUuid,
        currentUserId,
      }, { status: 200 });
    }

    // Для авторизованных клиентов
    if (session?.user) {
      if (!tableId) {
        return NextResponse.json(
          { error: 'Table ID is required' },
          { status: 400 }
        );
      }

      // Проверяем, какой счет у заказов на этом столике (раздельный или совместный)
      const tableOrders = await db.query.orders.findMany({
        where: and(
          eq(orders.tableId, tableId),
          notInArray(orders.status, ['completed', 'cancelled'])
        ),
        limit: 1,
      });

      let whereCondition;

      // Если есть заказы с типом 'separate' - показывать только свои
      // Если все 'shared' - показывать все заказы со столика
      if (tableOrders.length > 0 && tableOrders[0].billType === 'separate') {
        whereCondition = and(
          eq(orders.tableId, tableId),
          eq(orders.clientId, session.user.id),
          notInArray(orders.status, ['completed', 'cancelled'])
        );
      } else {
        // Совместный счет - показываем все заказы со столика
        whereCondition = and(
          eq(orders.tableId, tableId),
          notInArray(orders.status, ['completed', 'cancelled'])
        );
      }

      const activeOrders = await db.query.orders.findMany({
        where: whereCondition,
        with: {
          orderItems: {
            with: {
              menuItem: true,
            },
          },
        },
        orderBy: (orders, { desc }) => [desc(orders.createdAt)],
      });

      // Фильтруем заказы текущего пользователя по client_id
      const myOrders = activeOrders.filter(order => order.clientId === session.user.id);

      return NextResponse.json({ 
        orders: activeOrders,
        myOrders: myOrders,
        currentUserId: session.user.id,
      }, { status: 200 });
    }

    return NextResponse.json({ orders: [] }, { status: 200 });
  } catch (error) {
    console.error('Get active orders error:', error);
    return NextResponse.json(
      { error: 'Failed to get active orders' },
      { status: 500 }
    );
  }
}
