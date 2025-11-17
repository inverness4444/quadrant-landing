# Архитектура Quadrant

## Доменные сущности
- **User** — человек с логином/паролем. Может принадлежать нескольким workspaces через `Member`.
- **Workspace** — компания или команда. Содержит настройки (название, размер, billingEmail, planId, trialEndsAt).
- **Member** — связь `User ↔ Workspace` с ролью (`owner`, `admin`, `member`). Роль определяет доступ к API через `services/rbac.ts`.
- **Employee** — сотрудник внутри workspace. Связан с навыками (`EmployeeSkill`), треками (`Track`, `TrackLevel`) и артефактами.
- **Skill / EmployeeSkill** — навык и его уровень для конкретного сотрудника.
- **Track / TrackLevel** — карьерные треки и уровни развития. Сотрудник может иметь `primaryTrackId` и `trackLevelId`.
- **Artifact / ArtifactSkill** — артефакт из интеграции (PR, задача, документ) и веса навыков, к которым он относится.
- **Integration** — подключение внешней системы (github/jira/notion). Содержит статус, config и `lastSyncedAt`.
- **Plan** — тариф с лимитами (`maxMembers`, `maxEmployees`, `maxIntegrations`, `pricePerMonth`). Workspace хранит ссылку на текущий план.
- **Invite** — приглашение пользователя по email с ролью и токеном.

## Слои приложения
```
┌───────────────┐    ┌───────────────────────┐    ┌───────────────────────┐
│   Pages/UI    │ -> │        API            │ -> │      Services         │ -> Repositories -> DB
└───────────────┘    └───────────────────────┘    └───────────────────────┘
```
- **Pages/UI** (`app/*`, `components/*`): маркетинг и кабинет `/app/**`. Клиентские компоненты используют fetch к API и отображают состояния/ошибки (Team, Skills, Tracks, Settings, Billing, Integrations и т.д.).
- **API** (`app/api/**`): Next Route Handlers. Каждый хендлер вытягивает `appContext` (`services/appContext`), затем применяет RBAC (`requireRole/requireMember`), валидацию (`zod`) и возвращает ошибки через `services/apiError`.
- **Services**:
  - `services/rbac.ts` — проверка ролей и membership.
  - `services/planLimits.ts` — получение плана, usage и функции `canAddEmployee/Member/Integration`.
  - `services/integrationSyncService.ts` — вызывает stub-клиенты, создаёт артефакты и связи навыков.
  - `services/inviteService.ts` — проверка приглашений и добавление членов.
  - `services/monitoring.ts`, `services/rateLimit.ts`, `services/apiError.ts`, `lib/csrf.ts` — операционные функции.
- **Repositories** (`repositories/*.ts`): Drizzle ORM обёртки для каждой сущности. Все операции фильтруются по `workspaceId` и инкапсулируют SQL.

## Потоки данных
- **Демо-вход**: `/auth/demo-login` → `setSession` → middleware пускает в `/app`. Layout загружает `getUserWithWorkspace` + `seedWorkspaceDemoData` (для наполнения демо).
- **Создание сотрудника**: client → `/api/app/employees` → валидация + `requireRole` → `canAddEmployee` → `createEmployee` → Drizzle insert.
- **Интеграции**: `/api/integrations/*` → RBAC (owner/admin) → интеграционные сервисы → `integrationRepository` и `integrationSyncService` создают артефакты и обновляют `lastSyncedAt`.
- **Планы/лимиты**: при любых мутациях вызываются `planLimits`. Данные отображаются в `/app/settings/billing` и на `/pricing` через `listAllPlans`.

## Безопасность
- Middleware (`middleware.ts`) защищает `/app/**`, `/api/**`: session cookie, CSRF токен, security headers.
- Rate limiting (`services/rateLimit.ts`) на login/register/invites/contact/integration sync.
- ENV централизован в `config/env.ts` (валидация через zod, фич-флаги и monitoring).

## Коды ответов/ошибок
Все API возвращают `{ ok: false, error: { code, message, details? } }`. UI реагирует на коды `PLAN_LIMIT_REACHED`, `FORBIDDEN`, `VALIDATION_ERROR` и т.п., выводя понятные сообщения (особенно в Team/Settings/Integrations).

Эти принципы позволяют держать границы между слоями чистыми: UI знает только про REST API, сервисы инкапсулируют бизнес-правила, а repositories — SQL-детали.
