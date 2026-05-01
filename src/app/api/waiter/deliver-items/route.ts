import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orderItems, orders } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== "waiter") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { deliveries } = await req.json();

    if (!deliveries || !Array.isArray(deliveries)) {
      return NextResponse.json({ error: "Missing deliveries array" }, { status: 400 });
    }

    // Update each item's delivered quantity
    for (const delivery of deliveries) {
      const { orderItemId, quantityDelivered } = delivery;
      
      if (!orderItemId || quantityDelivered === undefined) {
        continue;
      }

      // Получить текущее состояние позиции
      const currentItem = await db.query.orderItems.findFirst({
        where: eq(orderItems.id, orderItemId),
        with: {
          menuItem: {
            with: {
              prepDepartment: true,
            },
          },
        },
      });

      if (!currentItem) continue;

      const newQuantityDelivered = currentItem.quantityDelivered + quantityDelivered;
      const isFullyDelivered = newQuantityDelivered >= currentItem.quantity;

      // Определить какие статусы нужно обновить
      const deptName = currentItem.menuItem?.prepDepartment?.name;
      const updates: any = { 
        quantityDelivered: sql`${orderItems.quantityDelivered} + ${quantityDelivered}`,
        updatedAt: new Date()
      };

      // Если полностью доставлено - обновить статусы на delivered
      if (isFullyDelivered) {
        if (deptName === 'Бар') {
          updates.barStatus = 'delivered';
        } else {
          // По умолчанию (для "Кухня" и других отделов) используем kitchenStatus
          updates.kitchenStatus = 'delivered';
        }
        updates.status = 'delivered';
      }

      await db
        .update(orderItems)
        .set(updates)
        .where(eq(orderItems.id, orderItemId));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error delivering items:", error);
    return NextResponse.json(
      { error: "Failed to deliver items" },
      { status: 500 }
    );
  }
}
