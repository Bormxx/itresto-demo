import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { conflicts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Проверка роли
    if (!['manager', 'supervisor', 'admin'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    const body = await req.json();
    const { description, discountType, discountValue, status } = body;

    await db
      .update(conflicts)
      .set({
        description,
        discountType: discountType || null,
        discountValue: discountValue || null,
        status: status || 'pending',
        resolvedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(conflicts.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Conflict update error:', error);
    return NextResponse.json(
      { error: 'Ошибка обновления конфликта' },
      { status: 500 }
    );
  }
}
