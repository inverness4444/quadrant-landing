# Quadrant

Quadrant — это «живая» карта навыков компании: мы подтягиваем реальные артефакты из GitHub/Jira/Notion, строим граф сотрудников ↔ навыков и показываем карьерные треки, тарифы и лимиты. Репозиторий содержит маркетинговый сайт и приватное приложение `/app` с рабочим демо.

## Технологии
- **Next.js 16 (App Router)** + React Server Components, TypeScript и Tailwind.
- **Drizzle ORM + SQLite (по умолчанию)**, все операции проходят через слой `repositories/*`.
- **RBAC и multi-tenant** на основе таблицы `members` и сервиса `services/rbac.ts`.
- **Интеграции** реализованы stub-клиентами (`integrations/*`) и сервисом `integrationSyncService`.
- **Планы и лимиты** (`Plan`, `planLimits`), централизованный конфиг ENV, мониторинг и rate limiting.
- Тесты: **Vitest + Testing Library** (unit) и **Playwright** (e2e). CI настроен в `.github/workflows/ci.yml`.

## Быстрый старт
1. Клонируйте репозиторий и установите зависимости:
   ```bash
   git clone <repo>
   cd quadrant-landing
   npm install
   ```
2. Создайте `.env` (см. раздел ниже) или скопируйте `.env.example`.
3. Прогоните миграции и сиды:
   ```bash
   npm run db:migrate
   npm run db:seed   # создаст demo@quadrant.app и демо-workspace
   ```
4. Запустите dev-сервер: `npm run dev` и откройте `http://localhost:3000`.
5. Для демо-режима включите `DEMO_ENABLED=true` и переходите на `/auth/demo-login` (кнопка есть на лендинге).

## Переменные окружения
| Переменная | Назначение |
| ---------- | ---------- |
| `NODE_ENV` / `PORT` | Режим запуска (dev/prod/test) и порт, который слушает сервер (по умолчанию `3000`). |
| `DATABASE_URL` | Строка подключения к БД (по умолчанию `file:./data/quadrant.db`). |
| `BASE_URL` | Базовый URL приложения (используется в инвайтах и email). |
| `DEMO_ENABLED` | `true/false` — включает маршрут `/auth/demo-login` (по умолчанию `true` вне production). |
| `DEMO_EMAIL` / `DEMO_PASSWORD` | Учетные данные демо-пользователя (используются и в сидере). |
| `CONTACT_SMTP_HOST/PORT/USER/PASS` | SMTP для уведомлений о лидах. |
| `CONTACT_RECIPIENT_EMAIL` | Email, куда отправлять лиды.
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Basic auth для `/admin`.
| `MONITORING_PROVIDER` / `MONITORING_DSN` | Провайдер мониторинга (логгируется через `services/monitoring`). |
| `FEATURE_FLAGS` | JSON с фич-флагами (например, `{ "newHero": true }`). |

## Полезные команды
| Команда | Описание |
| ------- | -------- |
| `npm run dev` | Dev-сервер Next.js. |
| `npm run build` / `npm run start` | Production-сборка и запуск. |
| `npm run db:migrate` / `npm run db:seed` | Миграции и сиды для основной БД. |
| `npm run db:migrate:test` / `npm run db:seed:test` | То же для `data/test.db`. |
| `npm run test:unit` | Vitest (pool=threads, 1 воркер). |
| `npm run test:e2e` | Playwright e2e (использует тестовую БД). |

## Архитектура
- **UI / web**: страницы в `app/*`. Маркетинговые разделы `/`, `/pricing`, `/demo` и др. Личный кабинет `/app/**` защищён middleware по сессии и CSRF.
- **API слой**: `app/api/**` — Next route handlers. Все мутации проверяют RBAC (`requireRole`), возвращают унифицированные ошибки (`services/apiError`).
- **Services**: бизнес-логика (`services/*`) — rbac, плановые лимиты, интеграции, мониторинг, рассылки, invite flow.
- **Repositories**: работа с БД через Drizzle (`repositories/*`). Все запросы фильтруются по `workspaceId`.
- **Интеграции**: клиенты в `integrations/*`, реестр `getIntegrationClient`, синхронизация в `services/integrationSyncService` (создаёт `Artifact` + `ArtifactSkill`).
- **Документация**: подробности по доменам и слоям в [ARCHITECTURE.md](ARCHITECTURE.md).

