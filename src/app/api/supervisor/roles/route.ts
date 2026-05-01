import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { roles } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';

// GET - Получить все роли ресторана
export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.restaurantId || !['supervisor', 'admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const restaurantRoles = await db
      .select()
      .from(roles)
      .where(eq(roles.restaurantId, session.user.restaurantId));

    return NextResponse.json(restaurantRoles);
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
  }
}

// POST - Создать новую роль
export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.restaurantId || !['supervisor', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const newRole = await db
      .insert(roles)
      .values({
        restaurantId: session.user.restaurantId,
        name,
        description,
        isSystem: false,
      })
      .returning();

    return NextResponse.json(newRole[0], { status: 201 });
  } catch (error) {
    console.error('Error creating role:', error);
    return NextResponse.json({ error: 'Failed to create role' }, { status: 500 });
  }
}

// PATCH - Обновить роль
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.restaurantId || !['supervisor', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, description } = body;

    if (!id) {
      return NextResponse.json({ error: 'Role ID is required' }, { status: 400 });
    }

    // Проверка, что роль принадлежит ресторану
    const existingRole = await db
      .select()
      .from(roles)
      .where(
        and(
          eq(roles.id, id),
          eq(roles.restaurantId, session.user.restaurantId)
        )
      )
      .limit(1);

    if (!existingRole.length) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    const updatedRole = await db
      .update(roles)
      .set({ 
        name: name ?? existingRole[0].name,
        description: description ?? existingRole[0].description,
        updatedAt: new Date(),
      })
      .where(eq(roles.id, id))
      .returning();

    return NextResponse.json(updatedRole[0]);
  } catch (error) {
    console.error('Error updating role:', error);
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }
}

// DELETE - Удалить роль
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.restaurantId || !['supervisor', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Role ID is required' }, { status: 400 });
    }

    // Проверка, что роль принадлежит ресторану
    const existingRole = await db
      .select()
      .from(roles)
      .where(
        and(
          eq(roles.id, id),
          eq(roles.restaurantId, session.user.restaurantId)
        )
      )
      .limit(1);

    if (!existingRole.length) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    await db.delete(roles).where(eq(roles.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting role:', error);
    return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 });
  }
}
