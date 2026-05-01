import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shifts } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
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

    // Get waiter's shifts (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const shiftsList = await db
      .select({
        id: shifts.id,
        startedAt: shifts.startedAt,
        endedAt: shifts.endedAt,
      })
      .from(shifts)
      .where(eq(shifts.userId, userId))
      .orderBy(desc(shifts.startedAt))
      .limit(50);

    return NextResponse.json({
      shifts: shiftsList.map(shift => ({
        id: shift.id,
        startedAt: shift.startedAt.toISOString(),
        endedAt: shift.endedAt?.toISOString() || null,
      })),
    });
  } catch (error) {
    console.error('Shifts fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shifts' },
      { status: 500 }
    );
  }
}
