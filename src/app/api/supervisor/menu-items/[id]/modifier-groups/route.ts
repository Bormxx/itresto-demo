import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { menuItems, menuItemModifierGroups, modifierGroups } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !["supervisor", "admin", "manager"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const menuItemId = id;

    // Get menu item to verify it exists and belongs to user's restaurant
    const [menuItem] = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.id, menuItemId));

    if (!menuItem) {
      return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
    }

    const userRestaurantId = session.user.restaurantId;
    if (userRestaurantId && userRestaurantId !== menuItem.restaurantId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get all linked modifier groups for this menu item
    const linkedGroups = await db
      .select({
        id: modifierGroups.id,
        name: modifierGroups.name,
        translations: modifierGroups.translations,
        required: modifierGroups.required,
        multiSelect: modifierGroups.multiSelect,
        minSelections: modifierGroups.minSelections,
        maxSelections: modifierGroups.maxSelections,
        sortOrder: menuItemModifierGroups.sortOrder,
      })
      .from(menuItemModifierGroups)
      .innerJoin(
        modifierGroups,
        eq(menuItemModifierGroups.modifierGroupId, modifierGroups.id)
      )
      .where(eq(menuItemModifierGroups.mainItemId, menuItemId))
      .orderBy(menuItemModifierGroups.sortOrder);

    return NextResponse.json(linkedGroups);
  } catch (error) {
    console.error("Error fetching modifier groups:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !["supervisor", "admin", "manager"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const menuItemId = id;
    const body = await req.json();
    const { groupIds } = body; // Array of modifier group IDs

    if (!Array.isArray(groupIds)) {
      return NextResponse.json({ error: "groupIds must be an array" }, { status: 400 });
    }

    // Get menu item to verify it exists and belongs to user's restaurant
    const [menuItem] = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.id, menuItemId));

    if (!menuItem) {
      return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
    }

    const userRestaurantId = session.user.restaurantId;
    if (userRestaurantId && userRestaurantId !== menuItem.restaurantId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Only allow assigning modifier groups to main items
    if (menuItem.type !== 'main') {
      return NextResponse.json(
        { error: "Modifier groups can only be assigned to main items" },
        { status: 400 }
      );
    }

    // Verify all groups exist and belong to the same restaurant
    if (groupIds.length > 0) {
      const groups = await db
        .select()
        .from(modifierGroups)
        .where(
          and(
            eq(modifierGroups.restaurantId, menuItem.restaurantId)
          )
        );

      const groupIdSet = new Set(groups.map(g => g.id));
      const invalidGroups = groupIds.filter(id => !groupIdSet.has(id));

      if (invalidGroups.length > 0) {
        return NextResponse.json(
          { error: "Some modifier groups are invalid" },
          { status: 400 }
        );
      }
    }

    // Delete existing links
    await db
      .delete(menuItemModifierGroups)
      .where(eq(menuItemModifierGroups.mainItemId, menuItemId));

    // Insert new links
    if (groupIds.length > 0) {
      const values = groupIds.map((groupId, index) => ({
        mainItemId: menuItemId,
        modifierGroupId: groupId,
        sortOrder: index,
      }));

      await db.insert(menuItemModifierGroups).values(values);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating modifier groups:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
