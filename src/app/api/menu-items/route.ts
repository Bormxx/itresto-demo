import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { menuItems, departments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/menu-items - получить все блюда ресторана (с опциональным фильтром по категории)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get('categoryId');

    let items;
    if (categoryId) {
      items = await db.query.menuItems.findMany({
        where: and(
          eq(menuItems.restaurantId, session.user.restaurantId),
          eq(menuItems.categoryId, categoryId)
        ),
        with: {
          category: true,
        },
        orderBy: (menuItems, { asc }) => [asc(menuItems.name)],
      });
    } else {
      items = await db.query.menuItems.findMany({
        where: eq(menuItems.restaurantId, session.user.restaurantId),
        with: {
          category: true,
        },
        orderBy: (menuItems, { asc }) => [asc(menuItems.name)],
      });
    }

    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching menu items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch menu items' },
      { status: 500 }
    );
  }
}

// POST /api/menu-items - создать новое блюдо
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, price, categoryId, prepDepartmentId, available, imageUrl } = body;

    // Валидация обязательных полей
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (!price || typeof price !== 'number' || price <= 0) {
      return NextResponse.json(
        { error: 'Price is required and must be a positive number' },
        { status: 400 }
      );
    }

    if (!categoryId || typeof categoryId !== 'string') {
      return NextResponse.json(
        { error: 'Category ID is required and must be a string (UUID)' },
        { status: 400 }
      );
    }

    // Валидация prepDepartmentId - опциональный, но если указан, должен существовать и быть отделом приготовления
    if (prepDepartmentId) {
      const prepDept = await db.query.departments.findFirst({
        where: and(
          eq(departments.id, prepDepartmentId),
          eq(departments.restaurantId, session.user.restaurantId),
          eq(departments.isFoodPreparation, true)
        ),
      });

      if (!prepDept) {
        return NextResponse.json(
          { error: 'Prep department not found or is not a food preparation department' },
          { status: 400 }
        );
      }
    }

    // Проверяем, что категория существует и принадлежит ресторану
    const category = await db.query.menuCategories.findFirst({
      where: (menuCategories, { eq, and }) =>
        and(
          eq(menuCategories.id, categoryId),
          eq(menuCategories.restaurantId, session.user.restaurantId)
        ),
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found or does not belong to your restaurant' },
        { status: 404 }
      );
    }

    const [newItem] = await db
      .insert(menuItems)
      .values({
        restaurantId: session.user.restaurantId,
        categoryId,
        name: name.trim(),
        description: description?.trim() || null,
        price: price.toString(),
        prepDepartmentId: prepDepartmentId || null,
        isAvailable: available !== undefined ? available : true,
        imageUrl: imageUrl?.trim() || null,
      })
      .returning();

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error('Error creating menu item:', error);
    return NextResponse.json(
      { error: 'Failed to create menu item' },
      { status: 500 }
    );
  }
}

// PATCH /api/menu-items?id=123 - обновить блюдо
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
    const itemId = searchParams.get('id');

    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description, price, categoryId, prepDepartmentId, available, imageUrl } = body;

    // Проверяем, что блюдо существует и принадлежит ресторану
    const existingItem = await db.query.menuItems.findFirst({
      where: and(
        eq(menuItems.id, itemId),
        eq(menuItems.restaurantId, session.user.restaurantId)
      ),
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Menu item not found' },
        { status: 404 }
      );
    }

    // Если меняем категорию, проверяем что она существует
    if (categoryId) {
      const category = await db.query.menuCategories.findFirst({
        where: (menuCategories, { eq, and }) =>
          and(
            eq(menuCategories.id, categoryId),
            eq(menuCategories.restaurantId, session.user.restaurantId)
          ),
      });

      if (!category) {
        return NextResponse.json(
          { error: 'Category not found or does not belong to your restaurant' },
          { status: 404 }
        );
      }
    }

    // Валидация prepDepartmentId если он меняется
    if (prepDepartmentId !== undefined && prepDepartmentId !== null) {
      const prepDept = await db.query.departments.findFirst({
        where: and(
          eq(departments.id, prepDepartmentId),
          eq(departments.restaurantId, session.user.restaurantId),
          eq(departments.isFoodPreparation, true)
        ),
      });

      if (!prepDept) {
        return NextResponse.json(
          { error: 'Prep department not found or is not a food preparation department' },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (price !== undefined) {
      if (typeof price !== 'number' || price <= 0) {
        return NextResponse.json(
          { error: 'Price must be a positive number' },
          { status: 400 }
        );
      }
      updateData.price = price.toString();
    }
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (prepDepartmentId !== undefined) updateData.prepDepartmentId = prepDepartmentId;
    if (available !== undefined) updateData.isAvailable = available;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl?.trim() || null;

    const [updatedItem] = await db
      .update(menuItems)
      .set(updateData)
      .where(eq(menuItems.id, itemId))
      .returning();

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('Error updating menu item:', error);
    return NextResponse.json(
      { error: 'Failed to update menu item' },
      { status: 500 }
    );
  }
}

// DELETE /api/menu-items?id=123 - удалить блюдо
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
    const itemId = searchParams.get('id');

    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    // Проверяем, что блюдо существует и принадлежит ресторану
    const existingItem = await db.query.menuItems.findFirst({
      where: and(
        eq(menuItems.id, itemId),
        eq(menuItems.restaurantId, session.user.restaurantId)
      ),
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Menu item not found' },
        { status: 404 }
      );
    }

    await db.delete(menuItems).where(eq(menuItems.id, itemId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    return NextResponse.json(
      { error: 'Failed to delete menu item' },
      { status: 500 }
    );
  }
}
