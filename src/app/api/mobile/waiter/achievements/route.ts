import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { achievements, userAchievements, users } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
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

    // Get user's restaurant
    const user = await db
      .select({ restaurantId: users.restaurantId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || user.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const restaurantId = user[0].restaurantId;

    if (!restaurantId) {
      return NextResponse.json({
        enabled: false,
        achievements: [],
      });
    }

    // Check if achievements system is enabled (if there are active achievements)
    const activeAchievements = await db
      .select({ id: achievements.id })
      .from(achievements)
      .where(
        and(
          eq(achievements.restaurantId, restaurantId),
          eq(achievements.isActive, true)
        )
      )
      .limit(1);

    if (activeAchievements.length === 0) {
      // No active achievements - system disabled
      return NextResponse.json({
        enabled: false,
        achievements: [],
      });
    }

    // Get user's achievements with grouping by achievement type
    const userAchievementsList = await db
      .select({
        achievementId: userAchievements.achievementId,
        title: achievements.title,
        description: achievements.description,
        icon: achievements.icon,
        earnedAt: sql<string>`MAX(${userAchievements.earnedAt})`,
        count: sql<number>`COUNT(*)`,
      })
      .from(userAchievements)
      .innerJoin(
        achievements,
        eq(userAchievements.achievementId, achievements.id)
      )
      .where(
        and(
          eq(userAchievements.userId, userId),
          eq(achievements.isActive, true)
        )
      )
      .groupBy(
        userAchievements.achievementId,
        achievements.title,
        achievements.description,
        achievements.icon
      )
      .orderBy(desc(sql`MAX(${userAchievements.earnedAt})`));

    return NextResponse.json({
      enabled: true,
      achievements: userAchievementsList.map(achievement => ({
        id: achievement.achievementId,
        title: achievement.title,
        description: achievement.description || '',
        imageUrl: achievement.icon || undefined,
        count: Number(achievement.count),
        earnedAt: new Date(achievement.earnedAt).toISOString(),
      })),
    });
  } catch (error) {
    console.error('Achievements fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch achievements' },
      { status: 500 }
    );
  }
}
