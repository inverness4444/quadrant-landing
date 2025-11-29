# Quadrant

Quadrant — это «живая» карта навыков компании: мы подтягиваем реальные артефакты из GitHub/Jira/Notion, строим граф сотрудников ↔ навыков и показываем карьерные треки, тарифы и лимиты. Репозиторий содержит маркетинговый сайт и приватное приложение `/app` с рабочим демо.

### Что внутри кабинета
- Навыки и роли: /app/skills, /app/skills/map
- Планы развития и 1:1: /app/one-on-ones, /app/agenda, /app/manager-home
- Пилоты: /app/pilots
- Обратная связь/опросы: /app/feedback
- Риски и аналитика: /app/risk-center, /app/analytics (доступ owner/admin)
- Квартальные отчёты: /app/reports/quarterly

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
5. Для демо-режима включите `DEMO_ENABLED=true` и переходите на `/auth/demo-login` (кнопка «Посмотреть демо» есть на лендинге и /demo).

> После обновления зависимостей обязательно очистите кеш dev-сборки: `rm -rf .next && npm install`, затем перезапустите `npm run dev`. Это гарантирует, что в бандле не останется старых чанков.

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

## Окружения и конфиг
- ENVIRONMENT: `local`/`staging`/`production` (для логов/фич-флагов).
- DEMO_ENABLED: включать демо-seed только там, где нужно (обычно local/staging).
- TELEMETRY_DISABLED: отключает внешнюю телеметрию в dev/local.
- FEATURE_FLAGS: JSON вида `{"analyticsEnabled":true,"feedbackEnabled":true}` для управления разделами.
- BASE_URL, DATABASE_URL и SESSION_SECRET обязательны; остальное опционально (SMTP, monitoring).

## Docker / Compose
```bash
docker compose build app
docker compose up app   # production-профиль (SQLite volume ./data)
docker compose --profile dev up app-dev   # dev с hot-reload
docker compose --profile migrate run --rm migrate   # прогнать миграции отдельно
```
Health-check: `/healthz`, readiness: `/readyz`.

## Деплой (staging / production)
1) Создайте БД (Postgres или SQLite volume) и задайте `DATABASE_URL`, `BASE_URL`, `ENVIRONMENT`, `SESSION_SECRET`.
2) Прогоните миграции: `npm run db:migrate` или `docker compose --profile migrate run --rm migrate`.
3) Запустите `npm run build` → `npm run start` (или `docker compose up app`).
4) Для staging: DEMO_ENABLED=true допустимо; включите телеметрию по необходимости (Sentry/monitoring).
5) Для production: DEMO_ENABLED=false, TELEMETRY_DISABLED=false, укажите домен в BASE_URL.

## Быстрый smoke-check
- `/healthz` и `/readyz` возвращают `ok/ready`.
- Логин в демо или рабочий workspace проходит.
- Открываются Manager Home, Agenda, Pilots, Feedback, Analytics, Quarterly Reports без ошибок.
- Колокольчик уведомлений работает, в консоли браузера нет красных ошибок.
- Логи/мониторинг получают события.

## Архитектура
- **UI / web**: страницы в `app/*`. Маркетинговые разделы `/`, `/pricing`, `/demo` и др. Личный кабинет `/app/**` защищён middleware по сессии и CSRF.
- **API слой**: `app/api/**` — Next route handlers. Все мутации проверяют RBAC (`requireRole`), возвращают унифицированные ошибки (`services/apiError`).
- **Services**: бизнес-логика (`services/*`) — rbac, плановые лимиты, интеграции, мониторинг, рассылки, invite flow.
- **Repositories**: работа с БД через Drizzle (`repositories/*`). Все запросы фильтруются по `workspaceId`.
- **Интеграции**: клиенты в `integrations/*`, реестр `getIntegrationClient`, синхронизация в `services/integrationSyncService` (создаёт `Artifact` + `ArtifactSkill`).
- **Документация**: подробности по доменам и слоям в [ARCHITECTURE.md](ARCHITECTURE.md).

## Демо-режим
- `npm run db:seed` создаёт пользователя `demo@quadrant.app` (можно переопределить через `DEMO_EMAIL/DEMO_PASSWORD`) и workspace **Demo Company** с сотрудниками, навыками, треками, планом Growth и подключёнными интеграциями GitHub/Jira/Notion. В интеграциях прогоняется `runIntegrationSync`, чтобы в демо сразу отображались артефакты и оценки.
- `DEMO_ENABLED=true` включает маршрут `/auth/demo-login` и кнопки «Посмотреть демо» на страницах `/` и `/demo`. При выключенном флаге CTA автоматически заменяется на «Оставить заявку».
- Демо-страница `/demo` сейчас показывает лёгкий плейсхолдер без VR/3D-графики. После обновления зависимостей очистите кеш dev-сборки и пакеты: `rm -rf .next node_modules && npm install`, затем `npm run dev`, чтобы в бандле не оставалось старых чанков.
- Локальный сценарий: `npm run db:migrate && npm run db:seed`, затем `npm run dev` → `http://localhost:3000/auth/demo-login`. После запроса создаётся сессия, middleware пропускает в `/app`, а layout прогоняет `seedWorkspaceDemoData`, чтобы данные оставались актуальными.
- На проде достаточно выставить `DEMO_ENABLED=true` и указать `DEMO_EMAIL`. Ссылки на демо можно отдавать как прямой `/auth/demo-login`, так и через публичные кнопки.

## Онбординг внутри /app
После регистрации владельцу workspace показывается чек-лист на дашборде `/app` («Начните работу с Quadrant»). В нём пять простых шагов: добавить сотрудников, создать навыки, настроить треки, пригласить коллег и подключить интеграции. Каждый пункт ведёт в нужный раздел (`/app/team`, `/app/skills`, `/app/tracks`, `/app/settings?tab=participants|integrations`), а состояние чек-листа обновляется автоматически через API `/api/app/onboarding`. Как только все шаги выполнены, панель исчезает, а связанные страницы показывают согласованные пустые состояния.

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
