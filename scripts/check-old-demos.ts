import 'dotenv/config';
import { db } from '../src/lib/db';
import { restaurants, users } from '../src/lib/db/schema';
import { sql } from 'drizzle-orm';

async function checkOldDemos() {
  console.log('🔍 Проверка старых демо-ресторанов...\n');

  // Находим все демо-рестораны (slug начинается с 'demo-')
  const demoRestaurants = await db
    .select({
      id: restaurants.id,
      slug: restaurants.slug,
      name: restaurants.name,
      createdAt: restaurants.createdAt,
    })
    .from(restaurants)
    .where(sql`${restaurants.slug} LIKE 'demo-%'`)
    .orderBy(restaurants.createdAt);

  if (demoRestaurants.length === 0) {
    console.log('✅ Демо-ресторанов не найдено');
    return;
  }

  console.log(`📊 Найдено демо-ресторанов: ${demoRestaurants.length}\n`);

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  let oldDemosCount = 0;
  let activeDemosCount = 0;

  for (const demo of demoRestaurants) {
    const createdAt = new Date(demo.createdAt);
    const ageInHours = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60));
    const ageInDays = Math.floor(ageInHours / 24);
    
    const isOld = createdAt < twentyFourHoursAgo;
    
    if (isOld) {
      oldDemosCount++;
      console.log(`❌ СТАРЫЙ (${ageInDays} дней, ${ageInHours} часов)`);
    } else {
      activeDemosCount++;
      console.log(`✅ Активный (${ageInHours} часов)`);
    }
    
    console.log(`   ID: ${demo.id}`);
    console.log(`   Slug: ${demo.slug}`);
    console.log(`   Создан: ${createdAt.toISOString()}`);
    console.log('');
  }

  console.log('\n📈 Итого:');
  console.log(`   Активных (< 24 часов): ${activeDemosCount}`);
  console.log(`   Старых (> 24 часов): ${oldDemosCount}`);
  
  if (oldDemosCount > 0) {
    console.log('\n⚠️  ВНИМАНИЕ: Найдены старые демо-рестораны, которые должны быть удалены!');
    console.log('   Механизм автоудаления НЕ реализован.');
  }

  process.exit(0);
}

checkOldDemos().catch((error) => {
  console.error('❌ Ошибка:', error);
  process.exit(1);
});
