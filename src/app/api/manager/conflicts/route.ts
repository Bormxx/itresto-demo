import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { conflicts, orders } from '@/lib/db/schema';
import { eq, desc, and, gte, lte } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Проверка роли
    if (!['manager', 'supervisor', 'admin'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    // Получить параметры фильтрации
    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const status = searchParams.get('status');

    let query = db.select().from(conflicts);

    // Применить фильтры (если потребуется)
    // if (dateFrom) { ... }

    const conflictsList = await query.orderBy(desc(conflicts.createdAt));

    return NextResponse.json({ conflicts: conflictsList });
  } catch (error) {
    console.error('Conflicts fetch error:', error);
    return NextResponse.json(
      { error: 'Ошибка получения конфликтов' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Проверка роли
    if (!['manager', 'supervisor', 'admin'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    const body = await req.json();
    const { orderId, description, discountType, discountValue } = body;

    const [conflict] = await db
      .insert(conflicts)
      .values({
        orderId,
        description,
        discountType: discountType || null,
        discountValue: discountValue || null,
        resolvedBy: session.user.id,
        status: 'pending',
      })
      .returning();

    return NextResponse.json({ conflict });
  } catch (error) {
    console.error('Conflict creation error:', error);
    return NextResponse.json(
      { error: 'Ошибка создания записи о конфликте' },
      { status: 500 }
    );
  }
}
