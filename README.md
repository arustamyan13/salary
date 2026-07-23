# Зарплата — PWA учёт выплат сотрудникам

Современное Progressive Web App для учёта заработной платы: список сотрудников, статусы выплат, поиск/фильтры и push-напоминания на iPhone (Home Screen PWA, iOS 16.4+).

**Стек:** React · Vite · TypeScript · Tailwind CSS · Supabase · React Router · vite-plugin-pwa

## Возможности

- Список сотрудников с цветовой индикацией срочности выплаты
- Добавление / редактирование / удаление
- Кнопка **Выплачено** — дата сдвигается на следующий месяц
- Поиск, сортировка, фильтр официальных / неофициальных
- Сводка: число сотрудников, сумма за месяц, выплаты на этой неделе
- Авторизация email/password, RLS — каждый видит только своих
- PWA: установка на домашний экран, офлайн-кэш, Web Push

## Быстрый старт

### 1. Установка

```bash
npm install
cp .env.example .env
```

Заполните `.env`:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key
```

### 2. Запуск

```bash
npm run generate-icons
npm run dev
```

Откройте `http://localhost:5173`.

### 3. Сборка

```bash
npm run build
npm run preview
```

---

## Настройка Supabase

1. Создайте проект на [supabase.com](https://supabase.com).
2. Откройте **SQL Editor** и выполните файл  
   [`supabase/migrations/001_employees.sql`](supabase/migrations/001_employees.sql).
3. Включите Email-провайдер: **Authentication → Providers → Email**.
4. Для локальной разработки можно отключить подтверждение email:  
   **Authentication → Providers → Email → Confirm email** (опционально).
5. Скопируйте **Project URL** и **anon public** ключ в `.env`.

Таблица `employees`: `id`, `name`, `salary`, `pay_day`, `official`, `comment`, `created_at`, `updated_at` (+ `user_id`).  
Таблица `push_subscriptions` хранит Web Push подписки пользователя.

RLS включён: все операции только для `auth.uid() = user_id`.

---

## Деплой на GitHub Pages

Используется **HashRouter**, поэтому маршруты работают на GitHub Pages без отдельного `404.html`.

1. Создайте репозиторий и запушьте код.
2. В репозитории: **Settings → Pages → Source → GitHub Actions**.
3. Добавьте secrets (**Settings → Secrets and variables → Actions**):

| Secret | Описание |
|--------|----------|
| `VITE_SUPABASE_URL` | URL проекта Supabase |
| `VITE_SUPABASE_ANON_KEY` | anon key |
| `VITE_VAPID_PUBLIC_KEY` | публичный VAPID-ключ |

4. Workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) соберёт приложение с  
   `VITE_BASE=/ИМЯ_РЕПО/` и задеплоит в Pages.
5. Сайт: `https://<user>.github.io/<repo>/`

Локально для сборки под Pages:

```bash
set VITE_BASE=/salary-app/
npm run build
```

---

## PWA (в т.ч. iPhone)

- Manifest и service worker настраиваются через `vite-plugin-pwa` (`vite.config.ts`, `src/sw.ts`).
- Иконки: `npm run generate-icons` → `public/icons/*`, `apple-touch-icon.png`.
- На iPhone: Safari → **Поделиться → На экран «Домой»**.
- Push на iOS работает **только** у приложения, установленного на домашний экран (не во вкладке Safari), начиная с **iOS 16.4**.

После входа на главном экране включите блок **«Напоминания о выплатах»**.

---

## Push Notifications

### 1. VAPID-ключи

```bash
npx web-push generate-vapid-keys
```

- Public key → `VITE_VAPID_PUBLIC_KEY` (фронтенд) и secrets бэкенда  
- Private key → **только** сервер (Edge Function / GitHub Actions), никогда в клиент

### 2. Подписка в приложении

Хук `usePushNotifications` запрашивает разрешение, создаёт `PushSubscription` и сохраняет  
`endpoint` / `p256dh` / `auth` в таблицу `push_subscriptions`.

Service worker (`src/sw.ts`) обрабатывает события `push` и `notificationclick`.

### 3. Ежедневная проверка

Если до выплаты **1 день**:

> Завтра необходимо выплатить Иван Иванов — 50 000 ₽

Если **сегодня** (или просрочено):

> Сегодня необходимо выплатить Иван Иванов — 50 000 ₽

---

## Вариант A: Supabase Edge Function

Функция: [`supabase/functions/send-pay-reminders`](supabase/functions/send-pay-reminders).

```bash
# Установите Supabase CLI, залогиньтесь
supabase functions deploy send-pay-reminders

supabase secrets set VAPID_PUBLIC_KEY=...
supabase secrets set VAPID_PRIVATE_KEY=...
supabase secrets set VAPID_SUBJECT=mailto:you@example.com
supabase secrets set CRON_SECRET=случайная-строка
```

Вызов по cron (например, через [cron-job.org](https://cron-job.org) или GitHub Actions):

```bash
curl -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/send-pay-reminders" \
  -H "x-cron-secret: ваша-строка" \
  -H "Authorization: Bearer <ANON_OR_SERVICE_KEY>"
```

Можно повесить pg_cron / внешний планировщик на 09:00 Europe/Moscow.

---

## Вариант B: GitHub Actions

Workflow: [`.github/workflows/push-reminders.yml`](.github/workflows/push-reminders.yml)  
Скрипт: [`scripts/send-pay-reminders.mjs`](scripts/send-pay-reminders.mjs)

Secrets:

| Secret | Описание |
|--------|----------|
| `SUPABASE_URL` | URL проекта |
| `SUPABASE_SERVICE_ROLE_KEY` | **service_role** (не anon!) |
| `VAPID_PUBLIC_KEY` | публичный VAPID |
| `VAPID_PRIVATE_KEY` | приватный VAPID |
| `VAPID_SUBJECT` | например `mailto:you@example.com` |

Расписание: каждый день в 06:00 UTC (≈ 09:00 МСК). Можно запустить вручную: **Actions → Daily Pay Reminders → Run workflow**.

Локально:

```bash
set SUPABASE_URL=...
set SUPABASE_SERVICE_ROLE_KEY=...
set VAPID_PUBLIC_KEY=...
set VAPID_PRIVATE_KEY=...
node scripts/send-pay-reminders.mjs
```

---

## Структура проекта

```
src/
  components/     # UI: карточки, модалка, поиск, FAB, push
  context/        # Auth + Employees (Context API)
  hooks/          # usePushNotifications
  lib/            # supabase client, даты/форматирование
  pages/          # Home, Edit, Login/Register
  sw.ts           # Service Worker + Web Push
  types/
supabase/
  migrations/     # SQL + RLS
  functions/      # Edge Function reminders
scripts/          # иконки + Node-скрипт push
.github/workflows # Pages deploy + daily reminders
```

## Скрипты npm

| Команда | Описание |
|---------|----------|
| `npm run dev` | dev-сервер |
| `npm run build` | production-сборка |
| `npm run preview` | превью сборки |
| `npm run generate-icons` | PNG/SVG иконки PWA |

## Замечания

- Для GitHub Pages обязателен корректный `VITE_BASE` (имя репозитория).
- Service role ключ используйте только в CI / Edge Functions, не во фронтенде.
- На iPhone сначала установите PWA, затем включите уведомления в приложении.
