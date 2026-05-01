/**
 * API endpoint для получения и обновления профиля пользователя
 * GET /api/mobile/profile - получить профиль
 * PUT /api/mobile/profile - обновить профиль
 */
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

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
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = payload.userId as string;

    // Загрузить профиль пользователя
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        email: true,
        phone: true,
        avatar: true,
        firstName: true,
        lastName: true,
        middleName: true,
        role: true,
        restaurantId: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Profile API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const payload = await verifyToken(request);
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = payload.userId as string;
    const body = await request.json();

    // Валидация
    const { email, phone } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Обновить профиль
    await db
      .update(users)
      .set({
        email,
        phone: phone || null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Получить обновленный профиль
    const updatedUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        email: true,
        phone: true,
        avatar: true,
        firstName: true,
        lastName: true,
        middleName: true,
        role: true,
        restaurantId: true,
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
