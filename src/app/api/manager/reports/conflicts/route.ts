import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { conflicts, orders } from '@/lib/db/schema';
import { eq, gte, lte, and } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Проверка роли
    if (!['manager', 'supervisor', 'admin'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId');
    const timeFrom = searchParams.get('timeFrom');
    const duration = searchParams.get('duration');
    const tableId = searchParams.get('tableId');
    const waiterId = searchParams.get('waiterId');

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'RestaurantId обязателен' },
        { status: 400 }
      );
    }

    // Вычисляем временные границы если указаны
    let timeConditions: any[] = [];
    if (timeFrom && duration) {
      const today = new Date();
      const [hours, minutes] = timeFrom.split(':').map(Number);
      const startTime = new Date(today);
      startTime.setHours(hours, minutes, 0, 0);
      
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + parseInt(duration));
      
      timeConditions.push(gte(conflicts.createdAt, startTime));
      timeConditions.push(lte(conflicts.createdAt, endTime));
    }

    // Получить все конфликты с информацией о заказах
    const conflictsList = await db.query.conflicts.findMany({
      where: timeConditions.length > 0 ? and(...timeConditions) : undefined,
      with: {
        order: {
          with: {
            table: true,
            waiter: {
              columns: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            client: {
              columns: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        resolvedByUser: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Фильтруем только конфликты данного ресторана
    let restaurantConflicts = conflictsList.filter(
      conflict => conflict.order?.restaurantId === restaurantId
    );

    // Дополнительные фильтры
    if (tableId) {
      restaurantConflicts = restaurantConflicts.filter(
        conflict => conflict.order?.tableId === tableId
      );
    }

    if (waiterId) {
      restaurantConflicts = restaurantConflicts.filter(
        conflict => conflict.order?.waiterId === waiterId
      );
    }

    // Форматируем данные для клиента
    const formattedConflicts = restaurantConflicts.map(conflict => ({
      id: conflict.id,
      orderNumber: conflict.order?.orderNumber || 'N/A',
      tableNumber: conflict.order?.table?.number || conflict.order?.tableNumber || 'N/A',
      waiterName: conflict.order?.waiter
        ? `${conflict.order.waiter.firstName} ${conflict.order.waiter.lastName}`.trim()
        : 'Неизвестно',
      customerType: conflict.order?.clientId ? 'client' : 'guest',
      customerId: conflict.order?.clientId || conflict.order?.guestDeviceId || 'N/A',
      comment: conflict.description,
      solution: conflict.status === 'resolved'
        ? `Решено. ${conflict.discountType ? `Применена скидка: ${conflict.discountValue} ${conflict.discountType === 'percent' ? '%' : '₽'}` : ''}`
        : 'Не решено',
      createdAt: conflict.createdAt.toISOString(),
      status: conflict.status,
      resolvedBy: conflict.resolvedByUser
        ? `${conflict.resolvedByUser.firstName} ${conflict.resolvedByUser.lastName}`.trim()
        : null,
    }));

    return NextResponse.json({
      conflicts: formattedConflicts,
      total: formattedConflicts.length,
    });
  } catch (error) {
    console.error('Conflicts report error:', error);
    return NextResponse.json(
      { error: 'Ошибка генерации отчета по конфликтам' },
      { status: 500 }
    );
  }
}
