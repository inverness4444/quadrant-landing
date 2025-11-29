import { randomUUID } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import {
  pilotRunNotes,
  pilotRunSteps,
  pilotRunTeams,
  pilotRuns,
  tracks,
  type PilotRunStatus,
  type PilotRunStepStatus,
} from "@/drizzle/schema";
import { db } from "@/lib/db";
import type { PilotRunDTO, PilotRunNoteDTO, PilotRunStepDTO } from "@/services/types/pilot";
import {
  createPilot,
  createPilotSteps,
  findActivePilot,
  findLatestPilot,
  findPilotById,
  findPilotStepById,
  findPilotStepByKey,
  listPilotStepStatuses,
  listPilotSteps,
  PilotInput,
  PilotStepInput,
  upsertPilotStepStatus,
} from "@/repositories/pilotRepository";
import { type Pilot, type PilotStep, type PilotStepStatus } from "@/drizzle/schema";
import { createNotification } from "@/services/notificationService";

export type PilotStepWithStatus = PilotStep & {
  status: PilotStepStatus;
  notes: string | null;
};

export type PilotSummary = {
  pilot: Pilot | null;
  steps: PilotStepWithStatus[];
};

export const DEFAULT_PILOT_STEPS: PilotStepInput[] = [
  {
    key: "import_employees",
    title: "Импорт сотрудников и команд",
    description: "Добавьте профили ключевых людей и их роли, чтобы Quadrant собрал карту команды.",
    order: 1,
    mandatory: true,
  },
  {
    key: "define_skills",
    title: "Определение ключевых навыков",
    description: "Создайте перечень навыков и оцените уровни, чтобы Quadrant понимал сильные и слабые стороны.",
    order: 2,
    mandatory: true,
  },
  {
    key: "map_team",
    title: "Карта навыков и рисков",
    description: "Посмотрите на карту навыков, чтобы увидеть концентрацию экспертизы и потенциальные риски.",
    order: 3,
    mandatory: true,
  },
  {
    key: "check_risks",
    title: "Сценарии замены ключевых людей",
    description: "Проанализируйте сотрудников с высоким риском и определите замену.",
    order: 4,
    mandatory: true,
  },
  {
    key: "staff_project",
    title: "Подбор команды под пилотный проект",
    description: "Используйте подбор, чтобы собрать проектную команду и проверить процесс.",
    order: 5,
    mandatory: true,
  },
  {
    key: "summary",
    title: "Итоги пилота и дальнейшие шаги",
    description: "Зафиксируйте выводы, договоритесь о следующих шагах и плане внедрения.",
    order: 6,
    mandatory: false,
  },
];

export async function getCurrentPilot(workspaceId: string) {
  return (await findActivePilot(workspaceId)) ?? (await findLatestPilot(workspaceId));
}

export async function getPilotWithSteps(workspaceId: string): Promise<PilotSummary> {
  const pilot = await getCurrentPilot(workspaceId);
  if (!pilot) {
    return { pilot: null, steps: [] };
  }
  const [steps, statuses] = await Promise.all([listPilotSteps(pilot.id), listPilotStepStatuses(pilot.id)]);
  const statusMap = new Map(statuses.map((status) => [status.stepId, status]));
  return {
    pilot,
    steps: steps.map((step) => {
      const status = statusMap.get(step.id);
      return {
        ...step,
        status: status?.status ?? "not_started",
        notes: status?.notes ?? null,
      };
    }),
  };
}

export async function createPilotWithDefaultSteps(workspaceId: string, payload: PilotInput) {
  const pilot = await createPilot(workspaceId, payload);
  if (!pilot) {
    throw new Error("PILOT_CREATION_FAILED");
  }
  await createPilotSteps(pilot.id, DEFAULT_PILOT_STEPS);
  return getPilotWithSteps(workspaceId);
}

export async function updatePilotStepStatus(
  workspaceId: string,
  stepId: string,
  status: PilotStepStatus,
  notes?: string | null,
) {
  const step = await findPilotStepById(stepId);
  if (!step) {
    throw new Error("STEP_NOT_FOUND");
  }
  const pilot = await findPilotById(step.pilotId);
  if (!pilot || pilot.workspaceId !== workspaceId) {
    throw new Error("ACCESS_DENIED");
  }
  const updatedStatus = await upsertPilotStepStatus(step.pilotId, step.id, status, notes ?? null);
  return {
    ...step,
    status: updatedStatus.status,
    notes: updatedStatus.notes ?? null,
  };
}

export async function markPilotStepsByKey(
  pilotId: string,
  statuses: Array<{ key: string; status: PilotStepStatus; notes?: string }>,
) {
  for (const entry of statuses) {
    const step = await findPilotStepByKey(pilotId, entry.key);
    if (!step) continue;
    await upsertPilotStepStatus(pilotId, step.id, entry.status, entry.notes ?? null);
  }
}

export function calculatePilotProgress(steps: PilotStepWithStatus[]) {
  if (steps.length === 0) {
    return { completed: 0, total: 0 };
  }
  const completed = steps.filter((step) => step.status === "done").length;
  return { completed, total: steps.length };
}

