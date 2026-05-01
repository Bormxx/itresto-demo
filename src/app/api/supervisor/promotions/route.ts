import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { promotions, promotionItems, menuItems, users } from '@/lib/db/schema';
import { auth } from '@/lib/auth';
import { eq, and, desc } from 'drizzle-orm';
import { logCreate, logUpdate, logDelete } from '@/lib/auditLog';
import { checkWriteRateLimit, getClientIp, createRateLimitResponse } from '@/lib/rateLimit';

// GET - Получить все акции ресторана
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.restaurantId) {
      return NextResponse.json(
        { error: 'Not authenticated or no restaurant assigned' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const includeItems = searchParams.get('includeItems') === 'true';

    let query = db
      .select()
      .from(promotions)
      .where(eq(promotions.restaurantId, session.user.restaurantId))
      .orderBy(desc(promotions.createdAt));

    if (!includeInactive) {
      query = db
        .select()
        .from(promotions)
        .where(
          and(
            eq(promotions.restaurantId, session.user.restaurantId),
            eq(promotions.isActive, true)
          )
        )
        .orderBy(desc(promotions.createdAt));
    }

    const allPromotions = await query;

    // Если нужно включить связанные блюда и информацию о клиенте
    if (includeItems) {
      const promotionsWithDetails = await Promise.all(
        allPromotions.map(async (promotion) => {
          // Загружаем связанные блюда для specific_item
          let items: Array<{ id: string | null; name: string | null }> = [];
          if (promotion.type === 'specific_item') {
            items = await db
              .select({
                id: menuItems.id,
                name: menuItems.translations,
              })
              .from(promotionItems)
              .leftJoin(menuItems, eq(promotionItems.menuItemId, menuItems.id))
              .where(eq(promotionItems.promotionId, promotion.id));
          }

          // Загружаем информацию о клиенте для персональных акций
          let client = null;
          if (!promotion.forAllClients && promotion.clientId) {
            const clientData = await db
              .select({
                id: users.id,
                email: users.email,
                firstName: users.firstName,
                lastName: users.lastName,
              })
              .from(users)
              .where(eq(users.id, promotion.clientId))
              .limit(1);
            
            if (clientData.length > 0) {
              client = clientData[0];
            }
          }

          return {
            ...promotion,
            items,
            client,
          };
        })
      );

      return NextResponse.json(promotionsWithDetails);
    }

    return NextResponse.json(allPromotions);
  } catch (error) {
    console.error('Error fetching promotions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch promotions' },
      { status: 500 }
    );
  }
}

