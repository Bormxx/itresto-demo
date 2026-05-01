/**
 * API endpoint для удаления Expo Push Token
 * POST /api/mobile/fcm/unregister
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
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }


    const body = await request.json();
    const { token } = body;

    const userId = payload.userId as string;

    if (token) {
      // Удалить конкретный токен
      await db
        .delete(expoPushTokens)
        .where(
          and(
            eq(expoPushTokens.token, token),
            eq(expoPushTokens.userId, userId)
          )
        );
    } else {
      // Удалить все токены пользователя
      await db
        .delete(expoPushTokens)
        .where(eq(expoPushTokens.userId, userId));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[FCM Unregister] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
