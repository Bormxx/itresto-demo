import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Check if user is manager/supervisor/admin
    if (!['manager', 'supervisor', 'admin'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    const body = await req.json();
    const { firstName, lastName, email, phone, currentPassword, newPassword } = body;

    // Get current user data
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!currentUser) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {
      firstName,
      lastName: lastName || null,
      email,
      phone: phone || null,
    };

    // Handle password change
    if (newPassword && currentPassword) {
      // Verify current password
      if (!currentUser.passwordHash) {
        return NextResponse.json(
          { error: 'Невозможно изменить пароль' },
          { status: 400 }
        );
      }

      const isValidPassword = await bcrypt.compare(currentPassword, currentUser.passwordHash);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'Неверный текущий пароль' },
          { status: 400 }
        );
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      updateData.passwordHash = hashedPassword;
    }

    // Update user in database
    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, session.user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении профиля' },
      { status: 500 }
    );
  }
}
