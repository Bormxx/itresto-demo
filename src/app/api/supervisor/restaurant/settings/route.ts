import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { restaurants } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !["supervisor", "admin", "manager"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { restaurantId, supportedContentLocales } = body;

    if (!restaurantId) {
      return NextResponse.json({ error: "Restaurant ID is required" }, { status: 400 });
    }

    // Verify user has access to this restaurant
    if (session.user.restaurantId && session.user.restaurantId !== restaurantId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Validate supported locales
    if (supportedContentLocales && !Array.isArray(supportedContentLocales)) {
      return NextResponse.json(
        { error: "supportedContentLocales must be an array" },
        { status: 400 }
      );
    }

    if (supportedContentLocales && supportedContentLocales.length === 0) {
      return NextResponse.json(
        { error: "At least one locale must be supported" },
        { status: 400 }
      );
    }

    const allowedLocales = ['ru', 'en'];
    if (supportedContentLocales) {
      const invalidLocales = supportedContentLocales.filter(
        (loc: string) => !allowedLocales.includes(loc)
      );
      if (invalidLocales.length > 0) {
        return NextResponse.json(
          { error: `Invalid locales: ${invalidLocales.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Update restaurant settings
    const [updated] = await db
      .update(restaurants)
      .set({
        supportedContentLocales: supportedContentLocales || undefined,
      })
      .where(eq(restaurants.id, restaurantId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, restaurant: updated });
  } catch (error) {
    console.error("Error updating restaurant settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
