import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { guestDevices, orders, orderItems, menuItems } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

/**
 * GET /api/guest/history?deviceUuid=...&restaurantId=...
 * Load guest order history and personalized recommendations
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const deviceUuid = searchParams.get('deviceUuid');
  const restaurantId = searchParams.get('restaurantId');
  
  if (!deviceUuid || !restaurantId) {
    return Response.json({ history: null }, { status: 400 });
  }
  
  try {
    // Find guest device
    const guest = await db.query.guestDevices.findFirst({
      where: and(
        eq(guestDevices.deviceUuid, deviceUuid),
        eq(guestDevices.restaurantId, restaurantId)
      )
    });
    
    if (!guest) {
      // Guest not found - this is their first visit (no orders yet)
      return Response.json({ history: null });
    }
    
    // If guest has no orders, don't show history
    if (guest.totalOrders === 0) {
      return Response.json({ history: null });
    }
    
    // Load order history with items and menu details
    const guestOrders = await db.query.orders.findMany({
      where: eq(orders.guestDeviceId, guest.id),
      with: {
        orderItems: {
          with: {
            menuItem: true
          }
        }
      },
      orderBy: desc(orders.createdAt),
      limit: 10
    });
    
    // Analyze favorite items
    const itemFrequency = new Map<string, { 
      id: string;
      name: string; 
      count: number;
      imageUrl: string | null;
    }>();
    
    guestOrders.forEach(order => {
      order.orderItems.forEach(item => {
        if (item.menuItem) {
          const current = itemFrequency.get(item.menuItem.id) || { 
            id: item.menuItem.id,
            name: item.menuItem.name,
            count: 0,
            imageUrl: item.menuItem.imageUrl
          };
          itemFrequency.set(item.menuItem.id, {
            ...current,
            count: current.count + item.quantity
          });
        }
      });
    });
    
    // Get top 3 favorite items
    const favoriteItems = Array.from(itemFrequency.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    
    // Get recent orders summary (last 3)
    const recentOrders = guestOrders.slice(0, 3).map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      total: order.total,
      itemCount: order.orderItems.length,
      createdAt: order.createdAt
    }));
    
    return Response.json({
      history: {
        totalOrders: guest.totalOrders,
        totalSpent: guest.totalSpent,
        firstVisit: guest.firstSeenAt,
        lastVisit: guest.lastSeenAt,
        favoriteItems,
        recentOrders
      }
    });
    
  } catch (error) {
    console.error('Error loading guest history:', error);
    return Response.json(
      { error: 'Failed to load history' },
      { status: 500 }
    );
  }
}
