import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { restaurants, services, restaurantServices } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// POST - Загрузить логотип ресторана
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.restaurantId) {
      return NextResponse.json(
        { error: 'Not authenticated or no restaurant assigned' },
        { status: 401 }
      );
    }

    // Проверяем роль пользователя
    if (session.user.role !== 'supervisor' && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Only supervisors can update restaurant logo' },
        { status: 403 }
      );
    }

    // Получаем ресторан
    const restaurant = await db.query.restaurants.findFirst({
      where: eq(restaurants.id, session.user.restaurantId),
    });

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Проверяем тариф - получаем все активные услуги ресторана
    const now = new Date();
    const activeServices = await db.query.restaurantServices.findMany({
      where: eq(restaurantServices.restaurantId, session.user.restaurantId),
      with: {
        service: true
      }
    });

    // Фильтруем активные услуги (не истекшие)
    const currentServices = activeServices.filter(rs => 
      !rs.expiresAt || new Date(rs.expiresAt) > now
    );

    // Проверяем, есть ли тариф выше базового
    // Базовый тариф - это либо отсутствие тарифа, либо тариф с isFree === true
    const hasPremiumPlan = currentServices.some(rs => 
      rs.service && !rs.service.isFree
    );

    if (!hasPremiumPlan) {
      return NextResponse.json(
        { 
          error: 'Изменение логотипа доступно только на платных тарифах',
          message: 'Чтобы загрузить свой логотип, перейдите на один из платных тарифов'
        },
        { status: 403 }
      );
    }

    // Получаем файл из формы
    const formData = await request.formData();
    const file = formData.get('logo') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Проверяем тип файла
    const allowedTypes = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, SVG, and WebP are allowed' },
        { status: 400 }
      );
    }

    // Проверяем размер файла (максимум 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 2MB limit' },
        { status: 400 }
      );
    }

    // Генерируем имя файла
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const fileName = `logo-${restaurant.slug}-${timestamp}.${extension}`;
    
    // Путь для сохранения
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'restaurants');
    const filePath = join(uploadDir, fileName);

    // Создаем директорию если не существует
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Сохраняем файл
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Обновляем URL логотипа в БД
    const logoUrl = `/uploads/restaurants/${fileName}`;
    await db.update(restaurants)
      .set({ 
        logoUrl,
        updatedAt: new Date()
      })
      .where(eq(restaurants.id, session.user.restaurantId));

    return NextResponse.json({
      success: true,
      logoUrl,
      message: 'Логотип успешно загружен'
    });
  } catch (error) {
    console.error('Error uploading logo:', error);
    return NextResponse.json(
      { error: 'Failed to upload logo' },
      { status: 500 }
    );
  }
}

// DELETE - Удалить логотип ресторана
export async function DELETE() {
  try {
    const session = await auth();
    
    if (!session?.user?.restaurantId) {
      return NextResponse.json(
        { error: 'Not authenticated or no restaurant assigned' },
        { status: 401 }
      );
    }

    // Проверяем роль пользователя
    if (session.user.role !== 'supervisor' && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Only supervisors can delete restaurant logo' },
        { status: 403 }
      );
    }

    // Удаляем URL логотипа из БД
    await db.update(restaurants)
      .set({ 
        logoUrl: null,
        updatedAt: new Date()
      })
      .where(eq(restaurants.id, session.user.restaurantId));

    return NextResponse.json({
      success: true,
      message: 'Логотип успешно удален'
    });
  } catch (error) {
    console.error('Error deleting logo:', error);
    return NextResponse.json(
      { error: 'Failed to delete logo' },
      { status: 500 }
    );
  }
}
