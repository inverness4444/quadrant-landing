import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import type { ArtifactAssigneeRole, ArtifactType, EmployeeLevel, SkillType } from "@/drizzle/schema";
import { createEmployee, listEmployees, type EmployeePayload } from "@/repositories/employeeRepository";
import { createSkill, listSkills } from "@/repositories/skillRepository";
import { createTrack, listTrackLevelsByWorkspace, listTracks } from "@/repositories/trackRepository";
import { createIntegration, listIntegrationsByWorkspace } from "@/repositories/integrationRepository";
import { createPilotWithDefaultSteps, getPilotWithSteps, markPilotStepsByKey } from "@/services/pilotService";
import { createOrUpdateArtifactFromIntegration } from "@/services/artifactService";
import { env } from "@/config/env";
import { workspaceOnboardingState } from "@/drizzle/schema";
import { seedProgramTemplates } from "@/services/programSeed";

const skillDefinitions: Array<{ name: string; type: SkillType }> = [
  { name: "Golang", type: "hard" },
  { name: "PostgreSQL", type: "data" },
  { name: "Kafka", type: "hard" },
  { name: "React", type: "hard" },
  { name: "TypeScript", type: "hard" },
  { name: "Product Discovery", type: "product" },
  { name: "Data Analysis", type: "data" },
  { name: "UX Research", type: "product" },
  { name: "Leadership", type: "soft" },
  { name: "Mentorship", type: "soft" },
  { name: "Python", type: "hard" },
  { name: "Storytelling", type: "soft" },
  { name: "System Design", type: "hard" },
  { name: "AWS", type: "hard" },
  { name: "Kubernetes", type: "hard" },
  { name: "QA Automation", type: "hard" },
  { name: "Customer Empathy", type: "product" },
  { name: "Incident Response", type: "soft" },
  { name: "Mobile Architecture", type: "hard" },
];

const trackDefinitions = [
  {
    name: "Backend Engineer",
    levels: [
      { name: "Junior", description: "Понимает основы языка и умеет править баги" },
      { name: "Middle", description: "Самостоятельно ведёт фичи, владеет архитектурой сервиса" },
      { name: "Senior", description: "Проектирует системы, менторит команду" },
    ],
  },
  {
    name: "Product Manager",
    levels: [
      { name: "Junior", description: "Собирает данные, помогает вести backlog" },
      { name: "Middle", description: "Ведёт stream, держит метрики продукта" },
      { name: "Senior", description: "Формирует стратегию, руководит продуктовыми командами" },
    ],
  },
  {
    name: "Data Analyst",
    levels: [
      { name: "Junior", description: "Готовит отчёты и базовую статистику" },
      { name: "Middle", description: "Проектирует модели, автоматизирует дашборды" },
      { name: "Senior", description: "Строит аналитическую культуру, ведёт крупные исследования" },
    ],
  },
  {
    name: "Frontend Engineer",
    levels: [
      { name: "Junior", description: "Правит баги, повторяет паттерны" },
      { name: "Middle", description: "Самостоятельно ведёт фронтенд части фич" },
      { name: "Senior", description: "Проектирует архитектуру фронтенда, менторит" },
    ],
  },
  {
    name: "DevOps Engineer",
    levels: [
      { name: "Junior", description: "Поддерживает пайплайны, разбирается в инфраструктуре" },
      { name: "Middle", description: "Автоматизирует инфраструктуру, держит SLA" },
      { name: "Senior", description: "Проектирует платформу, ведёт резилиентность" },
    ],
  },
  {
    name: "QA Specialist",
    levels: [
      { name: "Junior", description: "Пишет тест-кейсы и регрессы" },
      { name: "Middle", description: "Автоматизирует тесты, проектирует стратегию" },
      { name: "Senior", description: "Отвечает за качество в нескольких командах" },
    ],
  },
];

