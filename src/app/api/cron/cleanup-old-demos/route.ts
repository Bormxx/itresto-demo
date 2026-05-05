import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { restaurants } from '@/lib/db/schema';
import { sql, lt } from 'drizzle-orm';

/**
 * Cron Job для удаления демо-ресторанов старше 24 часов
 * Запускается каждый час через Vercel Cron
 * 
 * GET /api/cron/cleanup-old-demos
 */
export async function GET(request: NextRequest) {
  try {
    // Проверка authorization header от Vercel Cron
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[CRON] Starting cleanup of old demo restaurants...');

    // Вычисляем время 24 часа назад
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Находим старые демо-рестораны
    const oldDemos = await db
      .select({
        id: restaurants.id,
        slug: restaurants.slug,
        name: restaurants.name,
        createdAt: restaurants.createdAt,
      })
      .from(restaurants)
      .where(
        sql`${restaurants.slug} LIKE 'demo-%' AND ${restaurants.createdAt} < ${twentyFourHoursAgo}`
      );

    console.log(`[CRON] Found ${oldDemos.length} old demo restaurants`);

    if (oldDemos.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No old demos to clean up',
        deleted: 0,
        timestamp: new Date().toISOString(),
      });
    }

    // Удаляем старые демо (каскадное удаление пользователей, заказов и т.д.)
    let deletedCount = 0;
    const deletedDemos = [];

    for (const demo of oldDemos) {
      try {
        await db
          .delete(restaurants)
          .where(sql`${restaurants.id} = ${demo.id}`);
        
        deletedCount++;
        deletedDemos.push({
          slug: demo.slug,
          name: demo.name,
          createdAt: demo.createdAt,
        });

        console.log(`[CRON] Deleted demo: ${demo.slug}`);
      } catch (error) {
        console.error(`[CRON] Error deleting demo ${demo.slug}:`, error);
      }
    }

    console.log(`[CRON] Cleanup completed. Deleted ${deletedCount} demos`);

    return NextResponse.json({
      success: true,
      message: `Deleted ${deletedCount} old demo restaurants`,
      deleted: deletedCount,
      demos: deletedDemos,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[CRON] Error during cleanup:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
