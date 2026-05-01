import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { modifierGroups } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

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
      .from(modifierGroups)
      .where(eq(modifierGroups.restaurantId, restaurantId))
      .orderBy(modifierGroups.sortOrder);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching modifier groups:", error);
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
    const {
      restaurantId,
      name,
      translations,
      required,
      multiSelect,
      minSelections,
      maxSelections,
    } = body;

    if (!restaurantId || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const userRestaurantId = session.user.restaurantId;
    if (userRestaurantId && userRestaurantId !== restaurantId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get max sortOrder
    const existing = await db
      .select()
      .from(modifierGroups)
      .where(eq(modifierGroups.restaurantId, restaurantId));

    const maxOrder = existing.length > 0 ? Math.max(...existing.map(g => g.sortOrder || 0)) : 0;

    const [newGroup] = await db
      .insert(modifierGroups)
      .values({
        restaurantId,
        name,
        translations: translations || null,
        required: required ?? false,
        multiSelect: multiSelect ?? false,
        minSelections: minSelections ?? 0,
        maxSelections: maxSelections ?? 1,
        sortOrder: maxOrder + 1,
      })
      .returning();

    return NextResponse.json(newGroup, { status: 201 });
  } catch (error) {
    console.error("Error creating modifier group:", error);
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
    const {
      id,
      name,
      translations,
      required,
      multiSelect,
      minSelections,
      maxSelections,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Group id is required" }, { status: 400 });
    }

    // Verify ownership
    const [group] = await db
      .select()
      .from(modifierGroups)
      .where(eq(modifierGroups.id, id));

    if (!group) {
      return NextResponse.json({ error: "Modifier group not found" }, { status: 404 });
    }

    const userRestaurantId = session.user.restaurantId;
    if (userRestaurantId && userRestaurantId !== group.restaurantId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (translations !== undefined) updateData.translations = translations;
    if (required !== undefined) updateData.required = required;
    if (multiSelect !== undefined) updateData.multiSelect = multiSelect;
    if (minSelections !== undefined) updateData.minSelections = minSelections;
    if (maxSelections !== undefined) updateData.maxSelections = maxSelections;
    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(modifierGroups)
      .set(updateData)
      .where(eq(modifierGroups.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating modifier group:", error);
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
      return NextResponse.json({ error: "Group id is required" }, { status: 400 });
    }

    // Verify ownership
    const [group] = await db
      .select()
      .from(modifierGroups)
      .where(eq(modifierGroups.id, id));

    if (!group) {
      return NextResponse.json({ error: "Modifier group not found" }, { status: 404 });
    }

    const userRestaurantId = session.user.restaurantId;
    if (userRestaurantId && userRestaurantId !== group.restaurantId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await db.delete(modifierGroups).where(eq(modifierGroups.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting modifier group:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
