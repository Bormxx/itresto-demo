# План реализации Демо-ресторана

**Дата создания:** 9 апреля 2026 г.

---

## 📋 1. Концепция и цели

### Проблема
Потенциальные клиенты хотят **быстро посмотреть** на систему с готовыми данными:
- Настроенное меню с фотографиями
- Активные заказы
- Отчеты с графиками
- Разные роли и отделы приготовления
- Организация смен

**Регистрация своего ресторана** требует много времени на настройку → клиент уходит, не попробовав.

### Решение
**Демо-ресторан с персональной изоляцией:**
- Каждый пользователь получает **свой изолированный демо**
- Готовые тестовые данные (меню, заказы, персонал)
- Доступ ко всем ролям (supervisor, manager, waiter, kitchen, bar)
- Автоудаление через 24 часа

### Ключевые принципы
✅ **Без регистрации** - один клик для создания  
✅ **Полная изоляция** - никто не мешает друг другу  
✅ **Простые логины** - легко запомнить и вернуться  
✅ **Безопасность** - защита от ботов и спама  
✅ **Автоочистка** - не засоряет БД

---

## 🏗️ 1.1. Архитектура проекта

### Отдельный проект для демо

**Расположение:** `/home/alexander/dev/itresto-demo`

**Почему отдельно:**
- Полная изоляция от продакшена
- Независимые деплои
- Демо может отставать от основного проекта
- Простота управления и отладки
- Нет риска повредить продакшен-данные

### Инфраструктура

```
┌─────────────────────────────────────────┐
│    itresto.ru (Маркетинговый сайт)      │
│    - Next.js на Vercel                  │
│    - marketing_db (Turso)               │
└──────────────┬──────────────────────────┘
               │
               │ [Попробовать демо] → redirect
               ↓
┌─────────────────────────────────────────┐
│    demo.itresto.ru (Демо-проект) ⭐      │
│    - Next.js на Vercel (бесплатно)      │
│    - demo_db на Turso (бесплатно 9GB)   │
│    - Создание test1/test2/test3         │
│    - Seed тестовых данных               │
│    - Автоочистка через 24ч              │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│    app.itresto.ru (Продакшен)           │
│    - Next.js на VPS                     │
│    - PostgreSQL (Docker)                │
│    - Реальные рестораны клиентов        │
└─────────────────────────────────────────┘
```

### Хостинг

**Vercel (бесплатный тариф):**
- 100 GB bandwidth/month
- Unlimited deployments
- Automatic HTTPS
- Edge functions
- Custom domain support

**Turso (бесплатный тариф):**
- 9 GB storage (~1800 демо по 5MB)
- 1 billion row reads/month
- 25 million row writes/month
- SQLite-compatible
- Replicas в разных регионах (на платном)

### Стоимость

**Старт:** $0/месяц (бесплатные тарифы)

**При росте:**
- Vercel Pro: $20/мес (если > 100GB bandwidth)
- Turso Starter: $29/мес (если > 9GB storage)

**Прогноз:**
- 1000 демо/месяц × 5MB = 5GB → бесплатно ✅
- 10000 демо/месяц × 5MB = 50GB → Turso Pro $29/мес

### Что включено в демо

**✅ Копируется из основного проекта:**
- QR-меню для клиентов
- Система заказов и отчетов
- Все роли (supervisor, manager, waiter, kitchen, bar)
- Управление меню и категориями
- Столики и их назначение
- Смены (базовый функционал)
- Отделы приготовления (кухня, бар)

**❌ НЕ включается (еще не разработано или не нужно для демо):**
- Модуль склада
- Достижения и аватары
- Email-уведомления
- Платежные интеграции (ЮKassa)
- Сложная аналитика

**Логика обновления:**
- Демо обновляется вручную при выходе важных фич
- Раз в 1-3 месяца или по необходимости
- Не критично, если демо отстает на 1-2 недели
- Важно показать стабильную работу, а не новейшие фичи

### Технический стек

**Frontend/Backend:**
- Next.js 15+ (App Router)
- React 18+
- TypeScript
- Tailwind CSS