const employeeDefinitions: Array<
  Omit<EmployeePayload, "skills" | "primaryTrackId" | "trackLevelId"> & {
    skills: Array<{ name: string; level: number }>;
    trackName?: string;
    trackLevel?: string;
  }
> = [
  {
    name: "Аня Коваль",
    position: "Lead Backend Engineer",
    level: "Senior",
    trackName: "Backend Engineer",
    trackLevel: "Senior",
    skills: [
      { name: "Golang", level: 5 },
      { name: "PostgreSQL", level: 4 },
      { name: "Kafka", level: 4 },
      { name: "Leadership", level: 4 },
    ],
  },
  {
    name: "Илья Миронов",
    position: "Backend Engineer",
    level: "Middle",
    trackName: "Backend Engineer",
    trackLevel: "Middle",
    skills: [
      { name: "Golang", level: 4 },
      { name: "PostgreSQL", level: 3 },
      { name: "Mentorship", level: 3 },
    ],
  },
  {
    name: "Мария Кравец",
    position: "Product Manager",
    level: "Senior",
    trackName: "Product Manager",
    trackLevel: "Senior",
    skills: [
      { name: "Product Discovery", level: 5 },
      { name: "Data Analysis", level: 4 },
      { name: "Storytelling", level: 4 },
    ],
  },
  {
    name: "Владлена Ли",
    position: "Product Designer",
    level: "Middle",
    skills: [
      { name: "UX Research", level: 4 },
      { name: "Storytelling", level: 3 },
      { name: "TypeScript", level: 2 },
    ],
  },
  {
    name: "Глеб Орлов",
    position: "Data Analyst",
    level: "Middle",
    trackName: "Data Analyst",
    trackLevel: "Middle",
    skills: [
      { name: "Python", level: 4 },
      { name: "Data Analysis", level: 4 },
      { name: "PostgreSQL", level: 4 },
    ],
  },
  {
    name: "Света Нефёдова",
    position: "Frontend Engineer",
    level: "Junior",
    trackName: "Frontend Engineer",
    trackLevel: "Junior",
    skills: [
      { name: "React", level: 3 },
      { name: "TypeScript", level: 3 },
      { name: "Mentorship", level: 2 },
    ],
  },
  {
    name: "Роман Плотников",
    position: "DevOps Lead",
    level: "Senior",
    trackName: "DevOps Engineer",
    trackLevel: "Senior",
    skills: [
      { name: "Kubernetes", level: 5 },
      { name: "AWS", level: 4 },
      { name: "Incident Response", level: 4 },
      { name: "Leadership", level: 3 },
    ],
  },
  {
    name: "Елена Степанова",
    position: "QA Lead",
    level: "Senior",
    trackName: "QA Specialist",
    trackLevel: "Senior",
    skills: [
      { name: "QA Automation", level: 5 },
      { name: "TypeScript", level: 3 },
      { name: "Customer Empathy", level: 3 },
    ],
  },
  {
    name: "Карина Бортник",
    position: "Frontend Engineer",
    level: "Middle",
    trackName: "Frontend Engineer",
    trackLevel: "Middle",
    skills: [
      { name: "React", level: 4 },
      { name: "TypeScript", level: 4 },
      { name: "System Design", level: 3 },
    ],
  },
  {
    name: "Тимур Ермаков",
    position: "Mobile Tech Lead",
    level: "Senior",
    skills: [
      { name: "Mobile Architecture", level: 5 },
      { name: "System Design", level: 4 },
      { name: "Leadership", level: 3 },
    ],
  },
  {
    name: "Инга Рябова",
    position: "Product Analyst",
    level: "Middle",
    trackName: "Product Manager",
    trackLevel: "Middle",
    skills: [
      { name: "Data Analysis", level: 4 },
      { name: "Product Discovery", level: 3 },
      { name: "Customer Empathy", level: 3 },
    ],
  },
  {
    name: "Олег Киселёв",
    position: "Backend Engineer",
    level: "Junior",
    trackName: "Backend Engineer",
    trackLevel: "Junior",
    skills: [
      { name: "Golang", level: 3 },
      { name: "PostgreSQL", level: 2 },
      { name: "Mentorship", level: 2 },
    ],
  },
];

