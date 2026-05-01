import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { modifiers, modifierGroups, menuItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !["supervisor", "admin", "manager"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");

    if (!groupId) {
      return NextResponse.json({ error: "groupId is required" }, { status: 400 });
    }

    // Verify group ownership
    const [group] = await db
      .select()
      .from(modifierGroups)
      .where(eq(modifierGroups.id, groupId));

    if (!group) {
      return NextResponse.json({ error: "Modifier group not found" }, { status: 404 });
    }

    const userRestaurantId = session.user.restaurantId;
    if (userRestaurantId && userRestaurantId !== group.restaurantId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const result = await db
      .select({
        modifier: modifiers,
        menuItem: menuItems,
      })
      .from(modifiers)
      .leftJoin(menuItems, eq(modifiers.menuItemId, menuItems.id))
      .where(eq(modifiers.modifierGroupId, groupId))
      .orderBy(modifiers.sortOrder);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching modifiers:", error);
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
      modifierGroupId,
      menuItemId,
      priceModifier,
      isDefault,
    } = body;

    if (!modifierGroupId || !menuItemId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify group ownership
    const [group] = await db
      .select()
      .from(modifierGroups)
      .where(eq(modifierGroups.id, modifierGroupId));

    if (!group) {
      return NextResponse.json({ error: "Modifier group not found" }, { status: 404 });
    }

    const userRestaurantId = session.user.restaurantId;
    if (userRestaurantId && userRestaurantId !== group.restaurantId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Verify menu item exists and is a modifier type
    const [menuItem] = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.id, menuItemId));

    if (!menuItem) {
      return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
    }

    if (menuItem.type !== 'modifier') {
      return NextResponse.json({ error: "Menu item must be of type 'modifier'" }, { status: 400 });
    }

    // Get max sortOrder
    const existing = await db
      .select()
      .from(modifiers)
      .where(eq(modifiers.modifierGroupId, modifierGroupId));

    const maxOrder = existing.length > 0 ? Math.max(...existing.map(m => m.sortOrder || 0)) : 0;

    const [newModifier] = await db
      .insert(modifiers)
      .values({
        modifierGroupId,
        menuItemId,
        priceModifier: priceModifier?.toString() || '0',
        isDefault: isDefault ?? false,
        sortOrder: maxOrder + 1,
      })
      .returning();

    return NextResponse.json(newModifier, { status: 201 });
  } catch (error) {
    console.error("Error creating modifier:", error);
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
      priceModifier,
      isDefault,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Modifier id is required" }, { status: 400 });
    }

    // Verify ownership through group
    const [modifier] = await db
      .select({
        modifier: modifiers,
        group: modifierGroups,
      })
      .from(modifiers)
      .leftJoin(modifierGroups, eq(modifiers.modifierGroupId, modifierGroups.id))
      .where(eq(modifiers.id, id));

    if (!modifier) {
      return NextResponse.json({ error: "Modifier not found" }, { status: 404 });
    }

    const userRestaurantId = session.user.restaurantId;
    if (userRestaurantId && modifier.group && userRestaurantId !== modifier.group.restaurantId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const updateData: any = {};
    if (priceModifier !== undefined) updateData.priceModifier = priceModifier.toString();
    if (isDefault !== undefined) updateData.isDefault = isDefault;
    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(modifiers)
      .set(updateData)
      .where(eq(modifiers.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating modifier:", error);
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
      return NextResponse.json({ error: "Modifier id is required" }, { status: 400 });
    }

    // Verify ownership through group
    const [modifier] = await db
      .select({
        modifier: modifiers,
        group: modifierGroups,
      })
      .from(modifiers)
      .leftJoin(modifierGroups, eq(modifiers.modifierGroupId, modifierGroups.id))
      .where(eq(modifiers.id, id));

    if (!modifier) {
      return NextResponse.json({ error: "Modifier not found" }, { status: 404 });
    }

    const userRestaurantId = session.user.restaurantId;
    if (userRestaurantId && modifier.group && userRestaurantId !== modifier.group.restaurantId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await db.delete(modifiers).where(eq(modifiers.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting modifier:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
