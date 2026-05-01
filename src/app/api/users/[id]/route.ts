import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
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

    // Проверка прав - можно редактировать только свой профиль или если ты админ
    if (session.user.id !== id && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    const body = await req.json();
    const { firstName, lastName, middleName, email, phone } = body;

    await db
      .update(users)
      .set({
        firstName,
        lastName: lastName || null,
        middleName: middleName || null,
        email,
        phone: phone || null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении профиля' },
      { status: 500 }
    );
  }
}
