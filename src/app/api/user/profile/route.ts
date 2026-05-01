import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

// PATCH /api/user/profile - обновление профиля клиента
export async function PATCH(req: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { firstName, lastName, middleName, dateOfBirth, currentPassword, newPassword, confirmPassword } = body;

    // Подготовка данных для обновления
    const updateData: any = {
      firstName: firstName || null,
      lastName: lastName || null,
      middleName: middleName || null,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      updatedAt: new Date(),
    };

    // Смена пароля (если указаны поля)
    if (currentPassword || newPassword || confirmPassword) {
      if (!currentPassword || !newPassword || !confirmPassword) {
        return NextResponse.json(
          { error: 'Для смены пароля заполните все поля' },
          { status: 400 }
        );
      }

      if (newPassword !== confirmPassword) {
        return NextResponse.json(
          { error: 'Новый пароль и подтверждение не совпадают' },
          { status: 400 }
        );
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: 'Новый пароль должен быть не менее 6 символов' },
          { status: 400 }
        );
      }

      // Получаем текущего пользователя с хешем пароля
      const currentUser = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
      });

      if (!currentUser || !currentUser.passwordHash) {
        return NextResponse.json(
          { error: 'Пользователь не найден' },
          { status: 404 }
        );
      }

      // Проверяем текущий пароль
      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        currentUser.passwordHash
      );

      if (!isPasswordValid) {
        return NextResponse.json(
          { error: 'Текущий пароль неверен' },
          { status: 400 }
        );
      }

      // Хешируем новый пароль
      updateData.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    // Обновляем профиль
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, session.user.id))
      .returning();

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Не возвращаем пароль
    const { passwordHash: _, ...userWithoutPassword } = updatedUser;

    return NextResponse.json(
      {
        message: 'Profile updated successfully',
        user: userWithoutPassword,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

// GET /api/user/profile - получение профиля текущего пользователя
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Не возвращаем пароль
    const { passwordHash: _, ...userWithoutPassword } = user;

    return NextResponse.json({ user: userWithoutPassword }, { status: 200 });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { error: 'Failed to get profile' },
      { status: 500 }
    );
  }
}