// POST - Создать новую акцию
export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 20 запросов в минуту
    const clientIp = getClientIp(request);
    const rateLimitResult = await checkWriteRateLimit(clientIp);
    
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const session = await auth();
    
    if (!session?.user?.restaurantId) {
      return NextResponse.json(
        { error: 'Not authenticated or no restaurant assigned' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      type = 'all_menu',
      title,
      description,
      discountPercent,
      discountAmount,
      validFrom,
      validUntil,
      timeFrom,
      timeTo,
      forAllClients = true,
      clientId,
      eventType,
      daysBeforeEvent,
      daysAfterEvent,
      birthdayPeriodDays,
      rules,
      menuItemIds = [],
      isActive = true,
    } = body;

    // Валидация
    if (!title || !validFrom) {
      return NextResponse.json(
        { error: 'Title and validFrom are required' },
        { status: 400 }
      );
    }

    // validUntil необязателен для бессрочных акций
    if (validUntil && new Date(validFrom) >= new Date(validUntil)) {
      return NextResponse.json(
        { error: 'validFrom must be before validUntil' },
        { status: 400 }
      );
    }

    if (!discountPercent && !discountAmount) {
      return NextResponse.json(
        { error: 'Either discountPercent or discountAmount must be provided' },
        { status: 400 }
      );
    }

    if (discountPercent && (discountPercent < 0 || discountPercent > 100)) {
      return NextResponse.json(
        { error: 'discountPercent must be between 0 and 100' },
        { status: 400 }
      );
    }

    if (discountAmount && discountAmount < 0) {
      return NextResponse.json(
        { error: 'discountAmount must be positive' },
        { status: 400 }
      );
    }

    // Валидация типа акции
    if (!['all_menu', 'specific_item', 'bogo', 'time_based', 'birthday'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid promotion type' },
        { status: 400 }
      );
    }

    // Для birthday нужен birthdayPeriodDays
    if (type === 'birthday' && !birthdayPeriodDays) {
      return NextResponse.json(
        { error: 'Birthday period days is required for birthday promotion' },
        { status: 400 }
      );
    }

    // Для specific_item нужны menuItemIds
    if (type === 'specific_item' && (!menuItemIds || menuItemIds.length === 0)) {
      return NextResponse.json(
        { error: 'Menu items are required for specific_item promotion' },
        { status: 400 }
      );
    }

    // Для персональных акций нужен clientId
    if (!forAllClients && !clientId) {
      return NextResponse.json(
        { error: 'Client ID is required for personal promotions' },
        { status: 400 }
      );
    }

    // Валидация времени
    if (timeFrom && timeTo && timeFrom >= timeTo) {
      return NextResponse.json(
        { error: 'timeFrom must be before timeTo' },
        { status: 400 }
      );
    }

    const newPromotion = await db
      .insert(promotions)
      .values({
        restaurantId: session.user.restaurantId,
        type,
        title,
        description,
        discountPercent: discountPercent || null,
        discountAmount: discountAmount ? discountAmount.toString() : null,
        validFrom: new Date(validFrom),
        validUntil: validUntil ? new Date(validUntil) : null,
        timeFrom: timeFrom || null,
        timeTo: timeTo || null,
        forAllClients,
        clientId: clientId || null,
        eventType: eventType || null,
        daysBeforeEvent: daysBeforeEvent || null,
        daysAfterEvent: daysAfterEvent || null,
        birthdayPeriodDays: birthdayPeriodDays || null,
        rules: rules ? JSON.stringify(rules) : null,
        isActive,
      })
      .returning();

    // Если тип specific_item, добавляем связи с блюдами
    if (type === 'specific_item' && menuItemIds.length > 0) {
      await db.insert(promotionItems).values(
        menuItemIds.map((itemId: string) => ({
          promotionId: newPromotion[0].id,
          menuItemId: itemId,
        }))
      );
    }

    // Audit log
    await logCreate(
      'promotion',
      newPromotion[0].id,
      {
        type: newPromotion[0].type,
        title: newPromotion[0].title,
        discountPercent: newPromotion[0].discountPercent,
        isActive: newPromotion[0].isActive,
      },
      session.user.id,
      session.user.restaurantId
    );

    return NextResponse.json(newPromotion[0], { status: 201 });
  } catch (error) {
    console.error('Error creating promotion:', error);
    return NextResponse.json(
      { error: 'Failed to create promotion' },
      { status: 500 }
    );
  }
}

