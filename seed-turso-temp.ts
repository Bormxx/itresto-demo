import { config } from 'dotenv';
import path from 'path';

// Явно загружаем .env.local ПЕРЕД импортом db
config({ path: path.resolve(process.cwd(), '.env.local') });

import { db } from './src/lib/db/index';
import { restaurants, users, departments, menuCategories, menuItems, tables, services, restaurantServices, modifierGroups, modifiers, menuItemModifierGroups, menuItemAvailableModifiers, demoCounter } from './src/lib/db/schema';
import bcrypt from 'bcryptjs';

/**
 * Seed скрипт для Turso (SQLite) с правильными тестовыми данными
 * Данные взяты из seed-extended.ts основного проекта
 * 54 блюда + 5 модификаторов
 */

async function seed() {
  try {
    console.log('🌱 Starting Turso seed...');

    // 1. Создаём сервисы
    console.log('\n📦 Creating services...');
    const servicesData = [
      { name: 'Базовый', description: 'Базовая функциональность', isActive: true },
      { name: 'Стандарт', description: 'Стандартный набор функций', isActive: true },
      { name: 'Расширенный', description: 'Расширенные возможности', isActive: true },
      { name: 'Премиум', description: 'Все возможности', isActive: true },
      { name: 'Полный', description: 'Тариф 24/7 без ограничений', isActive: true },
    ];

    for (const serviceData of servicesData) {
      await db.insert(services).values({
        id: crypto.randomUUID(),
        name: serviceData.name,
        description: serviceData.description,
        isActive: serviceData.isActive,
      });
    }
    console.log(`✅ Created ${servicesData.length} services`);

    // Инициализируем счётчик демо-ресторанов
    await db.insert(demoCounter).values({
      id: 1,
      count: 1,
    });
    console.log('✅ Demo counter initialized');

    // 2. Создаём демо-ресторан
    console.log('\n🏪 Creating demo restaurant...');
    const [restaurant] = await db.insert(restaurants).values({
      id: crypto.randomUUID(),
      slug: 'test1',
      name: 'Демо Ресторан',
      isActive: true,
    }).returning();
    console.log(`✅ Restaurant created: ${restaurant.name} (${restaurant.slug})`);

    // Активируем тариф "Полный" для ресторана (24 часа)
    const fullService = await db.select().from(services).where((s) => s.name === 'Полный').limit(1);
    if (fullService.length > 0) {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24 часа

      await db.insert(restaurantServices).values({
        id: crypto.randomUUID(),
        restaurantId: restaurant.id,
        serviceId: fullService[0].id,
        activatedAt: now,
        expiresAt: expiresAt,
      });
      console.log('✅ Activated "Полный" service (24 hours)');
    }

    // 3. Создаём пользователей
    console.log('\n👥 Creating users...');
    const usersData = [
      { email: 'supervisor@test1.ru', password: 'password', firstName: 'Supervisor', lastName: 'Demo', role: 'supervisor' },
      { email: 'manager@test1.ru', password: 'password', firstName: 'Manager', lastName: 'Demo', role: 'manager' },
      { email: 'kitchen@test1.ru', password: 'password', firstName: 'Kitchen', lastName: 'Staff', role: 'waiter' },
      { email: 'bar@test1.ru', password: 'password', firstName: 'Bar', lastName: 'Staff', role: 'waiter' },
    ];

    for (const userData of usersData) {
      const passwordHash = await bcrypt.hash(userData.password, 10);
      await db.insert(users).values({
        id: crypto.randomUUID(),
        restaurantId: restaurant.id,
        email: userData.email,
        passwordHash,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        isActive: true,
      });
    }
    console.log(`✅ Created ${usersData.length} users`);

    // 4. Создаём столики
    console.log('\n🪑 Creating tables...');
    const tablesData = [
      { number: '1', capacity: 2 },
      { number: '2', capacity: 4 },
      { number: '3', capacity: 4 },
      { number: '4', capacity: 6 },
      { number: '5', capacity: 8 },
    ];

    for (const tableData of tablesData) {
      await db.insert(tables).values({
        id: crypto.randomUUID(),
        restaurantId: restaurant.id,
        number: tableData.number,
        capacity: tableData.capacity,
        isActive: true,
      });
    }
    console.log(`✅ Created ${tablesData.length} tables`);

    // 5. Создаём категории меню
    console.log('\n📋 Creating menu categories...');
    const [zakuskiCat] = await db.insert(menuCategories).values({
      restaurantId: restaurant.id,
      name: 'Закуски',
      description: 'Холодные и горячие закуски',
      translations: JSON.stringify({ ru: { name: 'Закуски', description: 'Холодные и горячие закуски' } }),
      displayOrder: 1,
    }).returning();

    const [saladesCat] = await db.insert(menuCategories).values({
      restaurantId: restaurant.id,
      name: 'Салаты',
      description: 'Свежие салаты',
      translations: JSON.stringify({ ru: { name: 'Салаты', description: 'Свежие салаты' } }),
      displayOrder: 2,
    }).returning();

    const [soupsCat] = await db.insert(menuCategories).values({
      restaurantId: restaurant.id,
      name: 'Супы',
      description: 'Первые блюда',
      translations: JSON.stringify({ ru: { name: 'Супы', description: 'Первые блюда' } }),
      displayOrder: 3,
    }).returning();

    const [hotCat] = await db.insert(menuCategories).values({
      restaurantId: restaurant.id,
      name: 'Горячее',
      description: 'Основные горячие блюда',
      translations: JSON.stringify({ ru: { name: 'Горячее', description: 'Основные горячие блюда' } }),
      displayOrder: 4,
    }).returning();

    const [desertsCat] = await db.insert(menuCategories).values({
      restaurantId: restaurant.id,
      name: 'Десерты',
      description: 'Сладости',
      translations: JSON.stringify({ ru: { name: 'Десерты', description: 'Сладости' } }),
      displayOrder: 5,
    }).returning();

    const [drinksCat] = await db.insert(menuCategories).values{
      where: and(eq(menuCategories.restaurantId, restaurant.id), eq(menuCategories.name, 'Напитки')),
    });
    if (!drinksCat) {
      [drinksCat] = await db.insert(menuCategories).values({
        restaurantId: restaurant.id,
        name: 'Напитки',
        description: 'Алкогольные и безалкогольные напитки',
        translations: JSON.stringify({ ru: { name: 'Напитки', description: 'Алкогольные и безалкогольные напитки' } }),
        displayOrder: 6,
      }).returning();
    }

    console.log('✅ Categories ready\n');

    // Получаем или создаем отделы приготовления
    console.log('Setting up departments...');
    let kitchenDept = await db.query.departments.findFirst({
      where: and(eq(departments.restaurantId, restaurant.id), eq(departments.name, 'Кухня')),
    });
    if (!kitchenDept) {
      [kitchenDept] = await db.insert(departments).values({
        restaurantId: restaurant.id,
        name: 'Кухня',
        description: 'Основная кухня',
        isFoodPreparation: true,
      }).returning();
    }

    let barDept = await db.query.departments.findFirst({
      where: and(eq(departments.restaurantId, restaurant.id), eq(departments.name, 'Бар')),
    });
    if (!barDept) {
      [barDept] = await db.insert(departments).values({
        restaurantId: restaurant.id,
        name: 'Бар',
        description: 'Барная стойка',
        isFoodPreparation: true,
      }).returning();
    }

    console.log('✅ Departments ready\n');

    // 7. Создаём блюда меню (54 штуки - правильные данные из seed-extended.ts)
    console.log('\n🍽️  Creating menu items (54 items)...');

    // Закуски (8)
    const zakuskiItems = [
      {
        name: 'Картофель фри',
        description: 'Картошка нарезанная палочками, обжаренная во фритюре. Подаётся с кетчупом.',
        price: '180',
        imageUrl: '/images/zakuski/fri.webp',
        calories: 312,
        proteins: 4,
        fats: 15,
        carbohydrates: 41,
      },
      {
        name: 'Гренки с чесночным соусом',
        description: 'Гренки из чёрного хлеба, натёртые чесноком. Подаются с соусом.',
        price: '160',
        imageUrl: '/images/zakuski/grenki.webp',
        calories: 285,
        proteins: 8,
        fats: 12,
        carbohydrates: 35,
      },
      {
        name: 'Кольца кальмара',
        description: 'Кольца кальмара жареные во фритюре. Подаются с чесночным соусом.',
        price: '320',
        imageUrl: '/images/zakuski/kalamari.webp',
        calories: 175,
        proteins: 18,
        fats: 9,
        carbohydrates: 6,
      },
      {
        name: 'Креветки в панировке',
        description: 'Королевские креветки обжаренные во фритюре.',
        price: '450',
        imageUrl: '/images/zakuski/krevedko.webp',
        calories: 220,
        proteins: 22,
        fats: 12,
        carbohydrates: 8,
      },
      {
        name: 'Жареные крылышки',
        description: 'Обжаренные крылышки с хрустящей корочкой. Подаются с кетчупом.',
        price: '280',
        imageUrl: '/images/zakuski/krilya.webp',
        calories: 290,
        proteins: 20,
        fats: 21,
        carbohydrates: 4,
      },
      {
        name: 'Куриные стрипсы',
        description: 'Обжаренные во фритюре куриные стрипсы. Подаются с кетчупом.',
        price: '240',
        imageUrl: '/images/zakuski/stripsi.webp',
        calories: 265,
        proteins: 25,
        fats: 15,
        carbohydrates: 10,
      },
      {
        name: 'Жареный сыр сулугуни',
        description: 'Обжаренный во фритюре сыр сулугуни.',
        price: '220',
        imageUrl: '/images/zakuski/suluguni.webp',
        calories: 340,
        proteins: 18,
        fats: 28,
        carbohydrates: 2,
      },
      {
        name: 'Большая тарелка',
        description: 'Ассорти из всех закусок.',
        price: '690',
        imageUrl: '/images/zakuski/assorti.webp',
        calories: 580,
        proteins: 35,
        fats: 32,
        carbohydrates: 38,
      },
    ];

    // Салаты
    const saladsItems = [
      {
        name: 'Салат с баклажанами',
        description: 'Свежий салат с запечёнными баклажанами.',
        price: '190',
        imageUrl: '/images/salades/baklazhani.webp',
        calories: 120,
        proteins: 4,
        fats: 8,
        carbohydrates: 10,
      },
      {
        name: 'Цезарь',
        description: 'Классический салат Цезарь с курицей и пармезаном.',
        price: '320',
        imageUrl: '/images/salades/cesar.webp',
        calories: 285,
        proteins: 18,
        fats: 21,
        carbohydrates: 12,
      },
      {
        name: 'Коулслоу',
        description: 'Салат из свежей капусты с морковью.',
        price: '150',
        imageUrl: '/images/salades/coulslow.webp',
        calories: 95,
        proteins: 2,
        fats: 6,
        carbohydrates: 9,
      },
      {
        name: 'Фасоль с курицей',
        description: 'Салат с фасолью и куриной грудкой.',
        price: '240',
        imageUrl: '/images/salades/fasolkuritsa.webp',
        calories: 180,
        proteins: 16,
        fats: 7,
        carbohydrates: 15,
      },
      {
        name: 'Салат с говядиной',
        description: 'Тёплый салат с говядиной и овощами.',
        price: '380',
        imageUrl: '/images/salades/govyadina.webp',
        calories: 210,
        proteins: 22,
        fats: 12,
        carbohydrates: 8,
      },
      {
        name: 'Мимоза',
        description: 'Классический салат Мимоза со слоями рыбы и овощей.',
        price: '270',
        imageUrl: '/images/salades/mimoza.webp',
        calories: 245,
        proteins: 15,
        fats: 18,
        carbohydrates: 7,
      },
      {
        name: 'Оливье',
        description: 'Традиционный салат Оливье.',
        price: '210',
        imageUrl: '/images/salades/olive.webp',
        calories: 195,
        proteins: 8,
        fats: 14,
        carbohydrates: 11,
      },
      {
        name: 'Овощной',
        description: 'Салат из свежих овощей.',
        price: '170',
        imageUrl: '/images/salades/ovoshnoy.webp',
        calories: 85,
        proteins: 3,
        fats: 5,
        carbohydrates: 8,
      },
      {
        name: 'Сельдь под шубой',
        description: 'Классический слоёный салат с сельдью.',
        price: '230',
        imageUrl: '/images/salades/seldpodshuboy.webp',
        calories: 185,
        proteins: 9,
        fats: 12,
        carbohydrates: 13,
      },
    ];

    // Супы
    const soupsItems = [
      {
        name: 'Борщ',
        description: 'Традиционный украинский борщ.',
        price: '180',
        imageUrl: '/images/soups/borsch.webp',
        calories: 145,
        proteins: 7,
        fats: 8,
        carbohydrates: 12,
      },
      {
        name: 'Гороховый суп',
        description: 'Наваристый гороховый суп с копчёностями.',
        price: '160',
        imageUrl: '/images/soups/gorohoviy.webp',
        calories: 165,
        proteins: 10,
        fats: 7,
        carbohydrates: 18,
      },
      {
        name: 'Лапша с курицей',
        description: 'Домашняя лапша с куриным мясом.',
        price: '190',
        imageUrl: '/images/soups/lapsha-kuritsa.webp',
        calories: 155,
        proteins: 12,
        fats: 6,
        carbohydrates: 16,
      },
      {
        name: 'Щавелевый суп',
        description: 'Лёгкий суп со свежим щавелем.',
        price: '170',
        imageUrl: '/images/soups/shavel.webp',
        calories: 110,
        proteins: 6,
        fats: 5,
        carbohydrates: 11,
      },
      {
        name: 'Солянка',
        description: 'Мясная солянка с оливками и лимоном.',
        price: '280',
        imageUrl: '/images/soups/solyanka.webp',
        calories: 195,
        proteins: 15,
        fats: 12,
        carbohydrates: 8,
      },
      {
        name: 'Уха',
        description: 'Рыбный суп из свежей рыбы.',
        price: '320',
        imageUrl: '/images/soups/uha.webp',
        calories: 125,
        proteins: 16,
        fats: 5,
        carbohydrates: 6,
      },
    ];

    // Горячее
    const hotItems = [
      {
        name: 'Баранина на кости',
        description: 'Баранья корейка на кости, запечённая с пряностями.',
        price: '650',
        imageUrl: '/images/hot/baran-kost.webp',
        calories: 320,
        proteins: 28,
        fats: 22,
        carbohydrates: 2,
      },
      {
        name: 'Бефстроганов',
        description: 'Говядина в сливочном соусе с грибами.',
        price: '420',
        imageUrl: '/images/hot/befstroganov.webp',
        calories: 285,
        proteins: 25,
        fats: 18,
        carbohydrates: 8,
      },
      {
        name: 'Дорадо',
        description: 'Рыба дорадо, запечённая с овощами.',
        price: '580',
        imageUrl: '/images/hot/dorado.webp',
        calories: 195,
        proteins: 22,
        fats: 11,
        carbohydrates: 1,
      },
      {
        name: 'Говядина с овощами',
        description: 'Тушёная говядина с сезонными овощами.',
        price: '380',
        imageUrl: '/images/hot/govyadina-s-ovoshami.webp',
        calories: 245,
        proteins: 26,
        fats: 14,
        carbohydrates: 12,
      },
      {
        name: 'Куриные сердечки',
        description: 'Обжаренные куриные сердечки с луком.',
        price: '240',
        imageUrl: '/images/hot/kurinie-serdechki.webp',
        calories: 185,
        proteins: 20,
        fats: 11,
        carbohydrates: 3,
      },
      {
        name: 'Котлеты по-киевски',
        description: 'Классические куриные котлеты с маслом внутри.',
        price: '320',
        imageUrl: '/images/hot/pokievski.webp',
        calories: 310,
        proteins: 22,
        fats: 23,
        carbohydrates: 6,
      },
      {
        name: 'Котлеты Пожарские',
        description: 'Куриные котлеты в панировке.',
        price: '290',
        imageUrl: '/images/hot/pozharskaya.webp',
        calories: 275,
        proteins: 24,
        fats: 18,
        carbohydrates: 5,
      },
      {
        name: 'Свиные рёбра',
        description: 'Запечённые свиные рёбра в медово-горчичном соусе.',
        price: '450',
        imageUrl: '/images/hot/rebra-svin.webp',
        calories: 380,
        proteins: 25,
        fats: 30,
        carbohydrates: 4,
      },
      {
        name: 'Рулька',
        description: 'Свиная рулька, запечённая с пивом.',
        price: '520',
        imageUrl: '/images/hot/rulka.webp',
        calories: 420,
        proteins: 32,
        fats: 32,
        carbohydrates: 3,
      },
      {
        name: 'Шашлык куриный',
        description: 'Маринованное куриное мясо, приготовленное на углях.',
        price: '280',
        imageUrl: '/images/hot/shashlik-kur.webp',
        calories: 235,
        proteins: 28,
        fats: 13,
        carbohydrates: 2,
      },
      {
        name: 'Шашлык свиной',
        description: 'Сочная свинина, приготовленная на углях.',
        price: '350',
        imageUrl: '/images/hot/shashlik-svin.webp',
        calories: 310,
        proteins: 25,
        fats: 23,
        carbohydrates: 1,
      },
      {
        name: 'Стейк из форели',
        description: 'Стейк из свежей форели на гриле.',
        price: '480',
        imageUrl: '/images/hot/steyk-forel.webp',
        calories: 205,
        proteins: 24,
        fats: 12,
        carbohydrates: 1,
      },
      {
        name: 'Куриный стейк',
        description: 'Сочная куриная грудка на гриле.',
        price: '260',
        imageUrl: '/images/hot/steyk-kura.webp',
        calories: 195,
        proteins: 26,
        fats: 9,
        carbohydrates: 2,
      },
      {
        name: 'Свиной стейк',
        description: 'Сочный стейк из свинины.',
        price: '380',
        imageUrl: '/images/hot/steyk-svin.webp',
        calories: 285,
        proteins: 27,
        fats: 18,
        carbohydrates: 3,
      },
      {
        name: 'Судак',
        description: 'Судак, запечённый с лимоном и зеленью.',
        price: '420',
        imageUrl: '/images/hot/sudak.webp',
        calories: 175,
        proteins: 23,
        fats: 8,
        carbohydrates: 4,
      },
      {
        name: 'Утка',
        description: 'Утиная грудка с апельсиновым соусом.',
        price: '580',
        imageUrl: '/images/hot/utka.webp',
        calories: 335,
        proteins: 24,
        fats: 26,
        carbohydrates: 8,
      },
      {
        name: 'Жаркое',
        description: 'Мясо, тушёное с картофелем и овощами в горшочке.',
        price: '320',
        imageUrl: '/images/hot/zharkoe.webp',
        calories: 295,
        proteins: 20,
        fats: 16,
        carbohydrates: 18,
      },
    ];

    // Десерты
    const desertsItems = [
      {
        name: 'Киевский торт',
        description: 'Воздушный торт с орехами и безе.',
        price: '180',
        imageUrl: '/images/desert/kievskiy.webp',
        calories: 385,
        proteins: 6,
        fats: 22,
        carbohydrates: 42,
      },
      {
        name: 'Медовик',
        description: 'Классический торт с медовыми коржами.',
        price: '160',
        imageUrl: '/images/desert/medovik.webp',
        calories: 345,
        proteins: 5,
        fats: 18,
        carbohydrates: 45,
      },
      {
        name: 'Наполеон',
        description: 'Торт из слоёного теста с заварным кремом.',
        price: '170',
        imageUrl: '/images/desert/napoleon.webp',
        calories: 420,
        proteins: 4,
        fats: 28,
        carbohydrates: 38,
      },
      {
        name: 'Печенье',
        description: 'Ассорти домашнего печенья.',
        price: '120',
        imageUrl: '/images/desert/pechenie.webp',
        calories: 480,
        proteins: 6,
        fats: 24,
        carbohydrates: 60,
      },
      {
        name: 'Сметанник',
        description: 'Нежный торт со сметанным кремом.',
        price: '150',
        imageUrl: '/images/desert/smetannik.webp',
        calories: 320,
        proteins: 5,
        fats: 16,
        carbohydrates: 42,
      },
    ];

    // Напитки
    const drinksItems = [
      {
        name: 'Апельсиновый фреш',
        description: 'Свежевыжатый апельсиновый сок.',
        price: '190',
        imageUrl: '/images/drinks/apelsin-fresh.webp',
        calories: 45,
        proteins: 1,
        fats: 0,
        carbohydrates: 10,
      },
      {
        name: 'Морковный фреш',
        description: 'Свежевыжатый морковный сок.',
        price: '160',
        imageUrl: '/images/drinks/morkov-fresh.webp',
        calories: 40,
        proteins: 1,
        fats: 0,
        carbohydrates: 9,
      },
      {
        name: 'Яблочный фреш',
        description: 'Свежевыжатый яблочный сок.',
        price: '170',
        imageUrl: '/images/drinks/yabloko-fresh.webp',
        calories: 42,
        proteins: 0,
        fats: 0,
        carbohydrates: 10,
      },
      {
        name: 'Квас',
        description: 'Домашний хлебный квас.',
        price: '120',
        imageUrl: '/images/drinks/kvas.webp',
        calories: 30,
        proteins: 0,
        fats: 0,
        carbohydrates: 7,
      },
      {
        name: 'Морс брусничный',
        description: 'Морс из свежей брусники.',
        price: '140',
        imageUrl: '/images/drinks/mors-brusnichn.webp',
        calories: 55,
        proteins: 0,
        fats: 0,
        carbohydrates: 13,
      },
      {
        name: 'Морс из чёрной смородины',
        description: 'Морс из свежей чёрной смородины.',
        price: '140',
        imageUrl: '/images/drinks/mors-chern-smorod.webp',
        calories: 50,
        proteins: 0,
        fats: 0,
        carbohydrates: 12,
      },
      {
        name: 'Морс клюквенный',
        description: 'Морс из свежей клюквы.',
        price: '140',
        imageUrl: '/images/drinks/mors-klukv.webp',
        calories: 48,
        proteins: 0,
        fats: 0,
        carbohydrates: 11,
      },
      {
        name: 'Морс облепиховый',
        description: 'Морс из свежей облепихи.',
        price: '150',
        imageUrl: '/images/drinks/mors-oblepihov.webp',
        calories: 52,
        proteins: 0,
        fats: 0,
        carbohydrates: 12,
      },
      {
        name: 'Морс вишнёвый',
        description: 'Морс из свежей вишни.',
        price: '140',
        imageUrl: '/images/drinks/mors-vishnev.webp',
        calories: 58,
        proteins: 0,
        fats: 0,
        carbohydrates: 14,
      },
    ];

    // Вставляем все блюда
    console.log('Inserting menu items...\n');

    // Добавляем translations для каждого блюда
    const addTranslations = (item: any) => ({
      ...item,
      translations: JSON.stringify({
        ru: {
          name: item.name,
          description: item.description || ''
        }
      })
    });

    const allItems = [
      ...zakuskiItems.map(item => addTranslations({ ...item, categoryId: zakuskiCat!.id, restaurantId: restaurant.id, prepDepartmentId: kitchenDept!.id, isAvailable: true })),
      ...saladsItems.map(item => addTranslations({ ...item, categoryId: saladesCat!.id, restaurantId: restaurant.id, prepDepartmentId: kitchenDept!.id, isAvailable: true })),
      ...soupsItems.map(item => addTranslations({ ...item, categoryId: soupsCat!.id, restaurantId: restaurant.id, prepDepartmentId: kitchenDept!.id, isAvailable: true })),
      ...hotItems.map(item => addTranslations({ ...item, categoryId: hotCat!.id, restaurantId: restaurant.id, prepDepartmentId: kitchenDept!.id, isAvailable: true })),
      ...desertsItems.map(item => addTranslations({ ...item, categoryId: desertsCat!.id, restaurantId: restaurant.id, prepDepartmentId: kitchenDept!.id, isAvailable: true })),
      ...drinksItems.map(item => addTranslations({ ...item, categoryId: drinksCat!.id, restaurantId: restaurant.id, prepDepartmentId: barDept!.id, isAvailable: true })),
    ];

    await db.insert(menuItems).values(allItems);

    console.log(`✅ Inserted ${allItems.length} menu items:`);
    console.log(`   - Закуски: ${zakuskiItems.length}`);
    console.log(`   - Салаты: ${saladsItems.length}`);
    console.log(`   - Супы: ${soupsItems.length}`);
    console.log(`   - Горячее: ${hotItems.length}`);
    console.log(`   - Десерты: ${desertsItems.length}`);
    console.log(`   - Напитки: ${drinksItems.length}`);

    console.log('\n🎉 Extended seed completed successfully!\n');
  } catch (error) {
    console.error('❌ Extended seed failed:', error);
    process.exit(1);
  }
}

seedExtended();
