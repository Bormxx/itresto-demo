/**
 * API endpoint для получения списка смен
 * GET /api/mobile/shifts?from=xxx&to=xxx
 */
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db';
import { shifts } from '@/lib/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

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
    if (!payload || !payload.restaurantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const restaurantId = payload.restaurantId as string;

    // Параметры фильтрации
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const conditions = [eq(shifts.restaurantId, restaurantId)];

    if (from) {
      conditions.push(gte(shifts.startedAt, new Date(from)));
    }

    if (to) {
      conditions.push(lte(shifts.startedAt, new Date(to)));
    }

    const shiftsList = await db.query.shifts.findMany({
      where: and(...conditions),
      orderBy: [desc(shifts.startedAt)],
      columns: {
        id: true,
        startedAt: true,
        endedAt: true,
      },
    });

    return NextResponse.json({ shifts: shiftsList });
  } catch (error) {
    console.error('Shifts API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
