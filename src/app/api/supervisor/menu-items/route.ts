import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { menuItems, menuCategories } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { logCreate, logUpdate, logDelete } from '@/lib/auditLog';
import { checkWriteRateLimit, getClientIp, createRateLimitResponse } from '@/lib/rateLimit';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !["supervisor", "admin", "manager"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get("restaurantId");
    const categoryId = searchParams.get("categoryId");
    const type = searchParams.get("type") as 'main' | 'modifier' | null;

    if (!restaurantId) {
      return NextResponse.json({ error: "restaurantId is required" }, { status: 400 });
    }

    const userRestaurantId = session.user.restaurantId;
    if (userRestaurantId && userRestaurantId !== restaurantId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const conditions = [eq(menuItems.restaurantId, restaurantId)];
    if (categoryId) {
      conditions.push(eq(menuItems.categoryId, categoryId));
    }
    if (type) {
      conditions.push(eq(menuItems.type, type));
    }

    const result = await db
      .select()
      .from(menuItems)
      .where(and(...conditions));
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching menu items:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting: 20 запросов в минуту
    const clientIp = getClientIp(req);
    const rateLimitResult = await checkWriteRateLimit(clientIp);
    
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const session = await auth();
    if (!session?.user || !["supervisor", "admin", "manager"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      restaurantId,
      categoryId,
      translations,
      price,
      imageUrl,
      isAvailable,
      calories,
      protein,
      fat,
      carbs,
      prepDepartmentId,
      type,
    } = body;

    if (!restaurantId || !translations || price === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // categoryId is required only for main items (not for modifiers)
    if (type === 'main' && !categoryId) {
      return NextResponse.json({ error: "categoryId is required for main items" }, { status: 400 });
    }

    const userRestaurantId = session.user.restaurantId;
    if (userRestaurantId && userRestaurantId !== restaurantId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Verify category belongs to restaurant (only for main items)
    if (categoryId) {
      const [category] = await db
        .select()
        .from(menuCategories)
        .where(
          and(
            eq(menuCategories.id, categoryId),
            eq(menuCategories.restaurantId, restaurantId)
          )
        );

      if (!category) {
        return NextResponse.json({ error: "Category not found" }, { status: 404 });
      }
    }

    // Get first translation for name field
    const firstTranslation = Object.values(JSON.parse(translations))[0] as any;

    const [newItem] = await db
      .insert(menuItems)
      .values({
        restaurantId,
        categoryId,
        name: firstTranslation?.name || 'New Item',
        translations,
        price: price.toString(),
        imageUrl: imageUrl || null,
        isAvailable: isAvailable ?? true,
        calories: calories || null,
        proteins: protein || null,
        fats: fat || null,
        carbohydrates: carbs || null,
        prepDepartmentId: prepDepartmentId || null,
        type: type || 'main',
      })
      .returning();

    // Audit log
    await logCreate(
      'menu_item',
      newItem.id,
      {
        name: newItem.name,
        price: newItem.price,
        categoryId: newItem.categoryId,
        type: newItem.type,
      },
      session.user.id,
      restaurantId
    );

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error("Error creating menu item:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    // Rate limiting: 20 запросов в минуту
    const clientIp = getClientIp(req);
    const rateLimitResult = await checkWriteRateLimit(clientIp);
    
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const session = await auth();
    if (!session?.user || !["supervisor", "admin", "manager"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      id,
      categoryId,
      translations,
      price,
      imageUrl,
      isAvailable,
      calories,
      protein,
      fat,
      carbs,
      prepDepartmentId,
      type,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Menu item id is required" }, { status: 400 });
    }

    // Verify ownership
    const [item] = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.id, id));

    if (!item) {
      return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
    }

    const userRestaurantId = session.user.restaurantId;
    if (userRestaurantId && userRestaurantId !== item.restaurantId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // If changing category, verify new category
    if (categoryId && categoryId !== item.categoryId) {
      const [category] = await db
        .select()
        .from(menuCategories)
        .where(
          and(
            eq(menuCategories.id, categoryId),
            eq(menuCategories.restaurantId, item.restaurantId)
          )
        );

      if (!category) {
        return NextResponse.json({ error: "Category not found" }, { status: 404 });
      }
    }

    const updateData: any = {};
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (translations !== undefined) {
      updateData.translations = translations;
      const firstTranslation = Object.values(JSON.parse(translations))[0] as any;
      updateData.name = firstTranslation?.name || item.name;
    }
    if (price !== undefined) updateData.price = price.toString();
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;
    if (calories !== undefined) updateData.calories = calories;
    if (protein !== undefined) updateData.proteins = protein;
    if (fat !== undefined) updateData.fats = fat;
    if (carbs !== undefined) updateData.carbohydrates = carbs;
    if (prepDepartmentId !== undefined) updateData.prepDepartmentId = prepDepartmentId;
    if (type !== undefined) updateData.type = type;

    const [updated] = await db
      .update(menuItems)
      .set(updateData)
      .where(eq(menuItems.id, id))
      .returning();

    // Audit log
    await logUpdate(
      'menu_item',
      id,
      {
        name: item.name,
        price: item.price,
        categoryId: item.categoryId,
        isAvailable: item.isAvailable,
      },
      {
        name: updated.name,
        price: updated.price,
        categoryId: updated.categoryId,
        isAvailable: updated.isAvailable,
      },
      session.user.id,
      item.restaurantId
    );

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating menu item:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Rate limiting: 20 запросов в минуту
    const clientIp = getClientIp(req);
    const rateLimitResult = await checkWriteRateLimit(clientIp);
    
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const session = await auth();
    if (!session?.user || !["supervisor", "admin", "manager"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Menu item id is required" }, { status: 400 });
    }

    // Verify ownership
    const [item] = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.id, id));

    if (!item) {
      return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
    }

    const userRestaurantId = session.user.restaurantId;
    if (userRestaurantId && userRestaurantId !== item.restaurantId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await db.delete(menuItems).where(eq(menuItems.id, id));

    // Audit log
    await logDelete(
      'menu_item',
      id,
      {
        name: item.name,
        price: item.price,
        categoryId: item.categoryId,
      },
      session.user.id,
      item.restaurantId
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting menu item:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
