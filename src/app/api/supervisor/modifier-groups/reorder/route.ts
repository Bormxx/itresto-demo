import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { modifierGroups } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !["supervisor", "admin", "manager"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { restaurantId, groupIds } = await req.json();

    if (!restaurantId || !Array.isArray(groupIds)) {
      return NextResponse.json({ error: "restaurantId and groupIds are required" }, { status: 400 });
    }

    const userRestaurantId = session.user.restaurantId;
    if (userRestaurantId && userRestaurantId !== restaurantId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Update sortOrder for each group
    const updates = groupIds.map((groupId, index) =>
      db
        .update(modifierGroups)
        .set({ sortOrder: index })
        .where(eq(modifierGroups.id, groupId))
    );

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering modifier groups:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
