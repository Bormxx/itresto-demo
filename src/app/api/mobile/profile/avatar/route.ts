/**
 * API endpoint для загрузки аватара пользователя
 * POST /api/mobile/profile/avatar
 */
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

async function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const secret = new TextEncoder().encode(
    process.env.NEXTAUTH_SECRET || 'default-secret'
  );

  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await verifyToken(request);
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = payload.userId as string;

    // Получить FormData
    const formData = await request.formData();
    const fileEntry = (formData as any).get('avatar');
    
    if (!fileEntry || typeof fileEntry === 'string') {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    const file = fileEntry as File;

    // Валидация типа файла
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Валидация размера (макс 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    // Создать уникальное имя файла
    const ext = path.extname(file.name);
    const filename = `${userId}-${Date.now()}${ext}`;
    const filePath = path.join(process.cwd(), 'public', 'avatars', filename);

    // Создать папку если не существует
    await mkdir(path.join(process.cwd(), 'public', 'avatars'), { recursive: true });

    // Сохранить файл
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // URL аватара
    const avatarUrl = `/avatars/${filename}`;

    // Обновить БД
    await db
      .update(users)
      .set({
        avatar: avatarUrl,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return NextResponse.json({ avatarUrl });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
