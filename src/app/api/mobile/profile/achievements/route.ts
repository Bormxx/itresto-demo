/**
 * API endpoint для получения достижений пользователя
 * GET /api/mobile/profile/achievements
 */
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db';
import { userAchievements, achievements } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

async function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const secret = new TextEncoder().encode(
    process.env.NEXTAUTH_SECRET || 'default-secret'
  );

  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const payload = await verifyToken(request);
    if (!payload || !payload.userId || !payload.restaurantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = payload.userId as string;
    const restaurantId = payload.restaurantId as string;

    // Загрузить достижения пользователя с подсчетом количества
    const userAchievementsList = await db
      .select({
        achievementId: userAchievements.achievementId,
        title: achievements.title,
        description: achievements.description,
        icon: achievements.icon,
        count: sql<number>`count(*)::int`,
        lastEarnedAt: sql<string>`max(${userAchievements.earnedAt})`,
      })
      .from(userAchievements)
      .innerJoin(achievements, eq(userAchievements.achievementId, achievements.id))
      .where(
        and(
          eq(userAchievements.userId, userId),
          eq(achievements.restaurantId, restaurantId),
          eq(achievements.isActive, true)
        )
      )
      .groupBy(
        userAchievements.achievementId,
        achievements.title,
        achievements.description,
        achievements.icon
      )
      .orderBy(desc(sql`max(${userAchievements.earnedAt})`));

    return NextResponse.json({
      achievements: userAchievementsList,
      totalCount: userAchievementsList.reduce((sum, a) => sum + a.count, 0),
    });
  } catch (error) {
    console.error('Achievements API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
