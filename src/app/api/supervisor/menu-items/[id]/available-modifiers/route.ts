import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { menuItems, menuItemAvailableModifiers, menuItemModifierGroups, modifiers, modifierGroups, menuItems as modifierMenuItems } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";

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

    // Get all available modifiers for this menu item
    const availableModifiers = await db
      .select({
        id: menuItemAvailableModifiers.id,
        modifierId: menuItemAvailableModifiers.modifierId,
        isDefaultForItem: menuItemAvailableModifiers.isDefaultForItem,
        sortOrder: menuItemAvailableModifiers.sortOrder,
      })
      .from(menuItemAvailableModifiers)
      .where(eq(menuItemAvailableModifiers.mainItemId, menuItemId))
      .orderBy(menuItemAvailableModifiers.sortOrder);

    return NextResponse.json(availableModifiers);
  } catch (error) {
    console.error("Error fetching available modifiers:", error);
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
    const { modifierIds, defaultModifierIds } = body; // modifierIds - все доступные, defaultModifierIds - по умолчанию

    if (!Array.isArray(modifierIds)) {
      return NextResponse.json({ error: "modifierIds must be an array" }, { status: 400 });
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

    // Only allow assigning modifiers to main items
    if (menuItem.type !== 'main') {
      return NextResponse.json(
        { error: "Available modifiers can only be assigned to main items" },
        { status: 400 }
      );
    }

    // Verify all modifiers exist and belong to the same restaurant
    if (modifierIds.length > 0) {
      const modifierRecords = await db
        .select({
          modifierId: modifiers.id,
          groupId: modifiers.modifierGroupId,
        })
        .from(modifiers)
        .innerJoin(modifierGroups, eq(modifiers.modifierGroupId, modifierGroups.id))
        .where(
          and(
            inArray(modifiers.id, modifierIds),
            eq(modifierGroups.restaurantId, menuItem.restaurantId)
          )
        );

      if (modifierRecords.length !== modifierIds.length) {
        return NextResponse.json(
          { error: "Some modifiers are invalid or don't belong to this restaurant" },
          { status: 400 }
        );
      }
    }

    // Delete existing available modifiers and modifier groups
    await db
      .delete(menuItemAvailableModifiers)
      .where(eq(menuItemAvailableModifiers.mainItemId, menuItemId));
    
    await db
      .delete(menuItemModifierGroups)
      .where(eq(menuItemModifierGroups.mainItemId, menuItemId));

    // Insert new available modifiers and modifier groups
    if (modifierIds.length > 0) {
      // Get unique groups from selected modifiers
      const modifierRecords = await db
        .select({
          modifierId: modifiers.id,
          groupId: modifiers.modifierGroupId,
        })
        .from(modifiers)
        .where(inArray(modifiers.id, modifierIds));
      
      const uniqueGroups = [...new Set(modifierRecords.map(m => m.groupId))];
      
      // Insert modifier groups associations
      if (uniqueGroups.length > 0) {
        const groupValues = uniqueGroups.map((groupId, index) => ({
          mainItemId: menuItemId,
          modifierGroupId: groupId,
          sortOrder: index,
        }));
        
        await db.insert(menuItemModifierGroups).values(groupValues);
      }
      
      // Insert available modifiers
      const defaultSet = new Set(defaultModifierIds || []);
      const values = modifierIds.map((modifierId, index) => ({
        mainItemId: menuItemId,
        modifierId: modifierId,
        isDefaultForItem: defaultSet.has(modifierId),
        sortOrder: index,
      }));

      await db.insert(menuItemAvailableModifiers).values(values);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating available modifiers:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
