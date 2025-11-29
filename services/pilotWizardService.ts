import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { pilotRunSteps, pilotRuns } from "@/drizzle/schema";
import { getPilotTemplateWithSteps } from "@/services/pilotTemplateService";
import { createNotification } from "@/services/notificationService";
import { attachPilotToRiskCase, getRiskCasesForEmployee } from "@/services/riskCenterService";
import { logger } from "@/services/logger";

export type PilotWizardPreview = {
  templateId: string;
  templateTitle: string;
  employeeId: string;
  employeeName: string;
  targetSkillName?: string | null;
  plannedStartDate: string;
  plannedEndDate: string;
  steps: Array<{
    title: string;
    description: string | null;
    expectedOutcome?: string | null;
    dueDate: string;
    isRequired: boolean;
  }>;
};

export async function buildPilotPreviewFromTemplate(input: {
  workspaceId: string;
  employeeId: string;
  templateId: string;
  startDate: Date;
}): Promise<PilotWizardPreview> {
  const tpl = await getPilotTemplateWithSteps({ workspaceId: input.workspaceId, templateId: input.templateId });
  if (!tpl) {
    throw new Error("TEMPLATE_NOT_FOUND");
  }
  const emp = await db.query.employees.findFirst({ where: (fields, { eq }) => eq(fields.id, input.employeeId) });
  if (!emp || emp.workspaceId !== input.workspaceId) {
    throw new Error("EMPLOYEE_NOT_FOUND");
  }
  const durationWeeks = tpl.template.suggestedDurationWeeks ?? 8;
  const addWeeks = (date: Date, weeks: number) => new Date(date.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);
  const plannedEnd = addWeeks(input.startDate, durationWeeks);
  const steps = tpl.steps.map((step) => {
    const due = step.suggestedDueOffsetWeeks ? addWeeks(input.startDate, step.suggestedDueOffsetWeeks) : plannedEnd;
    return {
      title: step.title,
      description: step.description ?? null,
      expectedOutcome: step.expectedOutcome ?? null,
      dueDate: due.toISOString(),
      isRequired: step.isRequired,
    };
  });

  return {
    templateId: tpl.template.id,
    templateTitle: tpl.template.title,
    employeeId: emp.id,
    employeeName: emp.name,
    targetSkillName: null,
    plannedStartDate: input.startDate.toISOString(),
    plannedEndDate: plannedEnd.toISOString(),
    steps,
  };
}

export async function createPilotFromTemplate(input: {
  workspaceId: string;
  userId: string;
  employeeId: string;
  templateId: string;
  startDate: Date;
  customTitle?: string;
}): Promise<{ pilotId: string }> {
  const preview = await buildPilotPreviewFromTemplate({
    workspaceId: input.workspaceId,
    employeeId: input.employeeId,
    templateId: input.templateId,
    startDate: input.startDate,
  });

  const pilotId = randomUUID();
  const now = new Date().toISOString();
  db.insert(pilotRuns)
    .values({
      id: pilotId,
      workspaceId: input.workspaceId,
      name: input.customTitle ?? preview.templateTitle,
      description: null,
      status: "draft",
      ownerUserId: input.userId,
      targetCycleId: null,
      templateId: preview.templateId,
      origin: "template",
      createdAt: now,
      updatedAt: now,
    })
    .run();

  let order = 0;
  for (const step of preview.steps) {
    db.insert(pilotRunSteps)
      .values({
        id: randomUUID(),
        pilotRunId: pilotId,
        key: `tpl_step_${order}`,
        title: step.title,
        description: step.description ?? undefined,
        orderIndex: order++,
        status: "pending",
        dueDate: step.dueDate,
        completedAt: null,
      })
      .run();
  }

  // TODO: связывать с конкретным сотрудником/командой через pilotRunTeams или отдельную таблицу назначений

  void linkPilotWithRiskCases(input.workspaceId, input.employeeId, pilotId);

  await createNotification({
    workspaceId: input.workspaceId,
    userId: input.userId,
    type: "pilot_created",
    title: `Пилот создан: ${preview.templateTitle}`,
    body: `Пилот из шаблона для ${preview.employeeName}`,
    entityType: "pilot_run",
    entityId: pilotId,
    url: `/app/pilot/${pilotId}`,
  });

  return { pilotId };
}

const caseLevelWeight: Record<string, number> = { high: 3, medium: 2, low: 1 };

async function linkPilotWithRiskCases(workspaceId: string, employeeId: string, pilotId: string) {
  try {
    const cases = await getRiskCasesForEmployee({ workspaceId, employeeId, onlyOpen: true });
    if (cases.length === 0) return;
    const target = cases.sort(
      (a, b) =>
        (caseLevelWeight[b.level] ?? 0) - (caseLevelWeight[a.level] ?? 0) ||
        b.detectedAt.getTime() - a.detectedAt.getTime(),
    )[0];
    await attachPilotToRiskCase({ workspaceId, caseId: target.id, pilotId });
  } catch (error) {
    logger.warn("risk_case_pilot_link_failed", {
      workspaceId,
      employeeId,
      pilotId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
