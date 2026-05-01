# ITResto Demo - Прогресс разработки

**Дата:** 23 апреля 2026  
**Статус:** MVP готов для локального тестирования ✅

---

## ✅ Что сделано

### 1. Инфраструктура
- ✅ Docker контейнер PostgreSQL (`itresto_demo_postgres`, порт 5433)
- ✅ Volume для хранения данных (`itresto_demo_postgres_data`)
- ✅ Конфигурация `.env.local` для локальной разработки
- ✅ Обновлена схема БД (добавлены таблицы `demo_counter` и `demo_rate_limits`)

### 2. API Endpoint `/api/demo/create`
Реализован полнофункциональный endpoint для создания демо-ресторанов:

**Функционал:**
- ✅ Rate limiting: 1 демо в час, 3 в день с одного IP
- ✅ Генерация уникального номера демо (test1, test2, test3...)
- ✅ Создание ресторана с уникальным slug (`demo-{uuid}`)
- ✅ Активация тарифа "Полный" на 24 часа
- ✅ Создание 4 пользователей с упрощенными логинами:
  - `supervisor@test{N}.ru`
  - `manager@test{N}.ru`
  - `kitchen@test{N}.ru`
  - `bar@test{N}.ru`
- ✅ Генерация 4-значного пароля (одинакового для всех ролей)
- ✅ Seed тестовых данных:
  - Отделы (кухня, бар)
  - Категории меню (3 категории)
  - Блюда (стейки, паста, супы, напитки)
  - Столики (5 столиков разной вместимости)

**Пример ответа:**
```json
{
  "success": true,
  "demo": {
    "restaurantSlug": "demo-a1b2c3d4-...",
    "demoNumber": "test42",
    "password": "9364",
    "users": {
      "supervisor": "supervisor@test42.ru",
      "manager": "manager@test42.ru",
      "kitchen": "kitchen@test42.ru",
      "bar": "bar@test42.ru"
    },
    "expiresAt": "2026-04-24T14:30:00Z"
  }
}
```

### 3. Страница лендинга `/demo/create`
Красивая страница с автоматическим созданием демо:

**Функции:**
- ✅ Объяснение возможностей демо (все роли, готовое меню, изоляция, 24 часа)
- ✅ Кнопка "Создать демо-ресторан"
- ✅ Модалка с данными для входа после создания
- ✅ Кнопки быстрого входа под каждой ролью
- ✅ Копирование email/пароля в буфер обмена
- ✅ Инструкция по подключению мобильного приложения
- ✅ CTA на регистрацию реального ресторана

### 4. Маркетинговый сайт
- ✅ Обновлена ссылка в футере: `https://demo.itresto.ru/demo/create`

---

## 🧪 Локальное тестирование

### Запуск
```bash
# 1. База данных уже запущена
docker ps | grep itresto_demo_postgres

# 2. Dev-сервер
cd /home/alexander/dev/itresto-demo
npm run dev
```

### Тестирование
1. Открыть http://localhost:3002/demo/create
2. Нажать "Создать демо-ресторан"
3. Получить данные для входа (supervisor@test1.ru, пароль)
4. Войти под любой ролью

### Проверка БД
```bash
# Просмотр созданных демо-ресторанов
docker exec itresto_demo_postgres psql -U itresto_demo -d itresto_demo -c "SELECT * FROM restaurants WHERE slug LIKE 'demo-%';"

# Просмотр счетчика
docker exec itresto_demo_postgres psql -U itresto_demo -d itresto_demo -c "SELECT * FROM demo_counter;"

# Просмотр rate limits
docker exec itresto_demo_postgres psql -U itresto_demo -d itresto_demo -c "SELECT * FROM demo_rate_limits;"
```

---

## 🚀 Следующие шаги

### Для production (Vercel + Turso)

#### 1. Регистрация в Turso
```bash
# Установка Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Создание БД
turso db create itresto-demo --location fra

# Получение credentials
turso db show itresto-demo --url
turso db tokens create itresto-demo
```

#### 2. Настройка Vercel
```bash
# Установка Vercel CLI
npm i -g vercel

# Деплой
cd /home/alexander/dev/itresto-demo
vercel

# Настройка environment variables в Vercel:
# - TURSO_DATABASE_URL
# - TURSO_AUTH_TOKEN
# - NEXTAUTH_URL=https://demo.itresto.ru
# - NEXTAUTH_SECRET=...
# - DEMO_MODE=true
```

#### 3. DNS настройка
Добавить A-запись для `demo.itresto.ru` → IP Vercel

#### 4. Миграция БД на Turso
Обновить `drizzle.config.ts` для Turso:
```typescript
export default defineConfig({
  dialect: 'sqlite',
  driver: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
});
```

Применить миграции:
```bash
npm run db:push
```

#### 5. Seed начальных данных
```bash
npm run db:seed
```

### Улучшения (опционально)

- [ ] CAPTCHA после первого создания демо с IP
- [ ] Browser fingerprinting для дополнительной защиты
- [ ] Cron job для удаления демо старше 24 часов
- [ ] Мониторинг и алерты (Sentry, логирование)
- [ ] Аналитика использования демо

---

## 📊 Архитектура

```
┌─────────────────────────────────────────┐
│  itresto.ru (Маркетинговый сайт)        │
│  Footer → "Демо-версия"                 │
└──────────────┬──────────────────────────┘
               │
               ↓ https://demo.itresto.ru/demo/create
               │
┌─────────────────────────────────────────┐
│  demo.itresto.ru (Демо-ресторан)        │
│  - Next.js 16 (Turbopack)               │
│  - PostgreSQL (локально) / Turso (prod) │
│  - Vercel (production)                  │
│                                         │
│  POST /api/demo/create                  │
│  ├─ Rate limiting (IP-based)            │
│  ├─ Generate demo number                │
│  ├─ Create restaurant + users           │
│  ├─ Seed test data                      │
│  └─ Return credentials                  │
└─────────────────────────────────────────┘
```

---

## 🎯 Основные преимущества

1. **Без регистрации** - один клик для создания
2. **Полная изоляция** - каждый получает свой демо-ресторан
3. **Простые логины** - легко запомнить (supervisor@test12)
4. **Все роли доступны** - можно попробовать любую роль
5. **Готовые данные** - меню, столики, отделы уже настроены
6. **Rate limiting** - защита от злоупотреблений
7. **Автоудаление** - демо удаляется через 24 часа (TODO: реализовать cron)

---

## 📝 Примечания

- Seed-скрипт `seed-demo.ts` использует статичный ресторан `demo` - это для разработки
- API `/api/demo/create` создает динамические рестораны `demo-{uuid}` - это для production
- Изображения блюд нужно добавить в `/public/images/`
- Для мобильного приложения нужно указывать адрес сервера `demo.itresto.ru`
