import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { orders, orderItems, menuItems, shifts, tables, users } from '@/lib/db/schema';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'current'; // 'current' or 'period'
    const shiftId = searchParams.get('shiftId');
    const tableId = searchParams.get('tableId');
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');

    let conditions = [eq(orders.waiterId, session.user.id)];

    // Filter by mode
    if (mode === 'current') {
      // Get current or last shift
      const [currentShift] = await db
        .select()
        .from(shifts)
        .where(eq(shifts.userId, session.user.id))
        .orderBy(desc(shifts.startedAt))
        .limit(1);

      if (currentShift) {
        conditions.push(gte(orders.createdAt, currentShift.startedAt));
        if (currentShift.endedAt) {
          conditions.push(lte(orders.createdAt, currentShift.endedAt));
        }
      }
    } else if (mode === 'period') {
      if (fromDate) {
        conditions.push(gte(orders.createdAt, new Date(fromDate)));
      }
      if (toDate) {
        const endOfDay = new Date(toDate);
        endOfDay.setHours(23, 59, 59, 999);
        conditions.push(lte(orders.createdAt, endOfDay));
      }
    }

    // Filter by shift
    if (shiftId) {
      const shift = await db.query.shifts.findFirst({
        where: eq(shifts.id, shiftId),
      });
      if (shift) {
        conditions.push(gte(orders.createdAt, shift.startedAt));
        if (shift.endedAt) {
          conditions.push(lte(orders.createdAt, shift.endedAt));
        }
      }
    }

    // Filter by table
    if (tableId) {
      conditions.push(eq(orders.tableId, tableId));
    }

    // Get orders with items
    const ordersList = await db.query.orders.findMany({
      where: and(...conditions),
      orderBy: [desc(orders.createdAt)],
      with: {
        orderItems: {
          with: {
            menuItem: true,
          },
        },
        table: true,
        client: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Get shift info for each order
    const ordersWithShifts = await Promise.all(
      ordersList.map(async (order) => {
        // Find which shift this order belongs to
        const shift = await db.query.shifts.findFirst({
          where: and(
            eq(shifts.userId, session.user.id),
            lte(shifts.startedAt, order.createdAt),
            sql`${shifts.endedAt} IS NULL OR ${shifts.endedAt} >= ${order.createdAt}`
          ),
        });

        return {
          ...order,
          client: order.client || null,
          shift: shift ? {
            id: shift.id,
            startedAt: shift.startedAt.toISOString(),
            endedAt: shift.endedAt?.toISOString() || null,
          } : null,
        };
      })
    );

    // Serialize dates
    const serializedOrders = ordersWithShifts.map((order) => ({
      ...order,
      customer: order.client || null, // Rename client to customer for frontend
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      orderItems: order.orderItems.map((item: any) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
    }));

    return NextResponse.json({ orders: serializedOrders });
  } catch (error) {
    console.error('Error fetching order history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order history' },
      { status: 500 }
    );
  }
}
