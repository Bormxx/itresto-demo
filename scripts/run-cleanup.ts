/**
 * Ручной запуск очистки старых демо-ресторанов
 * Для тестирования локально перед деплоем
 */
import 'dotenv/config';

const CRON_SECRET = process.env.CRON_SECRET || 'test-secret';
const API_URL = process.env.NEXTAUTH_URL || 'http://localhost:3002';

async function runCleanup() {
  console.log('🧹 Запуск очистки старых демо-ресторанов...\n');
  console.log(`API URL: ${API_URL}/api/cron/cleanup-old-demos\n`);

  try {
    const response = await fetch(`${API_URL}/api/cron/cleanup-old-demos`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    console.log('✅ Результат:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');

    if (data.deleted > 0) {
      console.log(`🗑️  Удалено демо-ресторанов: ${data.deleted}`);
      console.log('');
      data.demos.forEach((demo: any, index: number) => {
        console.log(`${index + 1}. ${demo.name}`);
        console.log(`   Slug: ${demo.slug}`);
        console.log(`   Создан: ${demo.createdAt}`);
        console.log('');
      });
    } else {
      console.log('ℹ️  Нет демо-ресторанов для удаления');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

runCleanup();
