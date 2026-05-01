import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id: orderId } = await params;

    // Fetch order with details
    const order = await db.query.orders.findFirst({
      where: and(
        eq(orders.id, orderId),
        eq(orders.waiterId, userId)
      ),
      with: {
        orderItems: {
          with: {
            menuItem: true,
          },
        },
        client: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        tableNumber: order.tableNumber,
        total: order.total,
        tipAmount: order.tipAmount || '0',
        status: order.status,
        createdAt: order.createdAt.toISOString(),
        completedAt: order.completedAt?.toISOString() || null,
        billType: order.billType,
        paymentStatus: order.paymentStatus,
        clientId: order.clientId,
        client: order.client ? {
          id: order.client.id,
          email: order.client.email,
          phone: order.client.phone,
        } : null,
        items: order.orderItems.map(item => ({
          id: item.id,
          quantity: item.quantity,
          priceAtOrder: item.priceAtOrder,
          status: item.status,
          menuItem: item.menuItem ? {
            id: item.menuItem.id,
            name: item.menuItem.name,
            description: item.menuItem.description,
            imageUrl: item.menuItem.imageUrl,
          } : null,
        })),
      },
    });
  } catch (error) {
    console.error('Order details error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order details' },
      { status: 500 }
    );
  }
}
