/**
 * API endpoint для регистрации Expo Push Token
 * POST /api/mobile/fcm/register
 */
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db';
import { expoPushTokens } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

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

export async function POST(request: NextRequest) {
  try {
    
    // Проверить авторизацию
    const payload = await verifyToken(request);
    if (!payload || !payload.userId || !payload.restaurantId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }


    const { token, deviceType, deviceInfo } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token required' },
        { status: 400 }
      );
    }

    const userId = payload.userId as string;
    const restaurantId = payload.restaurantId as string;

    // Проверить существующий токен
    const existing = await db.query.expoPushTokens.findFirst({
      where: and(
        eq(expoPushTokens.token, token),
        eq(expoPushTokens.userId, userId)
      ),
    });

    if (existing) {
      // Обновить timestamp
      await db
        .update(expoPushTokens)
        .set({ updatedAt: new Date() })
        .where(eq(expoPushTokens.id, existing.id));
    } else {
      // Создать новый токен
      await db.insert(expoPushTokens).values({
        userId,
        restaurantId,
        token,
        deviceType,
        deviceInfo,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[FCM Register] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