**База данных:**
- Turso (SQLite/libSQL)
- Drizzle ORM
- Drizzle Kit для миграций

**Авторизация:**
- NextAuth.js
- Credentials provider
- Простые логины: supervisor@test1.ru

**Деплой:**
- Vercel CLI
- GitHub integration (автодеплой на push)
- Custom domain: demo.itresto.ru

---

## 🚀 2. Этап 1: MVP (базовый функционал + минимальная защита)

### Функционал

**2.1. Страница создания демо** (`/demo/create`)

**Сценарий 1: Первое создание демо**
1. Пользователь кликает "Попробовать демо" на маркетинге
2. Переход на `/demo/create`
3. Система:
   - Проверяет куки `demo_credentials`
   - Если нет активного демо → создает новый
   - Генерирует номер: `test42`
   - Генерирует пароль: `9364` (4 цифры)
   - Создает ресторан: `demo-{UUID}`
   - Создает 5 пользователей:
     ```
     supervisor@test42.ru  → пароль: 9364
     manager@test42.ru     → пароль: 9364
     waiter@test42.ru      → пароль: 9364
     kitchen@test42.ru     → пароль: 9364
     bar@test42.ru         → пароль: 9364
     ```
   - Копирует seed-данные (меню, столики, категории, заказы)
   - Сохраняет в куки:
     ```json
     {
       "demo_number": "test42",
       "password": "9364",
       "restaurant_slug": "demo-a1b2c3d4-...",
       "expires_at": "2026-04-10T14:30:00Z"
     }
     ```
     > Max-Age: 86400 (24 часа), HttpOnly, SameSite=Strict

4. Показывает модалку:
   ```
   ┌─────────────────────────────────────┐
   │ ✅ Демо-ресторан создан!            │
   │                                     │
   │ 📝 Сохраните эти данные:            │
   │                                     │
   │ Роль Supervisor (полный доступ):    │
   │ Логин:   supervisor@test42.ru       │
   │ Пароль:  9364                       │
   │                                     │
   │ Другие роли для тестирования:       │
   │ • manager@test42.ru (тот же пароль) │
   │ • waiter@test42.ru                  │
   │ • kitchen@test42.ru                 │
   │ • bar@test42.ru                     │
   │                                     │
   │ ⏰ Демо удалится через 24 часа      │
   │                                     │
   │ [Войти как Supervisor] [Скопировать]│
   └─────────────────────────────────────┘
   ```

**Сценарий 2: Повторный заход (есть активное демо)**
1. Система находит `demo_credentials` в куки
2. Проверяет, что демо еще активно (не истек expires_at)
3. Показывает модалку:
   ```
   ┌─────────────────────────────────────┐
   │ У вас уже есть активное демо!       │
   │                                     │
   │ Роль Supervisor:                    │
   │ Логин:   supervisor@test42.ru       │
   │ Пароль:  9364                       │
   │                                     │
   │ Также доступны:                     │
   │ • manager@test42.ru                 │
   │ • waiter@test42.ru                  │
   │ • kitchen@test42.ru                 │
   │ • bar@test42.ru                     │
   │                                     │
   │ ⏰ Активно до: 10.04.2026 14:30     │
   │                                     │
   │ [Войти] [Создать новое демо]        │
   └─────────────────────────────────────┘
   ```

**2.2. Краткая инструкция**

На странице `/demo/create` показываем:

```markdown
# 🧪 Как использовать демо-ресторан

1. **Мы создали тестовый ресторан** с готовыми данными
2. **Войдите под разными ролями:**
   - **Supervisor** - полный доступ ко всем функциям
   - **Manager** - управление меню, заказами, отчеты
   - **Waiter** - интерфейс официанта (мобильное приложение)
   - **Kitchen** - экран кухни для приготовления блюд
   - **Bar** - экран бара для напитков
3. **Все изменения** сохраняются только в вашем демо
4. **Пароль одинаковый** для всех ролей
5. **Данные удалятся** автоматически через 24 часа
```

**2.3. Вход в систему**

