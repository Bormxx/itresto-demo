import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { menuCategories, restaurants } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !["supervisor", "admin", "manager"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get("restaurantId");

    if (!restaurantId) {
      return NextResponse.json({ error: "restaurantId is required" }, { status: 400 });
    }

    const userRestaurantId = session.user.restaurantId;
    if (userRestaurantId && userRestaurantId !== restaurantId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const result = await db
      .select()
      .from(menuCategories)
      .where(eq(menuCategories.restaurantId, restaurantId))
      .orderBy(menuCategories.displayOrder);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !["supervisor", "admin", "manager"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { restaurantId, translations, isActive } = body;

    if (!restaurantId || !translations) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const userRestaurantId = session.user.restaurantId;
    if (userRestaurantId && userRestaurantId !== restaurantId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get max displayOrder
    const maxOrder = await db
      .select({ maxOrder: menuCategories.displayOrder })
      .from(menuCategories)
      .where(eq(menuCategories.restaurantId, restaurantId))
      .orderBy(desc(menuCategories.displayOrder))
      .limit(1);

    const newOrder = maxOrder[0]?.maxOrder ? maxOrder[0].maxOrder + 1 : 0;

    // Get first translation for name field
    const firstTranslation = Object.values(JSON.parse(translations))[0] as any;

    const [newCategory] = await db
      .insert(menuCategories)
      .values({
        restaurantId,
        name: firstTranslation?.name || 'New Category',
        translations,
        isActive: isActive ?? true,
        displayOrder: newOrder,
      })
      .returning();

    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !["supervisor", "admin", "manager"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, translations, isActive, displayOrder } = body;

    if (!id) {
      return NextResponse.json({ error: "Category id is required" }, { status: 400 });
    }

    // Verify ownership
    const [category] = await db
      .select()
      .from(menuCategories)
      .where(eq(menuCategories.id, id));

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const userRestaurantId = session.user.restaurantId;
    if (userRestaurantId && userRestaurantId !== category.restaurantId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const updateData: any = {};
    if (translations !== undefined) {
      updateData.translations = translations;
      const firstTranslation = Object.values(JSON.parse(translations))[0] as any;
      updateData.name = firstTranslation?.name || category.name;
    }
    if (isActive !== undefined) updateData.isActive = isActive;
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder;

    const [updated] = await db
      .update(menuCategories)
      .set(updateData)
      .where(eq(menuCategories.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !["supervisor", "admin", "manager"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Category id is required" }, { status: 400 });
    }

    // Verify ownership
    const [category] = await db
      .select()
      .from(menuCategories)
      .where(eq(menuCategories.id, id));

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const userRestaurantId = session.user.restaurantId;
    if (userRestaurantId && userRestaurantId !== category.restaurantId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await db.delete(menuCategories).where(eq(menuCategories.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
