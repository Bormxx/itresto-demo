import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { modifierGroups, modifiers, menuItemModifierGroups, menuItems, menuItemAvailableModifiers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const menuItemId = id; // ID is a UUID string, not a number

    // Получаем группы модификаторов для этого блюда
    const groups = await db
      .select({
        id: modifierGroups.id,
        name: modifierGroups.name,
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
      .where(eq(menuItemModifierGroups.mainItemId, id))
      .orderBy(menuItemModifierGroups.sortOrder);

    // Для каждой группы получаем модификаторы
    const groupsWithModifiers = await Promise.all(
      groups.map(async (group) => {
        // Get only modifiers that are available for this menu item
        const groupModifiers = await db
          .select({
            id: modifiers.id,
            modifierGroupId: modifiers.modifierGroupId,
            menuItemId: modifiers.menuItemId,
            priceModifier: modifiers.priceModifier,
            isDefault: menuItemAvailableModifiers.isDefaultForItem, // Use item-specific default
            sortOrder: menuItemAvailableModifiers.sortOrder, // Use item-specific sort order
            name: menuItems.name,
            description: menuItems.description,
            imageUrl: menuItems.imageUrl,
            calories: menuItems.calories,
            proteins: menuItems.proteins,
            fats: menuItems.fats,
            carbohydrates: menuItems.carbohydrates,
            isAvailable: menuItems.isAvailable, // Check if modifier itself is available
          })
          .from(menuItemAvailableModifiers)
          .innerJoin(modifiers, eq(menuItemAvailableModifiers.modifierId, modifiers.id))
          .innerJoin(menuItems, eq(modifiers.menuItemId, menuItems.id))
          .where(
            and(
              eq(menuItemAvailableModifiers.mainItemId, menuItemId),
              eq(modifiers.modifierGroupId, group.id),
              eq(menuItems.isAvailable, true) // Only show available modifiers
            )
          )
          .orderBy(menuItemAvailableModifiers.sortOrder);

        return {
          ...group,
          modifiers: groupModifiers,
        };
      })
    );

    return NextResponse.json(groupsWithModifiers);
  } catch (error) {
    console.error('Error fetching menu item modifiers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch modifiers' },
      { status: 500 }
    );
  }
}
