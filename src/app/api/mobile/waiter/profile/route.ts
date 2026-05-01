import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db';
import { users, orders } from '@/lib/db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';

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
    // Проверить авторизацию
    const payload = await verifyToken(request);
    if (!payload?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получить данные пользователя
    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.userId as string),
      columns: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        avatar: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Статистика за сегодня
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStats = await db
      .select({
        totalOrders: sql<number>`count(*)::int`,
        totalAmount: sql<string>`coalesce(sum(${orders.total}), 0)::text`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.waiterId, payload.userId as string),
          gte(orders.createdAt, today)
        )
      );

    // Статистика за всё время
    const allTimeStats = await db
      .select({
        totalOrders: sql<number>`count(*)::int`,
        totalAmount: sql<string>`coalesce(sum(${orders.total}), 0)::text`,
      })
      .from(orders)
      .where(eq(orders.waiterId, payload.userId as string));

    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Официант';

    return NextResponse.json({
      user: {
        id: user.id,
        name: fullName,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        memberSince: user.createdAt,
      },
      stats: {
        today: {
          orders: todayStats[0]?.totalOrders || 0,
          amount: todayStats[0]?.totalAmount || '0',
        },
        allTime: {
          orders: allTimeStats[0]?.totalOrders || 0,
          amount: allTimeStats[0]?.totalAmount || '0',
        },
      },
    });
  } catch (error) {
    console.error('Waiter profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const payload = await verifyToken(request);
    if (!payload?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, phone } = body;

    // Обновить данные пользователя
    await db
      .update(users)
      .set({
        email: email || undefined,
        phone: phone || undefined,
        updatedAt: new Date(),
      })
      .where(eq(users.id, payload.userId as string));

    // Получить обновленные данные
    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.userId as string),
      columns: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        avatar: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Официант';

    return NextResponse.json({
      user: {
        id: user.id,
        name: fullName,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        memberSince: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
