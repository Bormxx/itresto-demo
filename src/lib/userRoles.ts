import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Типы ролей
 */
export const DEPARTMENT_ROLE_TYPES = {
  WAITER: 'waiter',
  KITCHEN: 'kitchen_staff',
  BAR: 'bar_staff',
  MANAGER: 'manager',
  SUPERVISOR: 'supervisor',
  ADMIN: 'admin',
  CLIENT: 'client',
} as const;

export type DepartmentRoleType = typeof DEPARTMENT_ROLE_TYPES[keyof typeof DEPARTMENT_ROLE_TYPES];

/**
 * Получить роль пользователя (упрощённая версия для демо)
 */
export async function getUserPrimaryRole(userId: string): Promise<string> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  return user?.role || 'client';
}

/**
 * Проверить, имеет ли пользователь определенную роль
 */
export async function hasRole(userId: string, role: string): Promise<boolean> {
  const userRole = await getUserPrimaryRole(userId);
  return userRole === role;
}

/**
 * Проверить, имеет ли пользователь роль из списка
 */
export async function hasRoleType(userId: string, roleType: DepartmentRoleType | DepartmentRoleType[]): Promise<boolean> {
  const roleTypes = Array.isArray(roleType) ? roleType : [roleType];
  const userRole = await getUserPrimaryRole(userId);
  return roleTypes.includes(userRole as DepartmentRoleType);
}

/**
 * Проверить, является ли пользователь менеджером или выше
 */
export async function isManagerOrHigher(userId: string): Promise<boolean> {
  const role = await getUserPrimaryRole(userId);
  return ['manager', 'supervisor', 'admin'].includes(role);
}

/**
 * Проверить, является ли пользователь управляющим или выше
 */
export async function isSupervisorOrHigher(userId: string): Promise<boolean> {
  const role = await getUserPrimaryRole(userId);
  return ['supervisor', 'admin'].includes(role);
}

/**
 * Проверить, имеет ли пользователь доступ к роли
 */
export async function canAccess(userId: string, allowedRoles: DepartmentRoleType[]): Promise<boolean> {
  return await hasRoleType(userId, allowedRoles);
}
