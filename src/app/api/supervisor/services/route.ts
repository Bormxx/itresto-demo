import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { services, restaurantServices } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET - Получить все услуги и текущую подписку ресторана
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.restaurantId) {
      return NextResponse.json(
        { error: 'Not authenticated or no restaurant assigned' },
        { status: 401 }
      );
    }

    // Получаем все активные услуги
    const allServices = await db.query.services.findMany({
      where: eq(services.isActive, true),
      orderBy: (services, { asc }) => [asc(services.name)]
    });

    // Получаем подключенные услуги ресторана
    const activeServices = await db.query.restaurantServices.findMany({
      where: eq(restaurantServices.restaurantId, session.user.restaurantId),
      with: {
        service: true
      }
    });

    // Проверяем, какие услуги активны сейчас
    const now = new Date();
    const activeServiceIds = new Set(
      activeServices
        .filter(rs => !rs.expiresAt || new Date(rs.expiresAt) > now)
        .map(rs => rs.serviceId)
    );

    // Добавляем информацию о статусе для каждой услуги
    const servicesWithStatus = allServices.map(service => {
      const restaurantService = activeServices.find(rs => rs.serviceId === service.id);
      return {
        ...service,
        isSubscribed: activeServiceIds.has(service.id),
        activatedAt: restaurantService?.activatedAt || null,
        expiresAt: restaurantService?.expiresAt || null,
      };
    });

    return NextResponse.json({
      services: servicesWithStatus,
      activeCount: activeServiceIds.size
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json(
      { error: 'Failed to fetch services' },
      { status: 500 }
    );
  }
}
