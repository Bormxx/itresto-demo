import { db } from '@/lib/db';
import { auditLogs } from '@/lib/db/schema';
import { headers } from 'next/headers';

type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout';

interface AuditLogData {
  restaurantId?: string;
  userId?: string;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  changes?: {
    before?: any;
    after?: any;
  };
}

/**
 * Записывает действие пользователя в журнал аудита
 */
export async function createAuditLog(data: AuditLogData) {
  try {
    // Получаем IP адрес и User Agent из headers
    const headersList = await headers();
    const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';

    // Подготавливаем данные для записи
    const logData: any = {
      action: data.action,
      ipAddress: ipAddress.split(',')[0].trim(), // Берем первый IP если есть несколько
      userAgent,
    };

    if (data.restaurantId) {
      logData.restaurantId = data.restaurantId;
    }

    if (data.userId) {
      logData.userId = data.userId;
    }

    if (data.entityType) {
      logData.entityType = data.entityType;
    }

    if (data.entityId) {
      logData.entityId = data.entityId;
    }

    if (data.changes) {
      logData.changes = JSON.stringify(data.changes);
    }

    // Записываем в БД
    await db.insert(auditLogs).values(logData);
  } catch (error) {
    // Не бросаем ошибку, чтобы не прерывать основную операцию
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Хелпер для логирования создания сущности
 */
export async function logCreate(
  entityType: string,
  entityId: string,
  data: any,
  userId?: string,
  restaurantId?: string
) {
  return createAuditLog({
    action: 'create',
    entityType,
    entityId,
    userId,
    restaurantId,
    changes: {
      after: data,
    },
  });
}

/**
 * Хелпер для логирования обновления сущности
 */
export async function logUpdate(
  entityType: string,
  entityId: string,
  before: any,
  after: any,
  userId?: string,
  restaurantId?: string
) {
  return createAuditLog({
    action: 'update',
    entityType,
    entityId,
    userId,
    restaurantId,
    changes: {
      before,
      after,
    },
  });
}

/**
 * Хелпер для логирования удаления сущности
 */
export async function logDelete(
  entityType: string,
  entityId: string,
  data: any,
  userId?: string,
  restaurantId?: string
) {
  return createAuditLog({
    action: 'delete',
    entityType,
    entityId,
    userId,
    restaurantId,
    changes: {
      before: data,
    },
  });
}

/**
 * Хелпер для логирования входа пользователя
 */
export async function logLogin(userId: string, restaurantId?: string) {
  return createAuditLog({
    action: 'login',
    userId,
    restaurantId,
    entityType: 'user',
    entityId: userId,
  });
}

/**
 * Хелпер для логирования выхода пользователя
 */
export async function logLogout(userId: string, restaurantId?: string) {
  return createAuditLog({
    action: 'logout',
    userId,
    restaurantId,
    entityType: 'user',
    entityId: userId,
  });
}
