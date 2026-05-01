import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { logUpdate } from '@/lib/auditLog';
import { checkWriteRateLimit, getClientIp, createRateLimitResponse } from '@/lib/rateLimit';

// POST - Реактивировать сотрудника
export async function POST(request: Request) {
  try {
    // Rate limiting: 20 запросов в минуту
    const clientIp = getClientIp(request);
    const rateLimitResult = await checkWriteRateLimit(clientIp);
    
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const session = await auth();
    
    if (!session?.user?.restaurantId || !['supervisor', 'admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Проверка, что пользователь принадлежит ресторану
    const existingUser = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, id),
          eq(users.restaurantId, session.user.restaurantId)
        )
      )
      .limit(1);

    if (!existingUser.length) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Реактивируем сотрудника
    await db.update(users).set({
      isActive: true,
      deactivationReason: null,
      deactivatedAt: null,
      updatedAt: new Date(),
    }).where(eq(users.id, id));

    // Audit log
    await logUpdate(
      'staff',
      id,
      { isActive: false },
      { isActive: true },
      session.user.id,
      session.user.restaurantId
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reactivating staff member:', error);
    return NextResponse.json({ error: 'Failed to reactivate staff member' }, { status: 500 });
  }
}