Обычная страница логина `/[locale]/[restaurant]/auth/signin`:
- Пользователь вводит: `supervisor@test42.ru` / `9364`
- Система определяет ресторан по email домену: `@test42.ru` → `demo-{uuid}`
- Редирект на роль: `/ru/demo-{uuid}/supervisor`

---

### Минимальная защита от атак

**3.1. Rate Limiting по IP**
```typescript
// Лимиты:
- 1 демо в час с одного IP
- 3 демо в день с одного IP
```

**Реализация:**
- Таблица `demo_rate_limits`:
  ```sql
  id, ip_address, created_at, count_today, last_created_at
  ```
- При создании демо:
  - Проверяем `last_created_at` → если < 1 час назад → отклоняем
  - Проверяем `count_today` → если >= 3 → отклоняем
  - Increment счетчик

**3.2. Проверка активного демо в куках**
```typescript
// Если в куках есть demo_credentials с действующим expires_at:
→ Показываем существующее демо
→ Кнопка "Создать новое" удаляет старое и создает новое
```

**3.3. Honeypot поле**
```html
<!-- Скрытое поле в форме создания -->
<input type="text" name="website" style="display:none" tabindex="-1" autocomplete="off">
```

```typescript
// На сервере:
if (formData.website !== '') {
  // Это бот, отклоняем молча
  return { success: false };
}
```

**3.4. Автоочистка старых демо**

Cron job каждый час:
```sql
-- Удаляем демо старше 24 часов
DELETE FROM restaurants 
WHERE slug LIKE 'demo-%' 
AND created_at < NOW() - INTERVAL '24 hours';

-- Каскадное удаление пользователей, заказов и т.д. через ON DELETE CASCADE
```

---

### Технические детали MVP

**База данных:**

**Таблица demo_counter:**
```sql
CREATE TABLE demo_counter (
  id INTEGER PRIMARY KEY DEFAULT 1,
  current_number INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Таблица demo_rate_limits:**
```sql
CREATE TABLE demo_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL UNIQUE,
  count_today INTEGER DEFAULT 1,
  last_created_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_demo_rate_limits_ip ON demo_rate_limits(ip_address);
CREATE INDEX idx_demo_rate_limits_created ON demo_rate_limits(created_at);
```

**Процесс создания демо:**

```typescript
// POST /api/demo/create
async function createDemo(ip: string) {
  // 1. Проверка rate limits
  const rateLimit = await checkRateLimit(ip);
  if (!rateLimit.allowed) {
    throw new Error('Rate limit exceeded');
  }

  // 2. Increment demo counter
  const demoNumber = await incrementDemoCounter(); // test42

  // 3. Генерация пароля
  const password = generatePassword(); // 9364

  // 4. Создание ресторана
  const restaurantSlug = `demo-${crypto.randomUUID()}`;
  const restaurant = await createRestaurant({
    slug: restaurantSlug,
    name: `Демо Ресторан #${demoNumber}`,
    // ... seed данные
  });

  // 5. Создание пользователей
  const roles = ['supervisor', 'manager', 'waiter', 'kitchen', 'bar'];
  for (const role of roles) {
    await createUser({
      email: `${role}@test${demoNumber}.ru`,
      password: hashPassword(password),
      role: role,
      restaurantId: restaurant.id,
    });
  }

  // 6. Копирование seed данных
  await seedDemoData(restaurant.id);

  // 7. Обновление rate limit
  await updateRateLimit(ip);

  // 8. Возврат credentials
  return {
    demoNumber,
    password,
    restaurantSlug,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  };
}
```

**Seed данные для демо:**
- Категории меню (3-5 категорий)
- Блюда (20-30 блюд с фото)
- Столики (5-10 столиков)
- Тестовые заказы (2-3 активных заказа)
- Модификаторы (размеры, добавки)
- Отделы приготовления (кухня, бар)

---

## ⚡ 3. Этап 2: Улучшения (средняя защита)

**Реализуется после запуска MVP, если появятся атаки**

### 3.1. CAPTCHA после первого создания

**Логика:**
- Первое создание демо с IP → без CAPTCHA
- Второе и последующие → требуем CAPTCHA

**Реализация:**
```typescript
// Проверяем в demo_rate_limits:
if (rateLimit.count_today >= 1) {
  // Требуем CAPTCHA
  await verifyCaptcha(captchaToken);
}
```

**Библиотека:** `react-google-recaptcha` или `hcaptcha/react-hcaptcha`

### 3.2. Browser Fingerprinting

**Цель:** Защита от VPN/прокси - определяем уникальность устройства

**Библиотека:** `@fingerprintjs/fingerprintjs`

**Реализация:**
```typescript
// На клиенте:
const fp = await FingerprintJS.load();
const result = await fp.get();
const visitorId = result.visitorId; // уникальный ID браузера

