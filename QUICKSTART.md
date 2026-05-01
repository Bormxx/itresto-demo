# 🚀 Быстрый старт Демо-проекта

## Что это?

Демо-версия ITResto для показа возможностей потенциальным клиентам.

**Домен:** demo.itresto.ru  
**Хостинг:** Vercel (бесплатно)  
**БД:** Turso (бесплатно)

---

## ⚙️ Настройка за 5 минут

### 1. Установить зависимости

```bash
npm install
```

### 2. Настроить Turso

```bash
# Установить CLI (если еще нет)
curl -sSfL https://get.tur.so/install.sh | bash

# Создать БД
turso db create itresto-demo --location fra

# Получить credentials
turso db show itresto-demo --url      # скопировать URL
turso db tokens create itresto-demo    # скопировать token
```

### 3. Обновить .env.local

```bash
TURSO_DATABASE_URL=libsql://[ваш-url].turso.io
TURSO_AUTH_TOKEN=[ваш-токен]
NEXTAUTH_URL=http://localhost:3002
NEXTAUTH_SECRET=demo-secret-123
DEMO_MODE=true
```

### 4. Применить схему БД

```bash
npm run db:push
```

### 5. Залить тестовые данные

```bash
npm run db:seed
```

### 6. Запустить

```bash
npm run dev
```

Откроется: http://localhost:3002

---

## 🌐 Деплой на Vercel

### Быстрый способ

```bash
# Установить CLI
npm i -g vercel

# Логин
vercel login

# Деплой
vercel
```

### Добавить переменные окружения

```bash
vercel env add TURSO_DATABASE_URL
vercel env add TURSO_AUTH_TOKEN
vercel env add NEXTAUTH_SECRET
```

Вставить значения из `.env.local`.

### Production деплой

```bash
vercel --prod
```

### Custom domain

В Vercel Dashboard:
1. Settings → Domains
2. Add: `demo.itresto.ru`
3. В DNS добавить CNAME:
   ```
   demo → cname.vercel-dns.com
   ```

---

## 📚 Подробная документация

См. [README.md](README.md) и [DEMO_RESTAURANT_PLAN.md](DEMO_RESTAURANT_PLAN.md)

---

## 🆘 Проблемы?

**"Cannot connect to Turso"**
→ Проверь TURSO_DATABASE_URL и TURSO_AUTH_TOKEN

**"Module not found"**
→ `npm install`

**"Port 3002 already in use"**
→ Останови другой процесс или измени порт в package.json

---

**Готово!** Демо работает на http://localhost:3002 🎉