// PATCH - Обновить акцию
export async function PATCH(request: NextRequest) {
  try {
    // Rate limiting: 20 запросов в минуту
    const clientIp = getClientIp(request);
    const rateLimitResult = await checkWriteRateLimit(clientIp);
    
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const session = await auth();
    
    if (!session?.user?.restaurantId) {
      return NextResponse.json(
        { error: 'Not authenticated or no restaurant assigned' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      id,
      type,
      title,
      description,
      discountPercent,
      discountAmount,
      validFrom,
      validUntil,
      timeFrom,
      timeTo,
      forAllClients,
      clientId,
      eventType,
      daysBeforeEvent,
      daysAfterEvent,
      birthdayPeriodDays,
      rules,
      menuItemIds,
      isActive,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Promotion ID is required' },
        { status: 400 }
      );
    }

    // Проверяем, что акция принадлежит ресторану
    const existingPromotion = await db
      .select()
      .from(promotions)
      .where(
        and(
          eq(promotions.id, id),
          eq(promotions.restaurantId, session.user.restaurantId)
        )
      )
      .limit(1);

    if (!existingPromotion || existingPromotion.length === 0) {
      return NextResponse.json(
        { error: 'Promotion not found' },
        { status: 404 }
      );
    }

    // Валидация дат
    if (validFrom && validUntil && new Date(validFrom) >= new Date(validUntil)) {
      return NextResponse.json(
        { error: 'validFrom must be before validUntil' },
        { status: 400 }
      );
    }

    // Валидация времени
    if (timeFrom && timeTo && timeFrom >= timeTo) {
      return NextResponse.json(
        { error: 'timeFrom must be before timeTo' },
        { status: 400 }
      );
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (type !== undefined) updateData.type = type;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (discountPercent !== undefined) updateData.discountPercent = discountPercent;
    if (discountAmount !== undefined) updateData.discountAmount = discountAmount ? discountAmount.toString() : null;
    if (validFrom !== undefined) updateData.validFrom = new Date(validFrom);
    if (validUntil !== undefined) updateData.validUntil = validUntil ? new Date(validUntil) : null;
    if (timeFrom !== undefined) updateData.timeFrom = timeFrom;
    if (timeTo !== undefined) updateData.timeTo = timeTo;
    if (forAllClients !== undefined) updateData.forAllClients = forAllClients;
    if (clientId !== undefined) updateData.clientId = clientId;
    if (eventType !== undefined) updateData.eventType = eventType;
    if (daysBeforeEvent !== undefined) updateData.daysBeforeEvent = daysBeforeEvent;
    if (daysAfterEvent !== undefined) updateData.daysAfterEvent = daysAfterEvent;
    if (birthdayPeriodDays !== undefined) updateData.birthdayPeriodDays = birthdayPeriodDays;
    if (rules !== undefined) updateData.rules = rules ? JSON.stringify(rules) : null;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedPromotion = await db
      .update(promotions)
      .set(updateData)
      .where(
        and(
          eq(promotions.id, id),
          eq(promotions.restaurantId, session.user.restaurantId)
        )
      )
      .returning();

    // Audit log
    await logUpdate(
      'promotion',
      id,
      {
        type: existingPromotion[0].type,
        title: existingPromotion[0].title,
        discountPercent: existingPromotion[0].discountPercent,
        isActive: existingPromotion[0].isActive,
      },
      {
        type: updatedPromotion[0].type,
        title: updatedPromotion[0].title,
        discountPercent: updatedPromotion[0].discountPercent,
        isActive: updatedPromotion[0].isActive,
      },
      session.user.id,
      session.user.restaurantId
    );

    // Если обновляются menuItemIds для specific_item
    if (menuItemIds !== undefined) {
      // Удаляем старые связи
      await db
        .delete(promotionItems)
        .where(eq(promotionItems.promotionId, id));

      // Добавляем новые
      if (menuItemIds.length > 0) {
        await db.insert(promotionItems).values(
          menuItemIds.map((itemId: string) => ({
            promotionId: id,
            menuItemId: itemId,
          }))
        );
      }
    }

    return NextResponse.json(updatedPromotion[0]);
  } catch (error) {
    console.error('Error updating promotion:', error);
    return NextResponse.json(
      { error: 'Failed to update promotion' },
      { status: 500 }
    );
  }
}

// DELETE - Удалить акцию
export async function DELETE(request: NextRequest) {
  try {
    // Rate limiting: 20 запросов в минуту
    const clientIp = getClientIp(request);
    const rateLimitResult = await checkWriteRateLimit(clientIp);
    
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const session = await auth();
    
    if (!session?.user?.restaurantId) {
      return NextResponse.json(
        { error: 'Not authenticated or no restaurant assigned' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Promotion ID is required' },
        { status: 400 }
      );
    }

    // Проверяем, что акция принадлежит ресторану
    const existingPromotion = await db
      .select()
      .from(promotions)
      .where(
        and(
          eq(promotions.id, id),
          eq(promotions.restaurantId, session.user.restaurantId)
        )
      )
      .limit(1);

    if (!existingPromotion || existingPromotion.length === 0) {
      return NextResponse.json(
        { error: 'Promotion not found' },
        { status: 404 }
      );
    }

    await db
      .delete(promotions)
      .where(
        and(
          eq(promotions.id, id),
          eq(promotions.restaurantId, session.user.restaurantId)
        )
      );

    // Audit log
    await logDelete(
      'promotion',
      id,
      {
        type: existingPromotion[0].type,
        title: existingPromotion[0].title,
        discountPercent: existingPromotion[0].discountPercent,
      },
      session.user.id,
      session.user.restaurantId
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting promotion:', error);
    return NextResponse.json(
      { error: 'Failed to delete promotion' },
      { status: 500 }
    );
  }
}
