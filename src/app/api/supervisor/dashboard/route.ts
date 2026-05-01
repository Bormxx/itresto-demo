import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { shiftSchedules, shiftTemplates, shiftStaffAssignments, users, tables, menuItems, orders, restaurants } from "@/lib/db/schema";
import { eq, and, count, inArray } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !["supervisor", "admin", "manager"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get("restaurantId");

    if (!restaurantId) {
      return NextResponse.json({ error: "Restaurant ID is required" }, { status: 400 });
    }

    // Verify user has access to this restaurant
    if (session.user.restaurantId && session.user.restaurantId !== restaurantId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get current shift schedule for today
    const today = new Date().toISOString().split('T')[0];
    const [currentSchedule] = await db
      .select({
        id: shiftSchedules.id,
        date: shiftSchedules.date,
        isDayOff: shiftSchedules.isDayOff,
        templateName: shiftTemplates.name,
        startTime: shiftTemplates.startTime,
        durationHours: shiftTemplates.durationHours,
      })
      .from(shiftSchedules)
      .leftJoin(shiftTemplates, eq(shiftSchedules.shiftTemplateId, shiftTemplates.id))
      .where(
        and(
          eq(shiftSchedules.restaurantId, restaurantId),
          eq(shiftSchedules.date, today)
        )
      )
      .limit(1);

    let shiftInfo = null;
    if (currentSchedule && !currentSchedule.isDayOff) {
      // Count staff assigned to this shift
      const [staffCount] = await db
        .select({ count: count() })
        .from(shiftStaffAssignments)
        .where(eq(shiftStaffAssignments.shiftScheduleId, currentSchedule.id));

      shiftInfo = {
        id: currentSchedule.id,
        startedAt: `${currentSchedule.date}T${currentSchedule.startTime || '09:00'}`,
        managerName: currentSchedule.templateName || null,
        workingStaff: staffCount?.count || 0,
      };
    }

    // Get restaurant stats
    const [tablesCount] = await db
      .select({ count: count() })
      .from(tables)
      .where(eq(tables.restaurantId, restaurantId));

    const [menuItemsCount] = await db
      .select({ count: count() })
      .from(menuItems)
      .where(
        and(
          eq(menuItems.restaurantId, restaurantId),
          eq(menuItems.type, 'main')
        )
      );

    const [activeOrdersCount] = await db
      .select({ count: count() })
      .from(orders)
      .where(
        and(
          eq(orders.restaurantId, restaurantId),
          inArray(orders.status, ['pending', 'confirmed', 'preparing', 'ready'])
        )
      );

    // Get restaurant supported locales
    const [restaurant] = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId))
      .limit(1);

    const supportedLocales = restaurant?.supportedContentLocales || ['ru', 'en'];

    const stats = {
      totalTables: tablesCount?.count || 0,
      totalMenuItems: menuItemsCount?.count || 0,
      activeOrders: activeOrdersCount?.count || 0,
      supportedLocales: Array.isArray(supportedLocales) ? supportedLocales : ['ru', 'en'],
    };

    return NextResponse.json({
      shift: shiftInfo,
      stats,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
