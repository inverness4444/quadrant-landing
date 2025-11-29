import { randomUUID } from "crypto";
import { and, eq, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  meetingAgendas,
  pilotRunSteps,
  pilotRuns,
  reminderJobs,
  reminderRules,
  reports,
  type ReminderJobStatus,
} from "@/drizzle/schema";
import { createNotification } from "@/services/notificationService";

export async function ensureDefaultReminderRules(workspaceId: string) {
  const existing = await db.select().from(reminderRules).where(eq(reminderRules.workspaceId, workspaceId));
  if (existing.length > 0) return existing;
  const now = new Date().toISOString();
  const defaults = [
    { key: "pilot_steps", isEnabled: true, daysBefore: null, staleDays: null },
    { key: "meetings", isEnabled: true, daysBefore: 2, staleDays: null },
    { key: "reports", isEnabled: true, daysBefore: null, staleDays: 30 },
  ] as const;
  for (const rule of defaults) {
    db.insert(reminderRules)
      .values({
        id: randomUUID(),
        workspaceId,
        key: rule.key,
        isEnabled: rule.isEnabled,
        daysBefore: rule.daysBefore,
        staleDays: rule.staleDays,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }
}

export async function runPilotReminders(workspaceId: string) {
  const rule = await db.query.reminderRules.findFirst({
    where: and(eq(reminderRules.workspaceId, workspaceId), eq(reminderRules.key, "pilot_steps")),
  });
  if (!rule || !rule.isEnabled) return 0;
  const today = new Date();
  const steps = await db
    .select({
      stepId: pilotRunSteps.id,
      pilotRunId: pilotRunSteps.pilotRunId,
      title: pilotRunSteps.title,
      dueDate: pilotRunSteps.dueDate,
      status: pilotRunSteps.status,
    })
    .from(pilotRunSteps)
    .innerJoin(pilotRuns, eq(pilotRuns.id, pilotRunSteps.pilotRunId))
    .where(eq(pilotRuns.workspaceId, workspaceId));
  let created = 0;
  for (const step of steps) {
    if (!step.dueDate) continue;
    if (step.status === "done" || step.status === "skipped") continue;
    const due = new Date(step.dueDate);
    if (due.getTime() <= today.getTime()) {
      const pilot = await db.query.pilotRuns.findFirst({ where: eq(pilotRuns.id, step.pilotRunId) });
      if (!pilot) continue;
      await createNotification({
        workspaceId,
        userId: pilot.ownerUserId,
        type: "pilot_step_due",
        title: `Шаг пилота просрочен: ${step.title}`,
        body: `Пилот: ${pilot.name}. Шаг просрочен или на грани срока (${due.toLocaleDateString("ru-RU")}).`,
        entityType: "pilot_step",
        entityId: step.stepId,
        url: `/app/pilot/${pilot.id}?step=${step.stepId}`,
      });
      created += 1;
    }
  }
  return created;
}

export async function runMeetingReminders(workspaceId: string) {
  const rule = await db.query.reminderRules.findFirst({
    where: and(eq(reminderRules.workspaceId, workspaceId), eq(reminderRules.key, "meetings")),
  });
  if (!rule || !rule.isEnabled || rule.daysBefore === null || rule.daysBefore === undefined) return 0;
  const now = new Date();
  const maxDate = new Date(now.getTime() + rule.daysBefore * 24 * 60 * 60 * 1000);
  const agendas = await db.select().from(meetingAgendas).where(eq(meetingAgendas.workspaceId, workspaceId));
  let created = 0;
  for (const agenda of agendas) {
    if (!agenda.scheduledAt) continue;
    const scheduled = new Date(agenda.scheduledAt);
    if (scheduled.getTime() >= now.getTime() && scheduled.getTime() <= maxDate.getTime()) {
      await createNotification({
        workspaceId,
        userId: agenda.createdByUserId,
        type: "meeting_upcoming",
        title: `Скоро встреча: ${agenda.title}`,
        body: `Запланировано на ${scheduled.toLocaleString("ru-RU")}${agenda.durationMinutes ? ` · ${agenda.durationMinutes} мин` : ""}`,
        entityType: "meeting_agenda",
        entityId: agenda.id,
        url: `/app/meetings/${agenda.id}`,
      });
      created += 1;
    }
  }
  return created;
}

export async function runReportReminders(workspaceId: string) {
  const rule = await db.query.reminderRules.findFirst({
    where: and(eq(reminderRules.workspaceId, workspaceId), eq(reminderRules.key, "reports")),
  });
  if (!rule || !rule.isEnabled || rule.staleDays === null || rule.staleDays === undefined) return 0;
  const now = new Date();
  const threshold = new Date(now.getTime() - rule.staleDays * 24 * 60 * 60 * 1000);
  const stale = await db
    .select()
    .from(reports)
    .where(and(eq(reports.workspaceId, workspaceId), lt(reports.updatedAt, threshold.toISOString())));
  let created = 0;
  for (const report of stale) {
    await createNotification({
      workspaceId,
      userId: report.createdByUserId,
      type: "report_stale",
      title: `Отчёт устарел: ${report.title}`,
      body: `Отчёт не обновлялся ${rule.staleDays}+ дней — проверьте актуальность.`,
      entityType: "report",
      entityId: report.id,
      url: `/app/reports/${report.id}`,
    });
    created += 1;
  }
  return created;
}

export async function runAllRemindersForWorkspace(workspaceId: string, scope: "all" | "pilot" | "meetings" | "reports" = "all") {
  await ensureDefaultReminderRules(workspaceId);
  const jobId = randomUUID();
  const startedAt = new Date().toISOString();
  db.insert(reminderJobs)
    .values({
      id: jobId,
      workspaceId,
      type: scope === "all" ? "pilot_scan" : `${scope}_scan`,
      startedAt,
      status: "running",
    })
    .run();
  let status: ReminderJobStatus = "success";
  let errorMessage: string | null = null;
  let created = 0;
  try {
    if (scope === "all" || scope === "pilot") {
      created += await runPilotReminders(workspaceId);
    }
    if (scope === "all" || scope === "meetings") {
      created += await runMeetingReminders(workspaceId);
    }
    if (scope === "all" || scope === "reports") {
      created += await runReportReminders(workspaceId);
    }
  } catch (error) {
    status = "error";
    errorMessage = error instanceof Error ? error.message : "unknown_error";
  } finally {
    db.update(reminderJobs)
      .set({
        status,
        errorMessage: errorMessage ?? null,
        finishedAt: new Date().toISOString(),
      })
      .where(eq(reminderJobs.id, jobId))
      .run();
  }
  return { created };
}
