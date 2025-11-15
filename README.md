# Quadrant Marketing Site

Многостраничный сайт Quadrant на Next.js (App Router) с дизайном в стиле hh.ru. Включает реальные формы лидов, блог, кейсы и подготовку под i18n/аналитику/PWA.

## Технологии
- Next.js 16 (App Router) + TypeScript
- Tailwind CSS + кастомные токены (`theme/tokens.ts`)
- Контент в `content/*` и сервис-слой в `services/*`
- Markdown-блог (`content/blog`) с парсингом через `gray-matter`/`marked`
- Nodemailer для уведомлений о лидах (SMTP)
- Интерактивное демо на `/demo` (граф на `react-force-graph`)
- Vitest + Testing Library, Playwright для e2e

## Запуск
```bash
npm install
npm run db:migrate
npm run db:seed    # создаёт демо-аккаунт (demo@quadrant.app / demo12345)
npm run dev
```
Сайт будет доступен на `http://localhost:3000`.

## База данных
- Drizzle ORM + SQLite (файл по умолчанию `data/quadrant.db`). Строка подключения задаётся через `DATABASE_URL` (можно заменить на Postgres DSN, слой репозиториев готов к миграции).
- Миграции хранятся в `drizzle/migrations`. Сгенерировать SQL: `npm run db:generate`. Применить: `npm run db:migrate`.
- `npm run db:seed` — заполняет демо-данными (использует `services/workspaceSeed.ts`).
- Unit/e2e тесты автоматически используют отдельный файл `data/test.db` и перед запуском прогоняют `db:migrate:test` + `db:seed:test`.

## Переменные окружения (`.env`)
| Переменная | Описание |
|------------|----------|
| `DATABASE_URL` | Строка подключения к SQLite/ Postgres (по умолчанию `file:./data/quadrant.db`) |
| `CONTACT_SMTP_HOST` | SMTP хост для отправки писем |
| `CONTACT_SMTP_PORT` | Порт SMTP |
| `CONTACT_SMTP_USER` | Пользователь SMTP |
| `CONTACT_SMTP_PASS` | Пароль SMTP |
| `CONTACT_RECIPIENT_EMAIL` | Email команды Quadrant для уведомлений |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Доступ к `/admin` (basic auth) |
| `ANALYTICS_PROVIDER` / `ANALYTICS_ID` | значения для серверной вставки аналитики |
| `NEXT_PUBLIC_ANALYTICS_PROVIDER` / `NEXT_PUBLIC_ANALYTICS_ID` | те же значения для клиентских событий |
| `MONITORING_PROVIDER` / `MONITORING_DSN` | опциональная интеграция с системой мониторинга |

См. `.env.example`.

## Обработка лидов
- Форма на `/contact` обращается к `POST /api/contact`.
- Сервер валидирует данные, проверяет honeypot и время заполнения.
- Заявки сохраняются в таблицу `leads` (SQLite), отправляются на почту (если задан SMTP).
- Админ-страница `/admin` (защищена basic auth) показывает и позволяет помечать заявки как «прочитанные».

## Блог, кейсы и демо
- Файлы в `content/blog/*.md` описывают статьи; `/blog` поддерживает фильтр по тегам и MDX-контент.
- `/cases` содержит расширенные описания внедрений, блоки доверия вынесены в `content/cases.ts`.
- `/demo` показывает интерактивную карту навыков и карьерные треки на фейковых данных (`content/demo.ts`).

## PWA и аналитика
- `app/manifest.ts` + `public/icons/*` + `public/sw.js`.
- Регистрация Service Worker в `PwaRegister`.
- Аналитика настраивается через env, интеграция подключается в layout. Функция `trackEvent` готова для дальнейшего расширения.

## i18n
- Базовые словари `locales/ru.ts`, `locales/en.ts`.
- Переключатель RU/EN в шапке (`LanguageSwitcher`), строки UI проходят через `useDictionary`.
- Контент (лендинги, статьи) пока на русском, но архитектура готова к подключению англ-версий.

## Тесты
- Unit/component: `npm run test:unit` (Vitest + Testing Library).
- E2E: `npm run test:e2e` (Playwright, конфиг `playwright.config.ts`).
- `npm run test` — сокращение для unit-тестов.

## CI
- Github Actions workflow `.github/workflows/ci.yml` устанавливает зависимости, прогоняет линтер, unit/e2e-тесты и сборку.
- Подключите GitHub Actions — пайплайн работает на push/pull_request.

## Деплой
1. Настроить `.env`.
2. Прогнать `npm run lint` и `npm run build`.
3. Деплой на любую платформу, поддерживающую Next.js App Router.