const PILOT_PLAYBOOK_STEPS: Array<{
  key: string;
  title: string;
  description: string;
}> = [
  {
    key: "define_scope",
    title: "Определить команду и цели пилота",
    description:
      "Согласуйте с руководителем, какие команды и роли входят в пилот, какие бизнес-вопросы хотите закрыть (риски, найм, продвижения).",
  },
  {
    key: "import_people",
    title: "Загрузить сотрудников и команды",
    description:
      "Проверьте, что все сотрудники и команды в пилоте заведены в Quadrant и корректно привязаны к менеджерам.",
  },
  {
    key: "configure_roles",
    title: "Настроить роли и требования по навыкам",
    description: "Опишите целевые роли (job_roles) и требования по ключевым навыкам для пилотных команд.",
  },
  {
    key: "launch_assessment",
    title: "Запустить оценку навыков",
    description: "Запустите assessment cycle: self-оценка, менеджерская, финальная калибровка.",
  },
  {
    key: "review_results",
    title: "Проанализировать результаты оценки",
    description: "Посмотрите на карту навыков, риски, сильные/слабые стороны команд и ключевых людей.",
  },
  {
    key: "create_moves_scenario",
    title: "Сгенерировать сценарий найма/развития",
    description: "Создайте сценарий в модуле «Решения»: кого развивать, кого продвигать, кого нанимать.",
  },
  {
    key: "assign_quests",
    title: "Назначить квесты и мини-проекты",
    description: "На основе сценария и gap по ролям назначьте квесты развития сотрудникам.",
  },
  {
    key: "final_report",
    title: "Подготовить финальный отчёт по пилоту",
    description: "Соберите ключевые инсайты, решения и план на 3–6 месяцев для руководства.",
  },
];

export async function getWorkspacePilotRuns(workspaceId: string): Promise<PilotRunDTO[]> {
  const runs = await db
    .select()
    .from(pilotRuns)
    .where(eq(pilotRuns.workspaceId, workspaceId))
    .orderBy(desc(pilotRuns.createdAt));
  if (runs.length === 0) return [];
  return Promise.all(runs.map((run) => hydratePilotRun(run)));
}

export async function getPilotRunById(pilotRunId: string, workspaceId: string): Promise<PilotRunDTO | null> {
  const run = await db.query.pilotRuns.findFirst({
    where: and(eq(pilotRuns.id, pilotRunId), eq(pilotRuns.workspaceId, workspaceId)),
  });
  if (!run) return null;
  return hydratePilotRun(run);
}

