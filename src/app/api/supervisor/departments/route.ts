import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { departments, departmentRoles, roles } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { NextResponse } from 'next/server';

// GET - Получить все отделы ресторана
export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.restaurantId || !['supervisor', 'admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const isFoodPreparation = searchParams.get('isFoodPreparation');

    let query = db
      .select()
      .from(departments);

    const conditions = [eq(departments.restaurantId, session.user.restaurantId)];
    
    if (isFoodPreparation === 'true') {
      conditions.push(eq(departments.isFoodPreparation, true));
    }

    const restaurantDepartments = await query.where(and(...conditions));

    // Получить роли для каждого отдела
    const departmentIds = restaurantDepartments.map(d => d.id);
    
    let departmentRolesList: any[] = [];
    if (departmentIds.length > 0) {
      departmentRolesList = await db
        .select({
          departmentId: departmentRoles.departmentId,
          roleId: departmentRoles.roleId,
          roleName: roles.name,
        })
        .from(departmentRoles)
        .leftJoin(roles, eq(departmentRoles.roleId, roles.id))
        .where(inArray(departmentRoles.departmentId, departmentIds));
    }

    // Собрать данные вместе
    const departmentsWithRoles = restaurantDepartments.map(dept => ({
      ...dept,
      roles: departmentRolesList.filter(dr => dr.departmentId === dept.id),
    }));

    return NextResponse.json(departmentsWithRoles);
  } catch (error) {
    console.error('Error fetching departments:', error);
    return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 });
  }
}

// POST - Создать новый отдел
export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.restaurantId || !['supervisor', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, isFoodPreparation, roleIds } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const newDepartment = await db
      .insert(departments)
      .values({
        restaurantId: session.user.restaurantId,
        name,
        description,
        isFoodPreparation: isFoodPreparation ?? false,
      })
      .returning();

    // Назначить роли отделу
    if (roleIds && Array.isArray(roleIds) && roleIds.length > 0) {
      await db.insert(departmentRoles).values(
        roleIds.map((roleId: string) => ({
          departmentId: newDepartment[0].id,
          roleId,
        }))
      );
    }

    return NextResponse.json(newDepartment[0], { status: 201 });
  } catch (error) {
    console.error('Error creating department:', error);
    return NextResponse.json({ error: 'Failed to create department' }, { status: 500 });
  }
}

// PATCH - Обновить отдел
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.restaurantId || !['supervisor', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, description, isFoodPreparation, roleIds } = body;

    if (!id) {
      return NextResponse.json({ error: 'Department ID is required' }, { status: 400 });
    }

    // Проверка, что отдел принадлежит ресторану
    const existingDepartment = await db
      .select()
      .from(departments)
      .where(
        and(
          eq(departments.id, id),
          eq(departments.restaurantId, session.user.restaurantId)
        )
      )
      .limit(1);

    if (!existingDepartment.length) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    const updatedDepartment = await db
      .update(departments)
      .set({ 
        name: name ?? existingDepartment[0].name,
        description: description ?? existingDepartment[0].description,
        isFoodPreparation: isFoodPreparation ?? existingDepartment[0].isFoodPreparation,
        updatedAt: new Date(),
      })
      .where(eq(departments.id, id))
      .returning();

    // Обновить роли отдела
    if (roleIds !== undefined && Array.isArray(roleIds)) {
      // Удалить старые роли
      await db.delete(departmentRoles).where(eq(departmentRoles.departmentId, id));
      
      // Добавить новые роли
      if (roleIds.length > 0) {
        await db.insert(departmentRoles).values(
          roleIds.map((roleId: string) => ({
            departmentId: id,
            roleId,
          }))
        );
      }
    }

    return NextResponse.json(updatedDepartment[0]);
  } catch (error) {
    console.error('Error updating department:', error);
    return NextResponse.json({ error: 'Failed to update department' }, { status: 500 });
  }
}

// DELETE - Удалить отдел
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.restaurantId || !['supervisor', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Department ID is required' }, { status: 400 });
    }

    // Проверка, что отдел принадлежит ресторану
    const existingDepartment = await db
      .select()
      .from(departments)
      .where(
        and(
          eq(departments.id, id),
          eq(departments.restaurantId, session.user.restaurantId)
        )
      )
      .limit(1);

    if (!existingDepartment.length) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    await db.delete(departments).where(eq(departments.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting department:', error);
    return NextResponse.json({ error: 'Failed to delete department' }, { status: 500 });
  }
}