export async function seedWorkspaceDemoData(workspaceId: string) {
  if (!env.demo.enabled) return;
  await seedProgramTemplates();
  const existingEmployees = await listEmployees(workspaceId);
  if (existingEmployees.length > 0) {
    await seedDemoArtifacts(workspaceId);
    await seedDemoPilot(workspaceId);
    await seedOnboardingComplete(workspaceId);
    return;
  }
  await seedSkills(workspaceId);
  await seedTracks(workspaceId);

  const [skillList, trackList, trackLevelList] = await Promise.all([
    listSkills(workspaceId),
    listTracks(workspaceId),
    listTrackLevelsByWorkspace(workspaceId),
  ]);

  const skillMap = new Map(skillList.map((skill) => [skill.name, skill]));
  const trackMap = new Map(trackList.map((track) => [track.name, track]));
  const trackLevelMap = new Map<string, string>();
  trackLevelList.forEach((level) => {
    trackLevelMap.set(`${level.trackId}:${level.name}`, level.id);
  });

  for (const definition of employeeDefinitions) {
    const skillsPayload =
      definition.skills
        .map((item) => {
          const skill = skillMap.get(item.name);
          return skill ? { skillId: skill.id, level: item.level } : null;
        })
        .filter(Boolean) ?? [];
    let trackLevelId: string | undefined;
    let primaryTrackId: string | undefined;
    if (definition.trackName) {
      const track = trackMap.get(definition.trackName);
      if (track) {
        primaryTrackId = track.id;
        if (definition.trackLevel) {
          const levelId = trackLevelMap.get(`${track.id}:${definition.trackLevel}`);
          if (levelId) {
            trackLevelId = levelId;
          }
        }
      }
    }
    await createEmployee(workspaceId, {
      name: definition.name,
      position: definition.position,
      level: definition.level as EmployeeLevel,
      primaryTrackId,
      trackLevelId,
      skills: skillsPayload as Array<{ skillId: string; level: number }>,
    });
  }
  await seedDemoArtifacts(workspaceId);
  await seedDemoPilot(workspaceId);
  await seedOnboardingComplete(workspaceId);
}

async function seedOnboardingComplete(workspaceId: string) {
  try {
    await db
      .insert(workspaceOnboardingState)
      .values({
        id: randomUUID(),
        workspaceId,
        isCompleted: true,
        currentStep: "review",
        completedSteps: JSON.stringify(["company_info", "roles_skills", "employees", "focus_teams", "pilots", "feedback", "review"]),
        lastUpdatedAt: new Date().toISOString(),
      })
      .onConflictDoNothing({ target: workspaceOnboardingState.workspaceId })
      .run();
  } catch {
    // ignore seeding errors
  }
}

async function seedSkills(workspaceId: string) {
  const existing = await listSkills(workspaceId);
  const names = new Set(existing.map((skill) => skill.name.toLowerCase()));
  for (const definition of skillDefinitions) {
    if (names.has(definition.name.toLowerCase())) continue;
    await createSkill(workspaceId, definition);
  }
}

async function seedTracks(workspaceId: string) {
  const existing = await listTracks(workspaceId);
  const names = new Set(existing.map((track) => track.name.toLowerCase()));
  for (const definition of trackDefinitions) {
    if (names.has(definition.name.toLowerCase())) continue;
    await createTrack(workspaceId, definition);
  }
}