// Передаем на сервер вместе с запросом создания демо
// Лимит: 3 демо в день на fingerprint
```

**Таблица:**
```sql
CREATE TABLE demo_fingerprints (
  id UUID PRIMARY KEY,
  fingerprint TEXT NOT NULL,
  count_today INTEGER DEFAULT 1,
  last_created_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 3.3. Лимит активных демо с одного IP

**Логика:**
```sql
-- Не более 2 активных демо с одного IP одновременно
SELECT COUNT(*) FROM demo_rate_limits r
JOIN restaurants res ON res.created_at > NOW() - INTERVAL '24 hours'
WHERE r.ip_address = $1 
  AND res.slug LIKE 'demo-%';
```

Если >= 2 → отклоняем создание нового

---

## 🛡️ 4. Этап 3: Продвинутая защита (если атаки продолжаются)

### 4.1. Email подтверждение (опционально)

**На странице `/demo/create` добавляем опцию:**
```
[ ] Получить данные на email (необязательно)
```

**Если включено:**
- Пользователь вводит email
- Отправляем письмо с логинами/паролями
- Лимит: 1 email = 1 демо в сутки

**Преимущество:** Дополнительный барьер для ботов

### 4.2. Cloudflare Bot Management

**Если атаки массовые:**
- Включить Cloudflare Bot Fight Mode
- Challenge для подозрительных IP
- Автобан IP с высоким bot score

### 4.3. Мониторинг и алерты

**Логирование аномалий:**
```sql
-- Алерт если за 1 час создано > 20 демо
SELECT COUNT(*) FROM restaurants 
WHERE slug LIKE 'demo-%' 
AND created_at > NOW() - INTERVAL '1 hour';
```

**Автобан подозрительных IP:**
```sql
CREATE TABLE demo_banned_ips (
  ip_address TEXT PRIMARY KEY,
  reason TEXT,
  banned_at TIMESTAMP DEFAULT NOW()
);

-- При создании демо проверяем:
SELECT * FROM demo_banned_ips WHERE ip_address = $1;
```

### 4.4. Удаление неиспользованных демо

**Логика:**
```sql
-- Удаляем демо, если прошло > 2 часов и ни разу не логинились
DELETE FROM restaurants r
WHERE r.slug LIKE 'demo-%'
  AND r.created_at < NOW() - INTERVAL '2 hours'
  AND NOT EXISTS (
    SELECT 1 FROM users u
    WHERE u.restaurant_id = r.id
      AND u.last_login IS NOT NULL
  );
```

**Cron:** каждый час

---

## 🔧 5. Техническая реализация

### 5.1. API Endpoints

**POST /api/demo/create**
```typescript
Input: { captchaToken?, fingerprint? }
Output: {
  demoNumber: 'test42',
  password: '9364',
  restaurantSlug: 'demo-uuid',
  roles: ['supervisor', 'manager', 'waiter', 'kitchen', 'bar'],
  expiresAt: '2026-04-10T14:30:00Z'
}
```

**GET /api/demo/check**
```typescript
// Проверка активного демо по кукам
Input: кука demo_credentials
Output: {
  active: true,
  demoNumber: 'test42',
  expiresAt: '2026-04-10T14:30:00Z'
}
```

**DELETE /api/demo/delete**
```typescript
// Удаление текущего демо (если хочет создать новое)
Input: кука demo_credentials
Output: { success: true }
```

### 5.2. Страницы

**Маркетинг:**
- Кнопка "Попробовать демо" → `/demo/create`

**Основное приложение:**
- `/demo/create` - создание/показ активного демо
- `/[locale]/demo-{uuid}/supervisor` - интерфейс supervisor
- `/[locale]/demo-{uuid}/manager` - интерфейс manager
- `/[locale]/demo-{uuid}/waiter` - интерфейс waiter
- `/[locale]/demo-{uuid}/kitchen` - экран кухни
- `/[locale]/demo-{uuid}/bar` - экран бара

### 5.3. Куки

**Название:** `demo_credentials`  
**Структура:**
```json
{
  "demo_number": "test42",
  "password": "9364",
  "restaurant_slug": "demo-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "expires_at": "2026-04-10T14:30:00Z"
}
```

**Параметры:**
- Max-Age: 86400 (24 часа)
- HttpOnly: true
- SameSite: Strict
- Secure: true (только HTTPS)

### 5.4. Cron Jobs

**Каждый час (0 * * * *):**
```bash
# 1. Удаление старых демо (>24ч)
npx tsx scripts/cleanup-old-demos.ts

# 2. Удаление неиспользованных демо (>2ч, не логинились)
npx tsx scripts/cleanup-unused-demos.ts

# 3. Сброс счетчиков rate limits (начало нового дня)
npx tsx scripts/reset-daily-rate-limits.ts
```

### 5.5. Мониторинг

**Метрики для отслеживания:**
- Количество созданных демо в день
- Количество активных демо
- Топ IP по созданию демо
- Коэффициент конверсии: демо → регистрация

**Инструменты:**
- Логи в файл: `/logs/demo-creation.log`
- Dashboard: Grafana + PostgreSQL
- Алерты: если > 50 демо в час

---

## 📊 6. Метрики успеха

**KPI для демо-ресторана:**
- **Конверсия в регистрацию:** цель 15-20%
- **Среднее время в демо:** 10-15 минут
- **Процент возвратов:** клиенты, которые вернулись в демо
- **Топ используемые роли:** какие роли пробуют чаще

**Цели:**
- Снизить барьер входа для новых клиентов
- Показать все возможности системы за 10 минут
- Увеличить регистрации на 30-50%

---

## ✅ 7. Чек-лист реализации

### Этап 1 (MVP) - 2-3 дня разработки

- [ ] Создать таблицы: `demo_counter`, `demo_rate_limits`
- [ ] API endpoint: POST `/api/demo/create`
- [ ] API endpoint: GET `/api/demo/check`
- [ ] API endpoint: DELETE `/api/demo/delete`
- [ ] Страница `/demo/create` с модалками
- [ ] Логика создания 5 пользователей (supervisor, manager, waiter, kitchen, bar)
- [ ] Seed-данные для демо (меню, столики, заказы)
- [ ] Куки `demo_credentials` с TTL 24ч
- [ ] Rate limiting: 1/час, 3/день по IP
- [ ] Honeypot поле в форме
- [ ] Cron job: удаление демо >24ч
- [ ] Тестирование всех сценариев
- [ ] Деплой на продакшен

### Этап 2 (Улучшения) - 1 день

- [ ] Интеграция CAPTCHA (reCAPTCHA v3)
- [ ] Browser fingerprinting (FingerprintJS)
- [ ] Лимит: макс 2 активных демо с одного IP
- [ ] Таблица `demo_fingerprints`
- [ ] Мониторинг: логи создания демо
- [ ] Dashboard с метриками

### Этап 3 (Продвинутая защита) - по необходимости

- [ ] Email подтверждение (опционально)
- [ ] Cloudflare Bot Management
- [ ] Таблица `demo_banned_ips`
- [ ] Cron: удаление неиспользованных демо >2ч
- [ ] Автобан подозрительных IP
- [ ] Алерты в Telegram при аномалиях

---

## 🎯 Итого

**Запуск MVP:** 2-3 дня разработки  
**Базовая защита:** включена с первого дня  
**Улучшения:** по мере роста трафика  
**Результат:** Простой и безопасный способ попробовать систему за 5 минут
