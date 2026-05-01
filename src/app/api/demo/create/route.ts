import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  restaurants, 
  users, 
  departments, 
  menuCategories, 
  menuItems, 
  tables,
  demoCounter,
  demoRateLimits,
  services,
  restaurantServices,
  modifierGroups,
  modifiers,
  menuItemModifierGroups,
  menuItemAvailableModifiers
} from '@/lib/db/schema';
import { eq, and, gte } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { headers } from 'next/headers';

// Тестовые данные для seed
const DEMO_MENU_ITEMS = [
  {
    category: 'Закуски',
    items: [
      { name: 'Картофель фри', description: 'Картошка нарезанная палочками, обжаренная во фритюре. Подаётся с кетчупом.', price: '180', imageUrl: '/images/zakuski/fri.webp', calories: 312, proteins: 4, fats: 15, carbohydrates: 41, prepTime: 10 },
      { name: 'Гренки с чесночным соусом', description: 'Гренки из чёрного хлеба, натёртые чесноком. Подаются с соусом.', price: '160', imageUrl: '/images/zakuski/grenki.webp', calories: 285, proteins: 8, fats: 12, carbohydrates: 35, prepTime: 7 },
      { name: 'Кольца кальмара', description: 'Кольца кальмара жареные во фритюре. Подаются с чесночным соусом.', price: '320', imageUrl: '/images/zakuski/kalamari.webp', calories: 175, proteins: 18, fats: 9, carbohydrates: 6, prepTime: 8 },
      { name: 'Креветки в панировке', description: 'Королевские креветки обжаренные во фритюре.', price: '450', imageUrl: '/images/zakuski/krevedko.webp', calories: 220, proteins: 22, fats: 12, carbohydrates: 8, prepTime: 10 },
      { name: 'Жареные крылышки', description: 'Обжаренные крылышки с хрустящей корочкой. Подаются с кетчупом.', price: '280', imageUrl: '/images/zakuski/krilya.webp', calories: 290, proteins: 20, fats: 21, carbohydrates: 4, prepTime: 12 },
      { name: 'Куриные стрипсы', description: 'Обжаренные во фритюре куриные стрипсы. Подаются с кетчупом.', price: '240', imageUrl: '/images/zakuski/stripsi.webp', calories: 265, proteins: 25, fats: 15, carbohydrates: 10, prepTime: 10 },
      { name: 'Жареный сыр сулугуни', description: 'Обжаренный во фритюре сыр сулугуни.', price: '220', imageUrl: '/images/zakuski/suluguni.webp', calories: 340, proteins: 18, fats: 28, carbohydrates: 2, prepTime: 8 },
      { name: 'Большая тарелка', description: 'Ассорти из всех закусок.', price: '690', imageUrl: '/images/zakuski/assorti.webp', calories: 580, proteins: 35, fats: 32, carbohydrates: 38, prepTime: 15 },
    ],
  },
  {
    category: 'Салаты',
    items: [
      { name: 'Салат с баклажанами', description: 'Свежий салат с запечёнными баклажанами.', price: '190', imageUrl: '/images/salades/baklazhani.webp', calories: 120, proteins: 4, fats: 8, carbohydrates: 10, prepTime: 8 },
      { name: 'Цезарь', description: 'Классический салат Цезарь с курицей и пармезаном.', price: '320', imageUrl: '/images/salades/cesar.webp', calories: 285, proteins: 18, fats: 21, carbohydrates: 12, prepTime: 10 },
      { name: 'Коулслоу', description: 'Салат из свежей капусты с морковью.', price: '150', imageUrl: '/images/salades/coulslow.webp', calories: 95, proteins: 2, fats: 6, carbohydrates: 9, prepTime: 5 },
      { name: 'Фасоль с курицей', description: 'Салат с фасолью и куриной грудкой.', price: '240', imageUrl: '/images/salades/fasolkuritsa.webp', calories: 180, proteins: 16, fats: 7, carbohydrates: 15, prepTime: 8 },
      { name: 'Салат с говядиной', description: 'Тёплый салат с говядиной и овощами.', price: '380', imageUrl: '/images/salades/govyadina.webp', calories: 210, proteins: 22, fats: 12, carbohydrates: 8, prepTime: 12 },
      { name: 'Мимоза', description: 'Классический салат Мимоза со слоями рыбы и овощей.', price: '270', imageUrl: '/images/salades/mimoza.webp', calories: 245, proteins: 15, fats: 18, carbohydrates: 7, prepTime: 10 },
      { name: 'Оливье', description: 'Традиционный салат Оливье.', price: '210', imageUrl: '/images/salades/olive.webp', calories: 195, proteins: 8, fats: 14, carbohydrates: 11, prepTime: 8 },
      { name: 'Овощной', description: 'Салат из свежих овощей.', price: '170', imageUrl: '/images/salades/ovoshnoy.webp', calories: 85, proteins: 3, fats: 5, carbohydrates: 8, prepTime: 5 },
      { name: 'Сельдь под шубой', description: 'Классический слоёный салат с сельдью.', price: '230', imageUrl: '/images/salades/seldpodshuboy.webp', calories: 185, proteins: 9, fats: 12, carbohydrates: 13, prepTime: 10 },
    ],
  },
  {
    category: 'Супы',
    items: [
      { name: 'Борщ', description: 'Традиционный украинский борщ.', price: '180', imageUrl: '/images/soups/borsch.webp', calories: 145, proteins: 7, fats: 8, carbohydrates: 12, prepTime: 8 },
      { name: 'Гороховый суп', description: 'Наваристый гороховый суп с копчёностями.', price: '160', imageUrl: '/images/soups/gorohoviy.webp', calories: 165, proteins: 10, fats: 7, carbohydrates: 18, prepTime: 10 },
      { name: 'Лапша с курицей', description: 'Домашняя лапша с куриным мясом.', price: '190', imageUrl: '/images/soups/lapsha-kuritsa.webp', calories: 155, proteins: 12, fats: 6, carbohydrates: 16, prepTime: 10 },
      { name: 'Щавелевый суп', description: 'Лёгкий суп со свежим щавелем.', price: '170', imageUrl: '/images/soups/shavel.webp', calories: 110, proteins: 6, fats: 5, carbohydrates: 11, prepTime: 8 },
      { name: 'Солянка', description: 'Мясная солянка с оливками и лимоном.', price: '280', imageUrl: '/images/soups/solyanka.webp', calories: 195, proteins: 15, fats: 12, carbohydrates: 8, prepTime: 12 },
      { name: 'Уха', description: 'Рыбный суп из свежей рыбы.', price: '320', imageUrl: '/images/soups/uha.webp', calories: 125, proteins: 16, fats: 5, carbohydrates: 6, prepTime: 12 },
    ],
  },
  {
    category: 'Горячее',
    items: [
      { name: 'Баранина на кости', description: 'Баранья корейка на кости, запечённая с пряностями.', price: '650', imageUrl: '/images/hot/baran-kost.webp', calories: 320, proteins: 28, fats: 22, carbohydrates: 2, prepTime: 35 },
      { name: 'Бефстроганов', description: 'Говядина в сливочном соусе с грибами.', price: '420', imageUrl: '/images/hot/befstroganov.webp', calories: 285, proteins: 25, fats: 18, carbohydrates: 8, prepTime: 20 },
      { name: 'Дорадо', description: 'Рыба дорадо, запечённая с овощами.', price: '580', imageUrl: '/images/hot/dorado.webp', calories: 195, proteins: 22, fats: 11, carbohydrates: 1, prepTime: 25 },
      { name: 'Говядина с овощами', description: 'Тушёная говядина с сезонными овощами.', price: '380', imageUrl: '/images/hot/govyadina-s-ovoshami.webp', calories: 245, proteins: 26, fats: 14, carbohydrates: 12, prepTime: 25 },
      { name: 'Куриные сердечки', description: 'Обжаренные куриные сердечки с луком.', price: '240', imageUrl: '/images/hot/kurinie-serdechki.webp', calories: 185, proteins: 20, fats: 11, carbohydrates: 3, prepTime: 15 },
      { name: 'Котлеты по-киевски', description: 'Классические куриные котлеты с маслом внутри.', price: '320', imageUrl: '/images/hot/pokievski.webp', calories: 310, proteins: 22, fats: 23, carbohydrates: 6, prepTime: 20 },
      { name: 'Котлеты Пожарские', description: 'Куриные котлеты в панировке.', price: '290', imageUrl: '/images/hot/pozharskaya.webp', calories: 275, proteins: 24, fats: 18, carbohydrates: 5, prepTime: 18 },
      { name: 'Свиные рёбра', description: 'Запечённые свиные рёбра в медово-горчичном соусе.', price: '450', imageUrl: '/images/hot/rebra-svin.webp', calories: 380, proteins: 25, fats: 30, carbohydrates: 4, prepTime: 40 },
      { name: 'Рулька', description: 'Свиная рулька, запечённая с пивом.', price: '520', imageUrl: '/images/hot/rulka.webp', calories: 420, proteins: 32, fats: 32, carbohydrates: 3, prepTime: 45 },
      { name: 'Шашлык куриный', description: 'Маринованное куриное мясо, приготовленное на углях.', price: '280', imageUrl: '/images/hot/shashlik-kur.webp', calories: 235, proteins: 28, fats: 13, carbohydrates: 2, prepTime: 20 },
      { name: 'Шашлык свиной', description: 'Сочная свинина, приготовленная на углях.', price: '350', imageUrl: '/images/hot/shashlik-svin.webp', calories: 310, proteins: 25, fats: 23, carbohydrates: 1, prepTime: 25 },
      { name: 'Стейк из форели', description: 'Стейк из свежей форели на гриле.', price: '480', imageUrl: '/images/hot/steyk-forel.webp', calories: 205, proteins: 24, fats: 12, carbohydrates: 1, prepTime: 18 },
      { name: 'Куриный стейк', description: 'Сочная куриная грудка на гриле.', price: '260', imageUrl: '/images/hot/steyk-kura.webp', calories: 195, proteins: 26, fats: 9, carbohydrates: 2, prepTime: 15 },
      { name: 'Свиной стейк', description: 'Сочный стейк из свинины.', price: '380', imageUrl: '/images/hot/steyk-svin.webp', calories: 285, proteins: 27, fats: 18, carbohydrates: 3, prepTime: 20 },
      { name: 'Судак', description: 'Судак, запечённый с лимоном и зеленью.', price: '420', imageUrl: '/images/hot/sudak.webp', calories: 175, proteins: 23, fats: 8, carbohydrates: 4, prepTime: 20 },
      { name: 'Утка', description: 'Утиная грудка с апельсиновым соусом.', price: '580', imageUrl: '/images/hot/utka.webp', calories: 335, proteins: 24, fats: 26, carbohydrates: 8, prepTime: 30 },
      { name: 'Жаркое', description: 'Мясо, тушёное с картофелем и овощами в горшочке.', price: '320', imageUrl: '/images/hot/zharkoe.webp', calories: 295, proteins: 20, fats: 16, carbohydrates: 18, prepTime: 30 },
    ],
  },
  {
    category: 'Десерты',
    items: [
      { name: 'Киевский торт', description: 'Воздушный торт с орехами и безе.', price: '180', imageUrl: '/images/desert/kievskiy.webp', calories: 385, proteins: 6, fats: 22, carbohydrates: 42, prepTime: 5, isBar: true },
      { name: 'Медовик', description: 'Классический торт с медовыми коржами.', price: '160', imageUrl: '/images/desert/medovik.webp', calories: 345, proteins: 5, fats: 18, carbohydrates: 45, prepTime: 5, isBar: true },
      { name: 'Наполеон', description: 'Торт из слоёного теста с заварным кремом.', price: '170', imageUrl: '/images/desert/napoleon.webp', calories: 420, proteins: 4, fats: 28, carbohydrates: 38, prepTime: 5, isBar: true },
      { name: 'Печенье', description: 'Ассорти домашнего печенья.', price: '120', imageUrl: '/images/desert/pechenie.webp', calories: 480, proteins: 6, fats: 24, carbohydrates: 60, prepTime: 3, isBar: true },
      { name: 'Сметанник', description: 'Нежный торт со сметанным кремом.', price: '150', imageUrl: '/images/desert/smetannik.webp', calories: 320, proteins: 5, fats: 16, carbohydrates: 42, prepTime: 5, isBar: true },
    ],
  },
  {
    category: 'Напитки',
    items: [
      { name: 'Апельсиновый фреш', description: 'Свежевыжатый апельсиновый сок.', price: '190', imageUrl: '/images/drinks/apelsin-fresh.webp', calories: 45, proteins: 1, fats: 0, carbohydrates: 10, prepTime: 3, isBar: true },
      { name: 'Морковный фреш', description: 'Свежевыжатый морковный сок.', price: '160', imageUrl: '/images/drinks/morkov-fresh.webp', calories: 40, proteins: 1, fats: 0, carbohydrates: 9, prepTime: 3, isBar: true },
      { name: 'Яблочный фреш', description: 'Свежевыжатый яблочный сок.', price: '170', imageUrl: '/images/drinks/yabloko-fresh.webp', calories: 42, proteins: 0, fats: 0, carbohydrates: 10, prepTime: 3, isBar: true },
      { name: 'Квас', description: 'Домашний хлебный квас.', price: '120', imageUrl: '/images/drinks/kvas.webp', calories: 30, proteins: 0, fats: 0, carbohydrates: 7, prepTime: 2, isBar: true },
      { name: 'Морс брусничный', description: 'Морс из свежей брусники.', price: '140', imageUrl: '/images/drinks/mors-brusnichn.webp', calories: 55, proteins: 0, fats: 0, carbohydrates: 13, prepTime: 2, isBar: true },
      { name: 'Морс из чёрной смородины', description: 'Морс из свежей чёрной смородины.', price: '140', imageUrl: '/images/drinks/mors-chern-smorod.webp', calories: 50, proteins: 0, fats: 0, carbohydrates: 12, prepTime: 2, isBar: true },
      { name: 'Морс клюквенный', description: 'Морс из свежей клюквы.', price: '140', imageUrl: '/images/drinks/mors-klukv.webp', calories: 48, proteins: 0, fats: 0, carbohydrates: 11, prepTime: 2, isBar: true },
      { name: 'Морс облепиховый', description: 'Морс из свежей облепихи.', price: '150', imageUrl: '/images/drinks/mors-oblepihov.webp', calories: 52, proteins: 0, fats: 0, carbohydrates: 12, prepTime: 2, isBar: true },
      { name: 'Морс вишнёвый', description: 'Морс из свежей вишни.', price: '140', imageUrl: '/images/drinks/mors-vishnev.webp', calories: 58, proteins: 0, fats: 0, carbohydrates: 14, prepTime: 2, isBar: true },
    ],
  },
];

