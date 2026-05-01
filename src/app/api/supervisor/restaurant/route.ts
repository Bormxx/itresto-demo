import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { restaurants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET - Получить данные ресторана
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.restaurantId) {
      return NextResponse.json(
        { error: 'Not authenticated or no restaurant assigned' },
        { status: 401 }
      );
    }

    const restaurant = await db.query.restaurants.findFirst({
      where: eq(restaurants.id, session.user.restaurantId),
    });

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      restaurant: {
        id: restaurant.id,
        slug: restaurant.slug,
        name: restaurant.name,
        description: restaurant.description,
        logoUrl: restaurant.logoUrl,
      }
    });
  } catch (error) {
    console.error('Error fetching restaurant:', error);
    return NextResponse.json(
      { error: 'Failed to fetch restaurant data' },
      { status: 500 }
    );
  }
}
