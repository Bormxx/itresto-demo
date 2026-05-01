import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { auditLogs, users } from '@/lib/db/schema';
import { eq, desc, and, gte, lte, like } from 'drizzle-orm';

// GET - Получить журнал аудита
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.restaurantId || session.user.role !== 'supervisor') {
      return NextResponse.json(
        { error: 'Not authenticated or insufficient permissions' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const action = searchParams.get('action');
    const entityType = searchParams.get('entityType');
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Строим условия фильтрации
    const conditions = [
      eq(auditLogs.restaurantId, session.user.restaurantId)
    ];

    if (dateFrom) {
      conditions.push(gte(auditLogs.createdAt, new Date(dateFrom)));
    }

    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      conditions.push(lte(auditLogs.createdAt, endDate));
    }

    if (action) {
      conditions.push(eq(auditLogs.action, action as any));
    }

    if (entityType) {
      conditions.push(eq(auditLogs.entityType, entityType));
    }

    if (userId) {
      conditions.push(eq(auditLogs.userId, userId));
    }

    // Получаем логи с информацией о пользователях
    const logs = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        changes: auditLogs.changes,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        createdAt: auditLogs.createdAt,
        userId: auditLogs.userId,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    // Получаем общее количество записей для пагинации
    const totalResult = await db
      .select({ count: auditLogs.id })
      .from(auditLogs)
      .where(and(...conditions));
    
    const total = totalResult.length;

    return NextResponse.json({
      logs,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
