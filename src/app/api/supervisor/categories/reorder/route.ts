import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { menuCategories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !["supervisor", "admin", "manager"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { restaurantId, categoryIds } = body;

    if (!restaurantId || !Array.isArray(categoryIds)) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }

    const userRestaurantId = session.user.restaurantId;
    if (userRestaurantId && userRestaurantId !== restaurantId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Update displayOrder for each category
    const updatePromises = categoryIds.map((categoryId, index) =>
      db
        .update(menuCategories)
        .set({ displayOrder: index })
        .where(eq(menuCategories.id, categoryId))
    );

    await Promise.all(updatePromises);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering categories:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
