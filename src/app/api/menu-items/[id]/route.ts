import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { menuItems } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/menu-items/[id] - получить блюдо по ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const menuItem = await db.query.menuItems.findFirst({
      where: eq(menuItems.id, id),
    });

    if (!menuItem) {
      return NextResponse.json(
        { success: false, error: 'Menu item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      menuItem,
    });
  } catch (error) {
    console.error('Error fetching menu item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch menu item' },
      { status: 500 }
    );
  }
}