async function seedDemoIntegrations(workspaceId: string) {
  const existing = await listIntegrationsByWorkspace(workspaceId);
  const existingByType = new Map(existing.map((integration) => [integration.type, integration]));
  const definitions = [
    {
      type: "github",
      name: "GitHub — core backend",
      config: { repo: "quadrant/backend", visibility: "private" },
    },
    {
      type: "jira",
      name: "Jira — Team Quadrant",
      config: { projectKey: "QDR" },
    },
    {
      type: "notion",
      name: "Notion — Документация продукта",
      config: { workspace: "Product Wiki" },
    },
  ] as const;
  for (const definition of definitions) {
    if (existingByType.has(definition.type)) continue;
    const created = await createIntegration({
      workspaceId,
      type: definition.type,
      name: definition.name,
      config: definition.config,
      status: "connected",
    });
    if (created) {
      existingByType.set(created.type, created);
    }
  }
  return Array.from(existingByType.values());
}

type ArtifactSeed = {
  integrationType: string;
  externalId: string;
  type: ArtifactType;
  title: string;
  summary: string;
  url: string;
  createdAgoHours: number;
  assignees: Array<{ name: string; role: ArtifactAssigneeRole }>;
  skills: string[];
};

const artifactSeeds: ArtifactSeed[] = [
  {
    integrationType: "github",
    externalId: "PR-501",
    type: "pull_request",
    title: "PR: Рефакторинг биллинга",
    summary: "Вынесли расчёт выручки в отдельный сервис",
    url: "https://github.com/quadrant/backend/pull/501",
    createdAgoHours: 8,
    assignees: [
      { name: "Аня Коваль", role: "author" },
      { name: "Илья Миронов", role: "reviewer" },
    ],
    skills: ["Golang", "PostgreSQL", "System Design"],
  },
  {
    integrationType: "github",
    externalId: "PR-504",
    type: "pull_request",
    title: "PR: Оптимизация очередей Kafka",
    summary: "Снизили задержки обработки транзакций",
    url: "https://github.com/quadrant/backend/pull/504",
    createdAgoHours: 14,
    assignees: [
      { name: "Илья Миронов", role: "author" },
      { name: "Роман Плотников", role: "reviewer" },
    ],
    skills: ["Kafka", "Golang"],
  },
  {
    integrationType: "github",
    externalId: "PR-512",
    type: "pull_request",
    title: "PR: UI для feature flags",
    summary: "Добавили панель управления фичами",
    url: "https://github.com/quadrant/frontend/pull/512",
    createdAgoHours: 20,
    assignees: [
      { name: "Света Нефёдова", role: "author" },
      { name: "Карина Бортник", role: "reviewer" },
    ],
    skills: ["React", "TypeScript"],
  },
  {
    integrationType: "github",
    externalId: "PR-518",
    type: "pull_request",
    title: "PR: Автоматизация регресса",
    summary: "Запустили smoke-тесты в CI",
    url: "https://github.com/quadrant/qa/pull/518",
    createdAgoHours: 30,
    assignees: [
      { name: "Елена Степанова", role: "author" },
      { name: "Карина Бортник", role: "reviewer" },
    ],
    skills: ["QA Automation", "TypeScript"],
  },
  {
    integrationType: "jira",
    externalId: "QDR-241",
    type: "ticket",
    title: "QDR-241: Улучшить стабильность логина",
    summary: "Расследовали резкие пики ошибок авторизации",
    url: "https://jira.quadrant.app/browse/QDR-241",
    createdAgoHours: 12,
    assignees: [
      { name: "Мария Кравец", role: "assignee" },
      { name: "Глеб Орлов", role: "commenter" },
    ],
    skills: ["Product Discovery", "Data Analysis"],
  },
  {
    integrationType: "jira",
    externalId: "QDR-355",
    type: "ticket",
    title: "QDR-355: Feature flag rollout",
    summary: "Настроили многоступенчатое включение фичи",
    url: "https://jira.quadrant.app/browse/QDR-355",
    createdAgoHours: 40,
    assignees: [
      { name: "Мария Кравец", role: "assignee" },
      { name: "Света Нефёдова", role: "commenter" },
    ],
    skills: ["Product Discovery", "React"],
  },
  {
    integrationType: "jira",
    externalId: "QDR-412",
    type: "ticket",
    title: "QDR-412: CRM sync optimisation",
    summary: "Ускорили выгрузку сделок в CRM",
    url: "https://jira.quadrant.app/browse/QDR-412",
    createdAgoHours: 55,
    assignees: [
      { name: "Глеб Орлов", role: "assignee" },
      { name: "Владлена Ли", role: "commenter" },
    ],
    skills: ["Python", "PostgreSQL"],
  },
  {
    integrationType: "jira",
    externalId: "QDR-518",
    type: "ticket",
    title: "QDR-518: Billing SLA dashboard",
    summary: "Добавили метрики в Grafana",
    url: "https://jira.quadrant.app/browse/QDR-518",
    createdAgoHours: 60,
    assignees: [
      { name: "Роман Плотников", role: "assignee" },
      { name: "Аня Коваль", role: "commenter" },
    ],
    skills: ["Kubernetes", "AWS"],
  },
  {
    integrationType: "notion",
    externalId: "DOC-88",
    type: "doc",
    title: "Spec: Onboarding flow 2.0",
    summary: "Новая версия сценария активации",
    url: "https://www.notion.so/quadrant/spec-onboarding",
    createdAgoHours: 26,
    assignees: [
      { name: "Мария Кравец", role: "author" },
      { name: "Владлена Ли", role: "commenter" },
    ],
    skills: ["Product Discovery", "UX Research"],
  },
  {
    integrationType: "notion",
    externalId: "DOC-93",
    type: "doc",
    title: "ADR: Data contracts governance",
    summary: "Правила документирования контрактов",
    url: "https://www.notion.so/quadrant/data-contracts",
    createdAgoHours: 48,
    assignees: [
      { name: "Глеб Орлов", role: "author" },
      { name: "Аня Коваль", role: "commenter" },
    ],
    skills: ["Data Analysis", "Leadership"],
  },
  {
    integrationType: "notion",
    externalId: "DOC-97",
    type: "doc",
    title: "Guide: Incident response playbook",
    summary: "Инструкции для on-call команды",
    url: "https://www.notion.so/quadrant/incident-playbook",
    createdAgoHours: 70,
    assignees: [
      { name: "Роман Плотников", role: "author" },
      { name: "Илья Миронов", role: "commenter" },
    ],
    skills: ["Incident Response", "Leadership"],
  },
  {
    integrationType: "github",
    externalId: "PR-532",
    type: "pull_request",
    title: "PR: gRPC adapter для клиентов",
    summary: "Единый слой для integrator API",
    url: "https://github.com/quadrant/backend/pull/532",
    createdAgoHours: 18,
    assignees: [
      { name: "Аня Коваль", role: "author" },
      { name: "Глеб Орлов", role: "reviewer" },
    ],
    skills: ["Golang", "System Design"],
  },
  {
    integrationType: "jira",
    externalId: "QDR-603",
    type: "ticket",
    title: "QDR-603: Customer tickets triage",
    summary: "Новый процесс сортировки инцидентов",
    url: "https://jira.quadrant.app/browse/QDR-603",
    createdAgoHours: 32,
    assignees: [
      { name: "Елена Степанова", role: "assignee" },
      { name: "Мария Кравец", role: "commenter" },
    ],
    skills: ["Customer Empathy", "QA Automation"],
  },
  {
    integrationType: "notion",
    externalId: "DOC-101",
    type: "doc",
    title: "Research: Product analytics stack",
    summary: "Обзор текущего стека аналитики",
    url: "https://www.notion.so/quadrant/product-analytics",
    createdAgoHours: 15,
    assignees: [
      { name: "Глеб Орлов", role: "author" },
      { name: "Мария Кравец", role: "commenter" },
    ],
    skills: ["Data Analysis", "Product Discovery"],
  },
  {
    integrationType: "github",
    externalId: "PR-540",
    type: "pull_request",
    title: "PR: Notifications microservice",
    summary: "Обособили доставку уведомлений",
    url: "https://github.com/quadrant/backend/pull/540",
    createdAgoHours: 10,
    assignees: [
      { name: "Илья Миронов", role: "author" },
      { name: "Аня Коваль", role: "reviewer" },
    ],
    skills: ["Golang", "Kafka"],
  },
  {
    integrationType: "jira",
    externalId: "QDR-640",
    type: "ticket",
    title: "QDR-640: SLA dashboard v2",
    summary: "Расширили метрики для C-level отчёта",
    url: "https://jira.quadrant.app/browse/QDR-640",
    createdAgoHours: 5,
    assignees: [
      { name: "Роман Плотников", role: "assignee" },
      { name: "Глеб Орлов", role: "commenter" },
    ],
    skills: ["AWS", "Python"],
  },
];

