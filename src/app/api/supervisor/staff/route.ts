import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, userDepartmentRoles, roles, departments } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { logCreate, logUpdate, logDelete } from '@/lib/auditLog';
import { checkWriteRateLimit, getClientIp, createRateLimitResponse } from '@/lib/rateLimit';

/**
 * Определить основную роль пользователя из его назначений по отделам
 * Используется для обратной совместимости с полем users.role
 */
async function determineUserRole(assignments: { departmentId: string; roleId: string }[]): Promise<string> {
  if (!assignments || assignments.length === 0) {
    return 'client';
  }

  // Получить название первой роли
  const firstAssignment = assignments[0];
  const roleData = await db
    .select({ name: roles.name })
    .from(roles)
    .where(eq(roles.id, firstAssignment.roleId))
    .limit(1);

  if (!roleData[0]) {
    return 'client';
  }

  const roleName = roleData[0].name.toLowerCase();

  // Определяем тип роли по названию
  if (roleName.includes('официант') || roleName.includes('waiter') || roleName.includes('хостес')) {
    return 'waiter';
  }
  if (roleName.includes('повар') || roleName.includes('chef') || roleName.includes('кухн')) {
    return 'kitchen_staff';
  }
  if (roleName.includes('бармен') || roleName.includes('bartender') || roleName.includes('бар')) {
    return 'kitchen_staff';
  }
  if (roleName.includes('менеджер') || roleName.includes('manager') || roleName.includes('управляющ')) {
    return 'manager';
  }

  return 'client'; // По умолчанию
}

// GET - Получить всех сотрудников ресторана
export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.restaurantId || !['supervisor', 'admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получить всех сотрудников (кроме клиентов и самих админов/супервайзеров)
    const staff = await db
      .select({
        id: users.id,
        email: users.email,
        phone: users.phone,
        firstName: users.firstName,
        lastName: users.lastName,
        middleName: users.middleName,
        dateOfBirth: users.dateOfBirth,
        role: users.role,
        isActive: users.isActive,
        deactivationReason: users.deactivationReason,
        deactivatedAt: users.deactivatedAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(
        and(
          eq(users.restaurantId, session.user.restaurantId),
          inArray(users.role, ['waiter', 'kitchen_staff', 'manager'])
        )
      );

    // Получить назначения по отделам и ролям для каждого сотрудника
    const staffIds = staff.map(s => s.id);
    
    let departmentRoleAssignments: any[] = [];

    if (staffIds.length > 0) {
      departmentRoleAssignments = await db
        .select({
          userId: userDepartmentRoles.userId,
          departmentId: userDepartmentRoles.departmentId,
          departmentName: departments.name,
          roleId: userDepartmentRoles.roleId,
          roleName: roles.name,
        })
        .from(userDepartmentRoles)
        .leftJoin(departments, eq(userDepartmentRoles.departmentId, departments.id))
        .leftJoin(roles, eq(userDepartmentRoles.roleId, roles.id))
        .where(inArray(userDepartmentRoles.userId, staffIds));
    }

    // Собрать данные вместе
    const staffWithDetails = staff.map(member => {
      const assignments = departmentRoleAssignments.filter(a => a.userId === member.id);
      
      // Группировка для обратной совместимости (если нужно будет показывать в старом формате)
      const uniqueDepartments = [...new Set(assignments.map(a => a.departmentId))];
      const uniqueRoles = [...new Set(assignments.map(a => a.roleId))];
      
      return {
        ...member,
        departmentRoleAssignments: assignments.map(a => ({
          departmentId: a.departmentId,
          departmentName: a.departmentName,
          roleId: a.roleId,
          roleName: a.roleName,
        })),
        // Для обратной совместимости (если используется где-то в UI)
        additionalRoles: uniqueRoles.map(roleId => {
          const assignment = assignments.find(a => a.roleId === roleId);
          return {
            roleId,
            roleName: assignment?.roleName,
          };
        }),
        departments: uniqueDepartments.map(deptId => {
          const assignment = assignments.find(a => a.departmentId === deptId);
          return {
            departmentId: deptId,
            departmentName: assignment?.departmentName,
          };
        }),
      };
    });

    return NextResponse.json(staffWithDetails);
  } catch (error) {
    console.error('Error fetching staff:', error);
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 });
  }
}