## Демо-режим
Сид-скрипт создаёт пользователя `demo@quadrant.app` и workspace с сотрудниками, навыками, интеграциями и тарифом Growth. При включённом `DEMO_ENABLED` на лендингах появляется кнопка «Войти как демо-компания», ведущая на `/auth/demo-login`. При переходе мгновенно создаётся сессия и открывается `/app` с живыми данными (Team, Skills, Tracks, Settings → тарифы/лимиты).

## Тесты и CI
- Unit/компонентные тесты (`npm run test:unit`) очищают и мигрируют `data/test.db`, прогоняют Vitest одним воркером.
- E2E (`npm run test:e2e`) стартуют Playwright, сидят БД и проходят базовые сценарии (маркетинг + демо-вход).
- CI (GitHub Actions) прогоняет lint, unit, e2e и build на каждом PR.

### Запуск тестов локально
- `npm run test:unit` — быстрые проверки без реального UI. Использует `NODE_ENV=test` и `data/test.db`.
- `npm run test:integration` — тесты сервисов/репозиториев (RBAC, плановые лимиты, синхронизация интеграций). Работают с той же тестовой SQLite и выполняются последовательно.
- `npm run test:e2e` — Playwright запускает `npm run dev`, поднимает тестовую БД (`pretest:e2e` делает `db:migrate:test` + `db:seed:test`) и проходит ключевые пользовательские сценарии (регистрация, демо, инвайты, интеграции, лимиты). Команда сама выставляет `BASE_URL`/`DATABASE_URL`, дополнительных шагов не требуется.

Перед e2e убедитесь, что порты 3000/3001 свободны. Все команды детерминированы и не зависят от локального `.env` — достаточно значений из `package.json`.

## Deploy / Production
### Docker / Compose
1. Скопируйте `.env.example` в `.env` и заполните значения (минимум `DATABASE_URL`, `BASE_URL`, SMTP/monitoring при необходимости).
2. Соберите и запустите prod-образ:
   ```bash
   docker compose up --build app
   ```
   Контейнер использует multi-stage `Dockerfile`, хранит SQLite в `./data` (volume) и пробрасывает health-check `/healthz`.
3. Для разработки внутри контейнера запустите профиль `dev` с хот-релоудом:
   ```bash
   docker compose --profile dev up app-dev
   ```
   Код монтируется из рабочей директории, а `node_modules` хранятся в отдельном volume, чтобы не конфликтовать с хостом.

### PaaS / Manual deploy
- Требования: Node.js 20+, Linux окружение, доступ к файловой системе для SQLite (или собственный `DATABASE_URL`), все переменные из `.env.example`.
- Build команда: `npm run build`. Start команда: `npm run start`.
- Перед запуском выполните `npm run db:migrate` и `npm run db:seed` (при деплое через Docker можно запустить `docker compose run --rm app npm run db:migrate`).
- Настройте health-check на `GET /healthz` — ответ `{ status: "ok" }` сигнализирует, что сервер и БД доступны.

### Быстрая проверка DX
После клонирования убедитесь, что:
- `npm run lint`, `npm run test:unit`, `npm run build` проходят без ошибок;
- `docker compose up --build app` поднимает prod-контейнер, а `docker compose --profile dev up app-dev` — dev-режим с хот-релоудом;
- health-check доступен на `http://localhost:3000/healthz`.

Готово! Quadrant теперь можно показывать живым пользователям и разработчикам: демо-вход без регистрации, понятные пустые состояния и документация для быстрого онбординга.