// Rate limiting: 1 демо в час, 3 в день с одного IP
async function checkRateLimit(ipAddress: string): Promise<{ allowed: boolean; message?: string }> {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Проверяем существующие лимиты
  const [existingLimit] = await db
    .select()
    .from(demoRateLimits)
    .where(eq(demoRateLimits.ipAddress, ipAddress))
    .limit(1);

  if (existingLimit) {
    // Проверка: не более 1 демо в час
    if (existingLimit.lastCreatedAt > oneHourAgo) {
      const minutesLeft = Math.ceil((existingLimit.lastCreatedAt.getTime() + 60 * 60 * 1000 - now.getTime()) / (60 * 1000));
      return {
        allowed: false,
        message: `Вы уже создали демо-ресторан недавно. Попробуйте через ${minutesLeft} минут.`,
      };
    }

    // Проверка: не более 3 демо в день
    if (existingLimit.createdAt >= oneDayStart && existingLimit.countToday >= 3) {
      return {
        allowed: false,
        message: 'Вы достигли дневного лимита создания демо-ресторанов (3 в день). Попробуйте завтра.',
      };
    }
  }

  return { allowed: true };
}

// Обновление rate limit
async function updateRateLimit(ipAddress: string) {
  const now = new Date();
  const oneDayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [existingLimit] = await db
    .select()
    .from(demoRateLimits)
    .where(eq(demoRateLimits.ipAddress, ipAddress))
    .limit(1);

  if (existingLimit) {
    // Если запись создана сегодня - инкремент счетчика, иначе сброс
    const countToday = existingLimit.createdAt >= oneDayStart ? existingLimit.countToday + 1 : 1;
    const createdAt = existingLimit.createdAt >= oneDayStart ? existingLimit.createdAt : now;

    await db
      .update(demoRateLimits)
      .set({
        countToday,
        lastCreatedAt: now,
        createdAt,
      })
      .where(eq(demoRateLimits.ipAddress, ipAddress));
  } else {
    await db.insert(demoRateLimits).values({
      ipAddress,
      countToday: 1,
      lastCreatedAt: now,
      createdAt: now,
    });
  }
}