async function seedDemoArtifacts(workspaceId: string) {
  const [employees, skills, integrations] = await Promise.all([
    listEmployees(workspaceId),
    listSkills(workspaceId),
    seedDemoIntegrations(workspaceId),
  ]);
  if (employees.length === 0 || skills.length === 0 || integrations.length === 0) {
    return;
  }
  const employeeMap = new Map(employees.map((employee) => [employee.name, employee]));
  const skillMap = new Map(skills.map((skill) => [skill.name, skill]));
  const integrationByType = new Map(integrations.map((integration) => [integration.type, integration]));
  let index = 0;
  for (const definition of artifactSeeds) {
    const integration = integrationByType.get(definition.integrationType);
    if (!integration) continue;
    const createdAt =
      definition.createdAgoHours >= 0
        ? new Date(Date.now() - definition.createdAgoHours * 60 * 60 * 1000).toISOString()
        : new Date().toISOString();
    const assignees = definition.assignees
      .map((assignee) => {
        const employee = employeeMap.get(assignee.name) ?? employees[(index + 1) % employees.length];
        if (!employee) {
          return null;
        }
        return {
          employeeId: employee.id,
          role: assignee.role,
        };
      })
      .filter((value): value is { employeeId: string; role: ArtifactAssigneeRole } => Boolean(value));
    const skillsPayload = definition.skills
      .map((skillName, skillIndex) => {
        const skill = skillMap.get(skillName);
        if (!skill) return null;
        return {
          skillId: skill.id,
          confidence: Math.max(0.35, 0.85 - skillIndex * 0.15),
        };
      })
      .filter((value): value is { skillId: string; confidence: number } => Boolean(value));
    await createOrUpdateArtifactFromIntegration({
      workspaceId,
      integrationId: integration.id,
      externalId: definition.externalId,
      type: definition.type,
      title: definition.title,
      summary: definition.summary,
      url: definition.url,
      createdAt,
      updatedAt: createdAt,
      assignees,
      skills: skillsPayload,
    });
    index += 1;
  }
}

async function seedDemoPilot(workspaceId: string) {
  const summary = await getPilotWithSteps(workspaceId);
  if (summary.pilot) {
    return;
  }
  const now = new Date();
  const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const endDate = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString();
  const created = await createPilotWithDefaultSteps(workspaceId, {
    name: "Пилот Quadrant — демо",
    status: "active",
    startDate,
    endDate,
    goals: "Показать HR и тимлидам, как Quadrant выявляет риски и подбирает людей под инициативы.",
  });
  if (!created.pilot) return;
  await markPilotStepsByKey(created.pilot.id, [
    { key: "import_employees", status: "done", notes: "Импорт демо-команды выполнен" },
    { key: "define_skills", status: "done", notes: "Ключевые навыки заданы" },
    { key: "map_team", status: "in_progress", notes: "Карта навыков обновляется каждую неделю" },
  ]);
}
