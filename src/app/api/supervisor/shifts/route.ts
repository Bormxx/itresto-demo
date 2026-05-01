import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { shifts, users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !['supervisor', 'manager', 'owner', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const restaurantId = searchParams.get('restaurantId');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant ID required' }, { status: 400 });
    }

    const shiftsData = await db
      .select({
        id: shifts.id,
        startedAt: shifts.startedAt,
        endedAt: shifts.endedAt,
        managerName: users.firstName,
      })
      .from(shifts)
      .leftJoin(users, eq(shifts.managerId, users.id))
      .where(eq(shifts.restaurantId, restaurantId))
      .orderBy(desc(shifts.startedAt))
      .limit(limit);

    return NextResponse.json({ shifts: shiftsData });
  } catch (error) {
    console.error('Error fetching shifts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
