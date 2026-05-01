import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems, orderItemModifiers, tables, guestDevices, waiterTables, shiftTableAssignments, shiftStaffAssignments, shiftSchedules } from '@/lib/db/schema';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { eq, and, sql, isNull, inArray, notInArray } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { sendNotification } from '@/lib/notifications';
import { applyPromotions } from '@/lib/promotions';

const createOrderSchema = z.object({
  restaurantId: z.string().uuid(),
  tableId: z.string().uuid().optional(),
  tableNumber: z.string().optional(),
  billType: z.enum(['shared', 'separate']).optional(),
  deviceUuid: z.string().optional(), // Guest device UUID
  tablePin: z.string().optional(), // PIN для занятого столика
  items: z.array(
    z.object({
      menuItemId: z.string().uuid(),
      quantity: z.number().int().positive(),
      price: z.string(),
      modifiers: z.array(
        z.object({
          modifierId: z.string().uuid(),
          quantity: z.number().int().positive(),
          priceModifier: z.number(),
        })
      ).optional(),
    })
  ).min(1),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const body = await request.json();
    const validatedData = createOrderSchema.parse(body);

    // Handle guest device registration/update FIRST (needed for PIN check)
    let guestDeviceId: string | null = null;
    
    if (!session?.user?.id && validatedData.deviceUuid) {
      // Find or create guest device
      let guest = await db.query.guestDevices.findFirst({
        where: and(
          eq(guestDevices.deviceUuid, validatedData.deviceUuid),
          eq(guestDevices.restaurantId, validatedData.restaurantId)
        )
      });
      
      if (!guest) {
        // Create new guest device record
        const [newGuest] = await db.insert(guestDevices).values({
          deviceUuid: validatedData.deviceUuid,
          restaurantId: validatedData.restaurantId,
        }).returning();
        guest = newGuest;
      } else {
        // Update last seen timestamp
        await db.update(guestDevices)
          .set({ lastSeenAt: new Date() })
          .where(eq(guestDevices.id, guest.id));
      }
      
      guestDeviceId = guest.id;
    }

    // Найти столик по номеру, если указан
    let tableId = validatedData.tableId;
    let foundTable = null;
    if (validatedData.tableNumber && !tableId) {
      const table = await db.query.tables.findFirst({
        where: and(
          eq(tables.number, validatedData.tableNumber),
          eq(tables.restaurantId, validatedData.restaurantId)
        ),
      });
      if (table) {
        tableId = table.id;
        foundTable = table;
      }
    }

    // Проверка PIN для занятых столиков
    if (tableId) {
      // Если столик еще не найден, получим его из БД
      if (!foundTable) {
        foundTable = await db.query.tables.findFirst({
          where: eq(tables.id, tableId),
        });
      }

      // Проверяем, есть ли активные заказы на этом столике от ДРУГИХ гостей
      const activeOrdersOnTable = await db.query.orders.findMany({
        where: and(
          eq(orders.tableId, tableId),
          notInArray(orders.status, ['completed', 'cancelled'])
        ),
      });

      // Если есть активные заказы, проверяем PIN
      if (activeOrdersOnTable.length > 0 && foundTable?.pin) {
        // Фильтруем заказы - оставляем только от ДРУГИХ гостей/клиентов
        const ordersFromOthers = activeOrdersOnTable.filter(order => {
          if (session?.user?.id) {
            // Авторизованный клиент - исключаем свои заказы
            return order.clientId !== session.user.id;
          } else if (guestDeviceId) {
            // Гость - исключаем заказы с этим же deviceId
            return order.guestDeviceId !== guestDeviceId;
          }
          return true;
        });

        // Если есть заказы от других - требуем PIN
        if (ordersFromOthers.length > 0) {
          if (!validatedData.tablePin || validatedData.tablePin !== foundTable.pin) {
            return NextResponse.json(
              { 
                error: 'Invalid or missing table PIN',
                requiresPin: true,
                message: 'This table is occupied. Please enter the correct PIN to continue.'
              },
              { status: 403 }
            );
          }
        }
      }
    }

    // Проверить, есть ли уже активный заказ для этого конкретного клиента
    let existingOrder = null;
    
    if (session?.user?.id) {
      // Для авторизованного клиента - ищем по clientId
      existingOrder = await db.query.orders.findFirst({
        where: and(
          eq(orders.clientId, session.user.id),
          eq(orders.restaurantId, validatedData.restaurantId),
          eq(orders.status, 'pending')
        ),
        orderBy: (orders, { desc }) => [desc(orders.createdAt)],
      });
    } else if (guestDeviceId) {
      // Для гостя - ищем по guestDeviceId (каждый гость имеет свой заказ, даже при shared счёте)
      existingOrder = await db.query.orders.findFirst({
        where: and(
          eq(orders.guestDeviceId, guestDeviceId),
          eq(orders.restaurantId, validatedData.restaurantId),
          eq(orders.status, 'pending')
        ),
        orderBy: (orders, { desc }) => [desc(orders.createdAt)],
      });
    }

    let targetOrder;

    if (existingOrder) {
      // Добавляем позиции к существующему заказу
      targetOrder = existingOrder;
      
      // Создать новые позиции заказа сначала
      const orderItemsData = validatedData.items.map((item) => ({
        orderId: existingOrder.id,
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        quantityDelivered: 0,
        priceAtOrder: item.price,
        status: 'pending' as const,
      }));

      const insertedItems = await db.insert(orderItems).values(orderItemsData).returning();
      
      // Создать модификаторы для каждой позиции
      for (let i = 0; i < validatedData.items.length; i++) {
        const item = validatedData.items[i];
        const orderItem = insertedItems[i];
        
        if (item.modifiers && item.modifiers.length > 0) {
          const modifiersData = item.modifiers.map((mod) => ({
            orderItemId: orderItem.id,
            modifierId: mod.modifierId,
            quantity: mod.quantity,
            priceModifier: mod.priceModifier.toString(),
          }));
          
          await db.insert(orderItemModifiers).values(modifiersData);
        }
      }
      
      // Получаем все позиции заказа для пересчета промо-акций
      const allOrderItems = await db.query.orderItems.findMany({
        where: eq(orderItems.orderId, existingOrder.id)
      });
      
      // Пересчитываем промо-акции для всего заказа
      const allItems = allOrderItems.map(item => ({
        menuItemId: item.menuItemId!,
        quantity: item.quantity,
        price: item.priceAtOrder,
      }));
      
      const promotionResult = await applyPromotions(
        existingOrder.restaurantId,
        existingOrder.clientId,
        allItems
      );
      
      // Пересчитываем сумму (учитываем модификаторы)
      const additionalSubtotal = validatedData.items.reduce(
        (sum, item) => {
          const itemPrice = parseFloat(item.price) * item.quantity;
          const modifiersPrice = (item.modifiers || []).reduce(
            (modSum, mod) => modSum + (mod.priceModifier * mod.quantity),
            0
          );
          return sum + itemPrice + modifiersPrice;
        },
        0
      );
      
      const newSubtotal = parseFloat(existingOrder.subtotal) + additionalSubtotal;
      const finalDiscount = promotionResult.totalDiscount;
      const newTotal = Math.max(0, newSubtotal - finalDiscount);
      
      // Обновляем заказ с новыми скидками
      await db
        .update(orders)
        .set({
          subtotal: newSubtotal.toFixed(2),
          discount: finalDiscount.toFixed(2),
          total: newTotal.toFixed(2),
          appliedPromotions: promotionResult.appliedPromotions.length > 0 
            ? JSON.stringify(promotionResult.appliedPromotions) 
            : null,
          loyaltyPointsEarned: promotionResult.loyaltyPointsToEarn,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, existingOrder.id));
    } else {
      // Создаем новый заказ
      const subtotal = validatedData.items.reduce(
        (sum, item) => {
          const itemPrice = parseFloat(item.price) * item.quantity;
          const modifiersPrice = (item.modifiers || []).reduce(
            (modSum, mod) => modSum + (mod.priceModifier * mod.quantity),
            0
          );
          return sum + itemPrice + modifiersPrice;
        },
        0
      );

      // Найти официанта, назначенного на столик
      let waiterId: string | null = null;
      
      if (tableId) {
        // Сначала проверяем новую систему смен
        const today = new Date().toISOString().split('T')[0];
        
        // Ищем назначения столика через смены на сегодня
        const tableAssignments = await db.query.shiftTableAssignments.findMany({
          where: eq(shiftTableAssignments.tableId, tableId),
          with: {
            staffAssignment: {
              with: {
                shiftSchedule: true,
              },
            },
          },
        });
        
        // Фильтруем только назначения на сегодня и не выходные
        const todayAssignment = tableAssignments.find(
          (ta) => ta.staffAssignment.shiftSchedule.date === today && 
                  !ta.staffAssignment.shiftSchedule.isDayOff
        );
        
        if (todayAssignment) {
          waiterId = todayAssignment.staffAssignment.userId;
        } else {
          // Если не найдено в новой системе, проверяем старую систему waiterTables
          const waiterAssignment = await db.query.waiterTables.findFirst({
            where: and(
              eq(waiterTables.tableId, tableId),
              isNull(waiterTables.unassignedAt)
            ),
          });
          
          if (waiterAssignment) {
            waiterId = waiterAssignment.waiterId;
          } else {
            // Если столик указан, но на него не назначен официант - нельзя создать заказ
            return NextResponse.json(
              { error: 'Невозможно создать заказ: на столик не назначен официант' },
              { status: 400 }
            );
          }
        }
      }

      const orderNumber = `ORD-${nanoid(8).toUpperCase()}`;
      
      // Применяем промо-акции автоматически
      const promotionResult = await applyPromotions(
        validatedData.restaurantId,
        session?.user?.id || null,
        validatedData.items.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          price: item.price,
        }))
      );
      
      // Рассчитываем итоговую сумму с учетом скидок
      const finalDiscount = promotionResult.totalDiscount;
      const finalTotal = Math.max(0, subtotal - finalDiscount);
      
      const [newOrder] = await db
        .insert(orders)
        .values({
          restaurantId: validatedData.restaurantId,
          tableId: tableId || null,
          tableNumber: validatedData.tableNumber || null,
          waiterId: waiterId, // Назначаем официанта из waiter_tables
          clientId: session?.user?.id || null,
          guestDeviceId: guestDeviceId || null, // Link to guest device
          orderNumber,
          status: 'pending',
          billType: validatedData.billType || 'shared',
          subtotal: subtotal.toFixed(2),
          discount: finalDiscount.toFixed(2),
          tax: '0',
          total: finalTotal.toFixed(2),
          paymentStatus: 'pending',
          appliedPromotions: promotionResult.appliedPromotions.length > 0 
            ? JSON.stringify(promotionResult.appliedPromotions) 
            : null,
          loyaltyPointsEarned: promotionResult.loyaltyPointsToEarn,
        })
        .returning();

      targetOrder = newOrder;

      // Создать позиции заказа
      const orderItemsData = validatedData.items.map((item) => ({
        orderId: newOrder.id,
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        quantityDelivered: 0,
        priceAtOrder: item.price,
        status: 'pending' as const,
      }));

      const insertedItems = await db.insert(orderItems).values(orderItemsData).returning();
      
      // Создать модификаторы для каждой позиции
      for (let i = 0; i < validatedData.items.length; i++) {
        const item = validatedData.items[i];
        const orderItem = insertedItems[i];
        
        if (item.modifiers && item.modifiers.length > 0) {
          const modifiersData = item.modifiers.map((mod) => ({
            orderItemId: orderItem.id,
            modifierId: mod.modifierId,
            quantity: mod.quantity,
            priceModifier: mod.priceModifier.toString(),
          }));
          
          await db.insert(orderItemModifiers).values(modifiersData);
        }
      }
      
      // Проверить, является ли это первым заказом за столиком
      if (tableId) {
        const table = await db.query.tables.findFirst({
          where: eq(tables.id, tableId)
        });
        
        if (table) {
          let pinToReturn = table.pin;
          
          // Если у столика нет PIN, генерируем его
          if (!table.pin) {
            pinToReturn = Math.floor(1000 + Math.random() * 9000).toString(); // 4-значный PIN
            await db.update(tables)
              .set({ pin: pinToReturn })
              .where(eq(tables.id, tableId));
          }
          
          // Проверяем, есть ли другие активные заказы за этим столиком
          const existingTableOrders = await db.query.orders.findMany({
            where: and(
              eq(orders.tableId, tableId),
              eq(orders.status, 'pending')
            ),
          });
          
          // Если это первый активный заказ за столиком, возвращаем PIN
          if (existingTableOrders.length === 1) { // Только что созданный заказ
            (newOrder as any).tablePin = pinToReturn;
          }
        }
      }
      
      // Update guest device statistics
      if (guestDeviceId) {
        await db.update(guestDevices)
          .set({
            totalOrders: sql`${guestDevices.totalOrders} + 1`,
            totalSpent: sql`${guestDevices.totalSpent} + ${subtotal.toFixed(2)}`,
            lastSeenAt: new Date()
          })
          .where(eq(guestDevices.id, guestDeviceId));
      }
    }

    // Обновить статус столика на "occupied"
    if (tableId) {
      await db
        .update(tables)
        .set({ status: 'occupied' })
        .where(eq(tables.id, tableId));
    }

    // Отправить уведомление официантам о новом заказе
    const table = tableId ? await db.query.tables.findFirst({
      where: eq(tables.id, tableId)
    }) : null;
    
    sendNotification({
      type: 'new_order',
      restaurantId: validatedData.restaurantId,
      role: 'waiter',
      data: {
        orderId: targetOrder.id,
        orderNumber: targetOrder.orderNumber,
        tableNumber: table?.number || validatedData.tableNumber || 'N/A',
        total: targetOrder.total,
        itemsCount: validatedData.items.length,
        items: validatedData.items,
      },
    });

    return NextResponse.json(
      {
        success: true,
        order: {
          id: targetOrder.id,
          orderNumber: targetOrder.orderNumber,
          total: targetOrder.total,
        },
        isNewOrder: !existingOrder,
        tablePin: (targetOrder as any).tablePin || undefined, // PIN для первого гостя
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Неверные данные заказа', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Ошибка при создании заказа',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