// Increment demo counter и получить номер
async function getNextDemoNumber(): Promise<number> {
  // Получаем текущее значение
  const [counter] = await db.select().from(demoCounter).limit(1);

  if (!counter) {
    // Если счетчика нет - создаем
    await db.insert(demoCounter).values({ currentNumber: 1 });
    return 1;
  }

  // Инкремент
  const nextNumber = counter.currentNumber + 1;
  await db
    .update(demoCounter)
    .set({ currentNumber: nextNumber, updatedAt: new Date() })
    .where(eq(demoCounter.id, counter.id));

  return nextNumber;
}

// Создание демо-ресторана с seed данными
async function createDemoRestaurant(demoNumber: number, password: string) {
  const restaurantSlug = `test${demoNumber}`;

  // 1. Создаем ресторан
  const [restaurant] = await db
    .insert(restaurants)
    .values({
      slug: restaurantSlug,
      name: `Демо Ресторан #${demoNumber}`,
      description: 'Демо-версия системы ITResto с тестовыми данными',
      logoUrl: '/logotype.svg',
      themeConfig: JSON.stringify({
        primaryColor: '#3b82f6',
        secondaryColor: '#1e40af',
        accentColor: '#f59e0b',
      }),
      isActive: true,
    })
    .returning();

  // 2. Активируем полный тариф на 24 часа
  const [fullService] = await db
    .select()
    .from(services)
    .where(eq(services.name, 'Полный'))
    .limit(1);

  if (fullService) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await db.insert(restaurantServices).values({
      restaurantId: restaurant.id,
      serviceId: fullService.id,
      activatedAt: new Date(),
      expiresAt,
    });
  }

  // 3. Создаем отделы (кухня и бар)
  const [kitchenDept] = await db
    .insert(departments)
    .values({
      restaurantId: restaurant.id,
      name: 'Кухня',
      description: 'Основная кухня',
      isActive: true,
    })
    .returning();

  const [barDept] = await db
    .insert(departments)
    .values({
      restaurantId: restaurant.id,
      name: 'Бар',
      description: 'Барная стойка',
      isActive: true,
    })
    .returning();

  // 4. Создаем пользователей
  const passwordHash = await bcrypt.hash(password, 10);

  const [supervisor] = await db
    .insert(users)
    .values({
      restaurantId: restaurant.id,
      email: `supervisor@test${demoNumber}.ru`,
      passwordHash,
      firstName: 'Супервизор',
      lastName: 'Тестовый',
      role: 'supervisor',
      isActive: true,
    })
    .returning();

  const [manager] = await db
    .insert(users)
    .values({
      restaurantId: restaurant.id,
      email: `manager@test${demoNumber}.ru`,
      passwordHash,
      firstName: 'Менеджер',
      lastName: 'Тестовый',
      role: 'manager',
      isActive: true,
    })
    .returning();

  const [kitchen] = await db
    .insert(users)
    .values({
      restaurantId: restaurant.id,
      email: `kitchen@test${demoNumber}.ru`,
      passwordHash,
      firstName: 'Повар',
      lastName: 'Тестовый',
      role: 'kitchen_staff',
      isActive: true,
    })
    .returning();

  const [bar] = await db
    .insert(users)
    .values({
      restaurantId: restaurant.id,
      email: `bar@test${demoNumber}.ru`,
      passwordHash,
      firstName: 'Бармен',
      lastName: 'Тестовый',
      role: 'bar_staff',
      isActive: true,
    })
    .returning();

  // 5. Создаем категории меню
  const categories = await db
    .insert(menuCategories)
    .values(
      DEMO_MENU_ITEMS.map((cat, index) => ({
        restaurantId: restaurant.id,
        name: cat.category,
        description: '',
        translations: JSON.stringify({ ru: { name: cat.category } }),
        sortOrder: index,
        isActive: true,
      }))
    )
    .returning();

  // 6. Создаем блюда
  for (let i = 0; i < DEMO_MENU_ITEMS.length; i++) {
    const category = DEMO_MENU_ITEMS[i];
    const dbCategory = categories[i];

    await db.insert(menuItems).values(
      category.items.map((item, index) => ({
        restaurantId: restaurant.id,
        categoryId: dbCategory.id,
        name: item.name,
        description: item.description,
        translations: JSON.stringify({ ru: { name: item.name, description: item.description } }),
        price: item.price,
        imageUrl: item.imageUrl,
        calories: item.calories || null,
        proteins: item.proteins || null,
        fats: item.fats || null,
        carbohydrates: item.carbohydrates || null,
        prepDepartmentId: item.isBar ? barDept.id : kitchenDept.id,
        prepTime: item.prepTime,
        sortOrder: index,
        isAvailable: true,
      }))
    );
  }

  // 7. Создаем модификаторы (группа "Гарниры" для стейков)
  const [garnishGroup] = await db
    .insert(modifierGroups)
    .values({
      restaurantId: restaurant.id,
      name: 'Гарнир',
      translations: JSON.stringify({ ru: { name: 'Гарнир' } }),
      required: true,
      multiSelect: false,
      minSelections: 1,
      maxSelections: 1,
      sortOrder: 0,
    })
    .returning();

  // Получаем все блюда для создания модификаторов
  const allMenuItems = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.restaurantId, restaurant.id));

  // Находим стейки (Горячее)
  const steakItems = allMenuItems.filter(item => 
    item.name.includes('стейк') || item.name.toLowerCase().includes('стейк')
  );

  // Создаем 5 гарниров как модификаторы
  const garnishMenuItems = allMenuItems.filter(item => 
    ['Картофель фри', 'Овощи гриль', 'Картофельное пюре', 'Рис басмати', 'Стручковая фасоль'].includes(item.name)
  );

  // Если гарниров нет в меню, создадим их
  let garnishItems = garnishMenuItems;
  if (garnishItems.length === 0) {
    const garnishCategory = categories.find(cat => cat.name === 'Горячие блюда');
    garnishItems = await db
      .insert(menuItems)
      .values([
        {
          restaurantId: restaurant.id,
          categoryId: garnishCategory!.id,
          name: 'Картофель фри',
          description: 'Хрустящий картофель фри',
          translations: JSON.stringify({ ru: { name: 'Картофель фри', description: 'Хрустящий картофель фри' } }),
          price: '150',
          prepDepartmentId: kitchenDept.id,
          prepTime: 10,
          sortOrder: 100,
          isAvailable: true,
        },
        {
          restaurantId: restaurant.id,
          categoryId: garnishCategory!.id,
          name: 'Овощи гриль',
          description: 'Сезонные овощи на гриле',
          translations: JSON.stringify({ ru: { name: 'Овощи гриль', description: 'Сезонные овощи на гриле' } }),
          price: '180',
          prepDepartmentId: kitchenDept.id,
          prepTime: 12,
          sortOrder: 101,
          isAvailable: true,
        },
        {
          restaurantId: restaurant.id,
          categoryId: garnishCategory!.id,
          name: 'Картофельное пюре',
          description: 'Нежное картофельное пюре со сливками',
          translations: JSON.stringify({ ru: { name: 'Картофельное пюре', description: 'Нежное картофельное пюре со сливками' } }),
          price: '120',
          prepDepartmentId: kitchenDept.id,
          prepTime: 8,
          sortOrder: 102,
          isAvailable: true,
        },
        {
          restaurantId: restaurant.id,
          categoryId: garnishCategory!.id,
          name: 'Рис басмати',
          description: 'Рассыпчатый рис басмати',
          translations: JSON.stringify({ ru: { name: 'Рис басмати', description: 'Рассыпчатый рис басмати' } }),
          price: '100',
          prepDepartmentId: kitchenDept.id,
          prepTime: 15,
          sortOrder: 103,
          isAvailable: true,
        },
        {
          restaurantId: restaurant.id,
          categoryId: garnishCategory!.id,
          name: 'Стручковая фасоль',
          description: 'Молодая фасоль с чесноком',
          translations: JSON.stringify({ ru: { name: 'Стручковая фасоль', description: 'Молодая фасоль с чесноком' } }),
          price: '130',
          prepDepartmentId: kitchenDept.id,
          prepTime: 10,
          sortOrder: 104,
          isAvailable: true,
        },
      ])
      .returning();
  }

  // Создаем модификаторы из гарниров
  const createdModifiers = await db
    .insert(modifiers)
    .values(
      garnishItems.slice(0, 5).map((garnish, index) => ({
        modifierGroupId: garnishGroup.id,
        menuItemId: garnish.id,
        name: garnish.name, // Добавляем имя гарнира
        price: 0,
        isAvailable: true,
        sortOrder: index,
      }))
    )
    .returning();

  // Связываем группу модификаторов со стейками
  if (steakItems.length > 0) {
    await db.insert(menuItemModifierGroups).values(
      steakItems.map((steak, index) => ({
        menuItemId: steak.id,
        modifierGroupId: garnishGroup.id,
        sortOrder: 0,
      }))
    );

    // Делаем все модификаторы доступными для стейков
    for (const steak of steakItems) {
      await db.insert(menuItemAvailableModifiers).values(
        createdModifiers.map((modifier, index) => ({
          menuItemId: steak.id,
          modifierId: modifier.id,
          isDefaultForItem: index === 0,
          sortOrder: index,
        }))
      );
    }
  }

  // 8. Создаем столики
  await db.insert(tables).values([
    {
      restaurantId: restaurant.id,
      number: '1',
      capacity: 2,
      status: 'available',
      isActive: true,
    },
    {
      restaurantId: restaurant.id,
      number: '2',
      capacity: 4,
      status: 'available',
      isActive: true,
    },
    {
      restaurantId: restaurant.id,
      number: '3',
      capacity: 4,
      status: 'available',
      isActive: true,
    },
    {
      restaurantId: restaurant.id,
      number: '4',
      capacity: 6,
      status: 'available',
      isActive: true,
    },
    {
      restaurantId: restaurant.id,
      number: '5',
      capacity: 8,
      status: 'available',
      isActive: true,
    },
  ]);

  return {
    restaurantSlug,
    demoNumber,
    password,
    users: {
      supervisor: supervisor.email,
      manager: manager.email,
      kitchen: kitchen.email,
      bar: bar.email,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    // Получаем IP адрес
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0] || realIp || 'unknown';

    // Проверяем rate limit
    const rateLimitCheck = await checkRateLimit(ipAddress);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: rateLimitCheck.message },
        { status: 429 }
      );
    }

    // Генерируем номер демо и пароль
    const demoNumber = await getNextDemoNumber();
    const password = Math.floor(1000 + Math.random() * 9000).toString(); // 4-значный пароль

    // Создаем демо-ресторан
    const demo = await createDemoRestaurant(demoNumber, password);

    // Обновляем rate limit
    await updateRateLimit(ipAddress);

    // Устанавливаем expires для куки (24 часа)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Возвращаем данные
    return NextResponse.json({
      success: true,
      demo: {
        restaurantSlug: demo.restaurantSlug,
        demoNumber: `test${demoNumber}`,
        password: demo.password,
        users: demo.users,
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error creating demo restaurant:', error);
    return NextResponse.json(
      { error: 'Не удалось создать демо-ресторан. Попробуйте позже.' },
      { status: 500 }
    );
  }
}
