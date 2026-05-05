# Автоматическая очистка демо-ресторанов

## Vercel Cron Job

Настроен автоматический cron job для удаления демо-ресторанов старше 24 часов.

### Конфигурация

**Файл:** `vercel.json`
```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-old-demos",
      "schedule": "0 * * * *"
    }
  ]
}
```

**Расписание:** `0 * * * *` - каждый час в начале часа

### API Endpoint

**URL:** `/api/cron/cleanup-old-demos`  
**Метод:** GET  
**Защита:** Authorization header с CRON_SECRET

### Что удаляется

- Демо-рестораны (slug начинается с `demo-`)
- Созданные более 24 часов назад
- Каскадное удаление:
  - Пользователи
  - Столики
  - Меню и блюда
  - Заказы
  - Все связанные данные

### Настройка на Vercel

1. **Добавить переменную окружения:**
   ```
   Vercel Dashboard → Settings → Environment Variables
   CRON_SECRET=your-random-secret-here
   ```

2. **Деплой на Vercel:**
   ```bash
   git push origin main
   ```

3. **Vercel автоматически:**
   - Читает `vercel.json`
   - Регистрирует cron job
   - Запускает каждый час

### Проверка работы

**Логи Vercel:**
```
Vercel Dashboard → Deployments → Latest → Functions → /api/cron/cleanup-old-demos
```

**Ручное тестирование локально:**
```bash
npm run cron:cleanup
```

**Ручной вызов на продакшене:**
```bash
curl -X GET https://itresto-demo.vercel.app/api/cron/cleanup-old-demos \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Ответ API

**Успешное выполнение:**
```json
{
  "success": true,
  "message": "Deleted 3 old demo restaurants",
  "deleted": 3,
  "demos": [
    {
      "slug": "demo-abc123",
      "name": "Демо Ресторан #42",
      "createdAt": "2026-05-04T10:00:00.000Z"
    }
  ],
  "timestamp": "2026-05-05T19:00:00.000Z"
}
```

**Нет демо для удаления:**
```json
{
  "success": true,
  "message": "No old demos to clean up",
  "deleted": 0,
  "timestamp": "2026-05-05T19:00:00.000Z"
}
```

### Мониторинг

Логи cron job автоматически пишутся в консоль Vercel Functions:
- `[CRON] Starting cleanup...`
- `[CRON] Found X old demo restaurants`
- `[CRON] Deleted demo: demo-xxx`
- `[CRON] Cleanup completed`

### Отладка

Если cron не работает:

1. **Проверить Vercel Dashboard:**
   - Settings → Cron Jobs → должен быть виден job

2. **Проверить переменные окружения:**
   - `CRON_SECRET` установлен

3. **Проверить логи:**
   - Functions → /api/cron/cleanup-old-demos

4. **Протестировать локально:**
   ```bash
   npm run cron:cleanup
   ```

### Ограничения Vercel

- **Hobby план:** 1 cron job
- **Pro план:** неограниченно
- **Timeout:** 10 секунд (Hobby), 60 секунд (Pro)

Если демо-ресторанов много и удаление занимает > 10 секунд на Hobby плане, нужно:
- Обновиться до Pro
- Или добавить пагинацию (удалять по 10 штук за раз)
