import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { menuCategories } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/categories - получить все категории ресторана
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const restaurantCategories = await db.query.menuCategories.findMany({
      where: eq(menuCategories.restaurantId, session.user.restaurantId),
      orderBy: (menuCategories, { asc }) => [asc(menuCategories.displayOrder), asc(menuCategories.name)],
    });

    return NextResponse.json(restaurantCategories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

// POST /api/categories - создать новую категорию
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Только менеджер может создавать категории
    if (session.user.role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, sortOrder } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Проверяем уникальность имени категории в пределах ресторана
    const existingCategory = await db.query.menuCategories.findFirst({
      where: and(
        eq(menuCategories.restaurantId, session.user.restaurantId),
        eq(menuCategories.name, name.trim())
      ),
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category with this name already exists' },
        { status: 409 }
      );
    }

    const [newCategory] = await db
      .insert(menuCategories)
      .values({
        restaurantId: session.user.restaurantId,
        name: name.trim(),
        displayOrder: sortOrder ?? 0,
      })
      .returning();

    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}

// PATCH /api/categories?id=123 - обновить категорию
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get('id');

    if (!categoryId) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, sortOrder } = body;

    // Проверяем, что категория принадлежит ресторану менеджера
    const existingCategory = await db.query.menuCategories.findFirst({
      where: and(
        eq(menuCategories.id, categoryId),
        eq(menuCategories.restaurantId, session.user.restaurantId)
      ),
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Если меняем имя, проверяем уникальность
    if (name && name !== existingCategory.name) {
      const duplicate = await db.query.menuCategories.findFirst({
        where: and(
          eq(menuCategories.restaurantId, session.user.restaurantId),
          eq(menuCategories.name, name.trim())
        ),
      });

      if (duplicate) {
        return NextResponse.json(
          { error: 'Category with this name already exists' },
          { status: 409 }
        );
      }
    }

    const updateData: { name?: string; displayOrder?: number } = {};
    if (name !== undefined) updateData.name = name.trim();
    if (sortOrder !== undefined) updateData.displayOrder = sortOrder;

    const [updatedCategory] = await db
      .update(menuCategories)
      .set(updateData)
      .where(eq(menuCategories.id, categoryId))
      .returning();

    return NextResponse.json(updatedCategory);
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

// DELETE /api/categories?id=123 - удалить категорию
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get('id');

    if (!categoryId) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      );
    }

    // Проверяем, что категория принадлежит ресторану менеджера
    const existingCategory = await db.query.menuCategories.findFirst({
      where: and(
        eq(menuCategories.id, categoryId),
        eq(menuCategories.restaurantId, session.user.restaurantId)
      ),
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Проверяем, нет ли блюд в этой категории
    const menuItem = await db.query.menuItems.findFirst({
      where: (menuItems, { eq }) => eq(menuItems.categoryId, categoryId),
    });

    if (menuItem) {
      return NextResponse.json(
        { error: 'Cannot delete category with menu items. Delete all items first.' },
        { status: 400 }
      );
    }

    await db.delete(menuCategories).where(eq(menuCategories.id, categoryId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}
