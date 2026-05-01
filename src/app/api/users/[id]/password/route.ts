import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

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

    // Проверка прав - можно менять пароль только себе
    if (session.user.id !== id) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Требуются текущий и новый пароли' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Новый пароль должен быть не менее 6 символов' },
        { status: 400 }
      );
    }

    // Получить текущего пользователя
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!currentUser || !currentUser.passwordHash) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    // Проверить текущий пароль
    const isValidPassword = await bcrypt.compare(
      currentPassword,
      currentUser.passwordHash
    );

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Неверный текущий пароль' },
        { status: 400 }
      );
    }

    // Хэшировать новый пароль
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db
      .update(users)
      .set({
        passwordHash: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json(
      { error: 'Ошибка при смене пароля' },
      { status: 500 }
    );
  }
}
