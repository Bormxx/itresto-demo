import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, shifts } from '@/lib/db/schema';
import { eq, and, desc, gte, lte, inArray, sql } from 'drizzle-orm';
import * as jose from 'jose';

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'default-secret');

async function verifyToken(token: string) {
  try {
    const { payload } = await jose.jwtVerify(token, SECRET);
    return payload;
  } catch (error) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token);

    if (!payload?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = payload.userId as string;

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const shiftId = searchParams.get('shiftId');
    const tableNumbers = searchParams.get('tableNumbers'); // Comma-separated list
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Build orders query
    const conditions = [
      eq(orders.waiterId, userId),
      inArray(orders.status, ['completed', 'cancelled']), // Only finished orders
    ];

    // Date range filter
    if (from) {
      conditions.push(gte(orders.createdAt, new Date(from)));
    }
    if (to) {
      conditions.push(lte(orders.createdAt, new Date(to)));
    }

    // Table numbers filter (multiple tables separated by comma)
    if (tableNumbers) {
      const tableNumberList = tableNumbers.split(',').map(n => n.trim()).filter(n => n);
      if (tableNumberList.length > 0) {
        conditions.push(inArray(orders.tableNumber, tableNumberList));
      }
    }

    // Shift filter
    if (shiftId) {
      // Get shift time range
      const shift = await db
        .select({ startedAt: shifts.startedAt, endedAt: shifts.endedAt })
        .from(shifts)
        .where(eq(shifts.id, shiftId))
        .limit(1);

      if (shift.length > 0) {
        conditions.push(gte(orders.createdAt, shift[0].startedAt));
        if (shift[0].endedAt) {
          conditions.push(lte(orders.createdAt, shift[0].endedAt));
        }
      }
    }

    // Fetch orders with shift information
    const ordersList = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        tableNumber: orders.tableNumber,
        total: orders.total,
        tipAmount: orders.tipAmount,
        status: orders.status,
        createdAt: orders.createdAt,
        completedAt: orders.completedAt,
        clientId: orders.clientId,
        billType: orders.billType,
        paymentStatus: orders.paymentStatus,
        shiftId: shifts.id,
        shiftStartedAt: shifts.startedAt,
        shiftEndedAt: shifts.endedAt,
      })
      .from(orders)
      .leftJoin(
        shifts,
        and(
          eq(shifts.userId, userId),
          gte(orders.createdAt, shifts.startedAt),
          sql`${orders.createdAt} <= COALESCE(${shifts.endedAt}, NOW())`
        )
      )
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt))
      .limit(100); // Limit to 100 orders

    return NextResponse.json({
      orders: ordersList.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        tableNumber: order.tableNumber,
        total: order.total,
        tipAmount: order.tipAmount || '0',
        status: order.status,
        createdAt: order.createdAt.toISOString(),
        completedAt: order.completedAt?.toISOString() || null,
        clientId: order.clientId,
        billType: order.billType,
        paymentStatus: order.paymentStatus,
        shift: order.shiftId ? {
          id: order.shiftId,
          startedAt: order.shiftStartedAt?.toISOString(),
          endedAt: order.shiftEndedAt?.toISOString() || null,
        } : null,
      })),
    });
  } catch (error) {
    console.error('Order history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order history' },
      { status: 500 }
    );
  }
}
