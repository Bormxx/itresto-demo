import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { menuCategories, menuItems } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  try {
    const session = await auth();
    const { restaurantId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Проверка прав доступа
    if (!['kitchen_staff', 'manager', 'supervisor', 'admin'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    // Получить категории
    const categories = await db
      .select()
      .from(menuCategories)
      .where(eq(menuCategories.restaurantId, restaurantId))
      .orderBy(menuCategories.displayOrder);

    // Получить все блюда для этого ресторана
    const items = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.restaurantId, restaurantId));

    // Группируем блюда по категориям
    const formattedCategories = categories.map(category => {
      const categoryItems = items.filter(item => item.categoryId === category.id);
      
      // Парсим переводы категории
      let categoryName = { ru: category.name };
      if (category.translations) {
        try {
          const parsed = JSON.parse(category.translations);
          // Если переводы содержат вложенный объект name, используем его
          categoryName = parsed.name || parsed;
        } catch (e) {
          console.error('Error parsing category translations:', e);
        }
      }
      
      return {
        id: category.id,
        name: categoryName,
        items: categoryItems.map(item => {
          // Парсим переводы блюда
          let itemName = { ru: item.name };
          let itemDescription = null;
          
          if (item.translations) {
            try {
              const parsed = JSON.parse(item.translations);
              itemName = parsed.name || { ru: item.name };
              itemDescription = parsed.description || null;
            } catch (e) {
              console.error('Error parsing item translations:', e);
            }
          }
          
          return {
            id: item.id,
            name: itemName,
            description: itemDescription,
            price: item.price,
            imageUrl: item.imageUrl,
            isActive: item.isAvailable,
            categoryId: item.categoryId,
          };
        }),
      };
    });

    return NextResponse.json(formattedCategories);
  } catch (error) {
    console.error('Menu fetch error:', error);
    return NextResponse.json(
      { error: 'Ошибка получения меню' },
      { status: 500 }
    );
  }
}