export async function createPilotRun(input: {
  workspaceId: string;
  name: string;
  description?: string | null;
  ownerUserId: string;
  teamIds: string[];
}): Promise<PilotRunDTO> {
  const id = randomUUID();
  const now = new Date().toISOString();
  db.insert(pilotRuns)
    .values({
      id,
      workspaceId: input.workspaceId,
      name: input.name,
      description: input.description ?? null,
      status: "draft",
      ownerUserId: input.ownerUserId,
      targetCycleId: null,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  for (const teamId of input.teamIds) {
    db.insert(pilotRunTeams)
      .values({
        id: randomUUID(),
        pilotRunId: id,
        teamId,
      })
      .run();
  }
  let order = 0;
  for (const step of PILOT_PLAYBOOK_STEPS) {
    db.insert(pilotRunSteps)
      .values({
        id: randomUUID(),
        pilotRunId: id,
        key: step.key,
        title: step.title,
        description: step.description,
        orderIndex: order++,
        status: "pending",
      })
      .run();
  }
  const created = await getPilotRunById(id, input.workspaceId);
  if (!created) {
    throw new Error("PILOT_RUN_CREATION_FAILED");
  }
  await createNotification({
    workspaceId: input.workspaceId,
    userId: input.ownerUserId,
    type: "pilot_created",
    title: `Пилот создан: ${input.name}`,
    body: "Проверяйте шаги плейбука и due-даты.",
    entityType: "pilot_run",
    entityId: id,
    url: `/app/pilot/${id}`,
  });
  return created;
}

export async function updatePilotRunMeta(input: {
  pilotRunId: string;
  workspaceId: string;
  name?: string;
  description?: string | null;
  status?: PilotRunStatus;
  targetCycleId?: string | null;
}): Promise<PilotRunDTO | null> {
  const existing = await db.query.pilotRuns.findFirst({
    where: and(eq(pilotRuns.id, input.pilotRunId), eq(pilotRuns.workspaceId, input.workspaceId)),
  });
  if (!existing) return null;
  db.update(pilotRuns)
    .set({
      name: input.name ?? existing.name,
      description: input.description ?? existing.description,
      status: input.status ?? existing.status,
      targetCycleId: input.targetCycleId ?? null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(pilotRuns.id, input.pilotRunId))
    .run();
  if (input.status === "completed" && existing.status !== "completed") {
    await createNotification({
      workspaceId: input.workspaceId,
      userId: existing.ownerUserId,
      type: "pilot_status",
      title: `Пилот завершён: ${existing.name}`,
      body: "Соберите финальный отчёт и договоритесь о масштабировании.",
      entityType: "pilot_run",
      entityId: existing.id,
      url: `/app/pilot/${existing.id}`,
    });
    // TODO: если в пилоте есть структурированные рекомендации по людям, здесь можно дергать createDecision
    // и создавать предложения типа promote/monitor_risk с sourceType = "pilot".
  }
  return getPilotRunById(input.pilotRunId, input.workspaceId);
}

export async function updatePilotRunStepStatus(input: {
  pilotRunId: string;
  stepId: string;
  workspaceId: string;
  status: PilotRunStepStatus;
}): Promise<PilotRunStepDTO | null> {
  const run = await db.query.pilotRuns.findFirst({
    where: and(eq(pilotRuns.id, input.pilotRunId), eq(pilotRuns.workspaceId, input.workspaceId)),
  });
  if (!run) return null;
  const step = await db.query.pilotRunSteps.findFirst({
    where: and(eq(pilotRunSteps.id, input.stepId), eq(pilotRunSteps.pilotRunId, input.pilotRunId)),
  });
  if (!step) return null;
  const now = new Date().toISOString();
  db.update(pilotRunSteps)
    .set({
      status: input.status,
      completedAt: input.status === "done" ? now : null,
    })
    .where(eq(pilotRunSteps.id, input.stepId))
    .run();
  return {
    ...step,
    status: input.status,
    completedAt: input.status === "done" ? now : null,
  };
}

export async function addPilotRunNote(input: {
  pilotRunId: string;
  workspaceId: string;
  authorUserId: string;
  type: "meeting" | "insight" | "risk" | "decision";
  title: string;
  body: string;
  relatedTeamId?: string;
  relatedScenarioId?: string;
}): Promise<PilotRunNoteDTO> {
  const run = await db.query.pilotRuns.findFirst({
    where: and(eq(pilotRuns.id, input.pilotRunId), eq(pilotRuns.workspaceId, input.workspaceId)),
  });
  if (!run) {
    throw new Error("PILOT_RUN_NOT_FOUND");
  }
  const id = randomUUID();
  const now = new Date().toISOString();
  db.insert(pilotRunNotes)
    .values({
      id,
      pilotRunId: input.pilotRunId,
      authorUserId: input.authorUserId,
      type: input.type,
      title: input.title,
      body: input.body,
      relatedTeamId: input.relatedTeamId ?? null,
      relatedScenarioId: input.relatedScenarioId ?? null,
      createdAt: now,
    })
    .run();
  return {
    id,
    pilotRunId: input.pilotRunId,
    authorUserId: input.authorUserId,
    type: input.type,
    title: input.title,
    body: input.body,
    relatedTeamId: input.relatedTeamId ?? null,
    relatedScenarioId: input.relatedScenarioId ?? null,
    createdAt: now,
  };
}

export async function getPilotRunNotes(pilotRunId: string, workspaceId: string): Promise<PilotRunNoteDTO[]> {
  const run = await db.query.pilotRuns.findFirst({
    where: and(eq(pilotRuns.id, pilotRunId), eq(pilotRuns.workspaceId, workspaceId)),
  });
  if (!run) return [];
  const rows = await db
    .select()
    .from(pilotRunNotes)
    .where(eq(pilotRunNotes.pilotRunId, pilotRunId))
    .orderBy(desc(pilotRunNotes.createdAt));
  return rows.map((row) => ({
    ...row,
    relatedTeamId: row.relatedTeamId ?? null,
    relatedScenarioId: row.relatedScenarioId ?? null,
  }));
}

async function hydratePilotRun(run: typeof pilotRuns.$inferSelect): Promise<PilotRunDTO> {
  const teamRows = await db
    .select({
      teamId: pilotRunTeams.teamId,
      teamName: tracks.name,
    })
    .from(pilotRunTeams)
    .innerJoin(tracks, eq(tracks.id, pilotRunTeams.teamId))
    .where(eq(pilotRunTeams.pilotRunId, run.id));
  const stepRows = await db
    .select()
    .from(pilotRunSteps)
    .where(eq(pilotRunSteps.pilotRunId, run.id))
    .orderBy(pilotRunSteps.orderIndex);
  const steps = stepRows.map<PilotRunStepDTO>((step) => ({
    ...step,
    description: step.description ?? null,
    dueDate: step.dueDate ?? null,
    completedAt: step.completedAt ?? null,
  }));
  const summaryProgress = buildSummary(steps);
  return {
    ...run,
    description: run.description ?? null,
    targetCycleId: run.targetCycleId ?? null,
    teams: teamRows,
    steps,
    summaryProgress,
  };
}

function buildSummary(steps: PilotRunStepDTO[]) {
  const totalSteps = steps.length;
  const completedSteps = steps.filter((step) => step.status === "done").length;
  const percent = totalSteps === 0 ? 0 : Math.round((completedSteps / totalSteps) * 100);
  const lateStepsCount = steps.filter((step) => {
    if (!step.dueDate || step.status === "done") return false;
    const due = new Date(step.dueDate).getTime();
    return Number.isFinite(due) && due < Date.now();
  }).length;
  return { totalSteps, completedSteps, percent, lateStepsCount };
}