// POST - Создать нового сотрудника
export async function POST(request: Request) {
  try {
    // Rate limiting: 20 запросов в минуту
    const clientIp = getClientIp(request);
    const rateLimitResult = await checkWriteRateLimit(clientIp);
    
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const session = await auth();
    
    if (!session?.user?.restaurantId || !['supervisor', 'admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      email, 
      phone, 
      firstName, 
      lastName, 
      middleName,
      dateOfBirth,
      password,
      departmentRoleAssignments, // [{departmentId, roleId}]
    } = body;

    // Валидация обязательных полей
    if (!firstName || !lastName || !phone) {
      return NextResponse.json(
        { error: 'First name, last name, and phone are required' },
        { status: 400 }
      );
    }

    // Определяем основную роль автоматически из назначений
    const role = await determineUserRole(departmentRoleAssignments || []);

    // Генерация email если не указан
    const staffEmail = email || `${phone}@${session.user.restaurantId}.local`;

    // Хеширование пароля (или генерация временного)
    const tempPassword = password || Math.random().toString(36).slice(-8);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Создание пользователя
    const newUser = await db
      .insert(users)
      .values({
        restaurantId: session.user.restaurantId,
        email: staffEmail,
        phone,
        firstName,
        lastName,
        middleName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        role,
        passwordHash,
        isActive: true,
      })
      .returning();

    // Назначить роли по отделам
    if (departmentRoleAssignments && Array.isArray(departmentRoleAssignments) && departmentRoleAssignments.length > 0) {
      await db.insert(userDepartmentRoles).values(
        departmentRoleAssignments.map((assignment: { departmentId: string; roleId: string }) => ({
          userId: newUser[0].id,
          departmentId: assignment.departmentId,
          roleId: assignment.roleId,
        }))
      );
    }

    // Audit log
    await logCreate(
      'staff',
      newUser[0].id,
      {
        email: newUser[0].email,
        firstName: newUser[0].firstName,
        lastName: newUser[0].lastName,
        role: newUser[0].role,
      },
      session.user.id,
      session.user.restaurantId
    );

    return NextResponse.json(
      { 
        ...newUser[0], 
        passwordHash: undefined,
        tempPassword: password ? undefined : tempPassword, // Вернуть временный пароль только если не был указан
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating staff member:', error);
    return NextResponse.json({ error: 'Failed to create staff member' }, { status: 500 });
  }
}

// PATCH - Обновить сотрудника
export async function PATCH(request: Request) {
  try {
    // Rate limiting: 20 запросов в минуту
    const clientIp = getClientIp(request);
    const rateLimitResult = await checkWriteRateLimit(clientIp);
    
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const session = await auth();
    
    if (!session?.user?.restaurantId || !['supervisor', 'admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      id,
      email, 
      phone, 
      firstName, 
      lastName, 
      middleName,
      dateOfBirth,
      isActive,
      departmentRoleAssignments,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Проверка, что пользователь принадлежит ресторану
    const existingUser = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, id),
          eq(users.restaurantId, session.user.restaurantId)
        )
      )
      .limit(1);

    if (!existingUser.length) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Обновление данных пользователя
    const updateData: any = { updatedAt: new Date() };
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (middleName !== undefined) updateData.middleName = middleName;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Если обновляются назначения по отделам, определяем новую основную роль
    if (departmentRoleAssignments !== undefined) {
      const role = await determineUserRole(departmentRoleAssignments || []);
      updateData.role = role;
    }

    const updatedUser = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    // Audit log
    await logUpdate(
      'staff',
      id,
      {
        email: existingUser[0].email,
        firstName: existingUser[0].firstName,
        lastName: existingUser[0].lastName,
        role: existingUser[0].role,
        isActive: existingUser[0].isActive,
      },
      {
        email: updatedUser[0].email,
        firstName: updatedUser[0].firstName,
        lastName: updatedUser[0].lastName,
        role: updatedUser[0].role,
        isActive: updatedUser[0].isActive,
      },
      session.user.id,
      session.user.restaurantId
    );

    // Обновить назначения по отделам и ролям
    if (departmentRoleAssignments !== undefined && Array.isArray(departmentRoleAssignments)) {
      await db.delete(userDepartmentRoles).where(eq(userDepartmentRoles.userId, id));
      if (departmentRoleAssignments.length > 0) {
        await db.insert(userDepartmentRoles).values(
          departmentRoleAssignments.map((assignment: { departmentId: string; roleId: string }) => ({
            userId: id,
            departmentId: assignment.departmentId,
            roleId: assignment.roleId,
          }))
        );
      }
    }

    return NextResponse.json({ ...updatedUser[0], passwordHash: undefined });
  } catch (error) {
    console.error('Error updating staff member:', error);
    return NextResponse.json({ error: 'Failed to update staff member' }, { status: 500 });
  }
}

// DELETE - Деактивировать сотрудника
export async function DELETE(request: Request) {
  try {
    // Rate limiting: 20 запросов в минуту
    const clientIp = getClientIp(request);
    const rateLimitResult = await checkWriteRateLimit(clientIp);
    
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const session = await auth();
    
    if (!session?.user?.restaurantId || !['supervisor', 'admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, reason } = body;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Проверка, что пользователь принадлежит ресторану
    const existingUser = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, id),
          eq(users.restaurantId, session.user.restaurantId)
        )
      )
      .limit(1);

    if (!existingUser.length) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Деактивируем сотрудника с указанием причины и даты
    await db.update(users).set({
      isActive: false,
      deactivationReason: reason || null,
      deactivatedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(users.id, id));

    // Удаляем все назначения по отделам
    await db.delete(userDepartmentRoles).where(eq(userDepartmentRoles.userId, id));

    // Audit log
    await logDelete(
      'staff',
      id,
      {
        email: existingUser[0].email,
        firstName: existingUser[0].firstName,
        lastName: existingUser[0].lastName,
        role: existingUser[0].role,
        reason: reason || 'No reason provided',
      },
      session.user.id,
      session.user.restaurantId
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deactivating staff member:', error);
    return NextResponse.json({ error: 'Failed to deactivate staff member' }, { status: 500 });
  }
}
