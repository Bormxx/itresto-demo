import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { restaurants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    const restaurant = await db.query.restaurants.findFirst({
      where: eq(restaurants.slug, slug),
      columns: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logoUrl: true,
        themeConfig: true,
        isActive: true,
      },
    });

    if (!restaurant) {
      return NextResponse.json(
        { success: false, error: 'Ресторан не найден' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, restaurant });
  } catch (error) {
    console.error('Error fetching restaurant:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при загрузке данных ресторана' },
      { status: 500 }
    );
  }
}
