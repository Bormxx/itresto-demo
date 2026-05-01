import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Проверка прав
    if (session.user.id !== id) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json({ error: 'Файл не предоставлен' }, { status: 400 });
    }

    // Проверить тип файла
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Файл должен быть изображением' }, { status: 400 });
    }

    // Проверить размер (5 МБ)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Файл слишком большой (макс. 5 МБ)' }, { status: 400 });
    }

    // Создать уникальное имя файла
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const filename = `avatar-${id}-${timestamp}.${extension}`;

    // Путь для сохранения
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'avatars');
    await mkdir(uploadDir, { recursive: true });

    // Сохранить файл
    const buffer = Buffer.from(await file.arrayBuffer());
    const filepath = join(uploadDir, filename);
    await writeFile(filepath, buffer);

    // URL для доступа к файлу
    const avatarUrl = `/uploads/avatars/${filename}`;

    // Обновить в БД
    await db
      .update(users)
      .set({
        avatar: avatarUrl,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    return NextResponse.json({ avatarUrl });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return NextResponse.json(
      { error: 'Ошибка загрузки аватара' },
      { status: 500 }
    );
  }
}
