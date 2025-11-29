import { randomUUID } from "crypto";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { pilotTemplateSteps, pilotTemplates } from "@/drizzle/schema";

export type PilotTemplateSummary = {
  id: string;
  title: string;
  description: string | null;
  targetRole: string | null;
  targetSkillId: string | null;
  suggestedDurationWeeks: number | null;
  intensityLevel: string | null;
  isGlobal: boolean;
  isArchived: boolean;
};

export type PilotTemplateStepDTO = {
  id: string;
  orderIndex: number;
  title: string;
  description: string | null;
  expectedOutcome: string | null;
  suggestedDueOffsetWeeks: number | null;
  isRequired: boolean;
};

export type PilotTemplateWithSteps = {
  template: PilotTemplateSummary;
  steps: PilotTemplateStepDTO[];
};

function mapTemplate(row: typeof pilotTemplates.$inferSelect): PilotTemplateSummary {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    targetRole: row.targetRole ?? null,
    targetSkillId: row.targetSkillId ?? null,
    suggestedDurationWeeks: row.suggestedDurationWeeks ?? null,
    intensityLevel: row.intensityLevel ?? null,
    isGlobal: !!row.isGlobal,
    isArchived: !!row.isArchived,
  };
}

export async function listPilotTemplates(input: {
  workspaceId: string;
  includeGlobal: boolean;
  includeArchived?: boolean;
}): Promise<PilotTemplateSummary[]> {
  const conditions = [eq(pilotTemplates.workspaceId, input.workspaceId)];
  if (input.includeGlobal) {
    conditions.push(eq(pilotTemplates.isGlobal, true));
  }
  const rows = await db
    .select()
    .from(pilotTemplates)
    .where(input.includeGlobal ? or(...conditions) : conditions[0]);
  return rows
    .filter((t) => input.includeArchived || !t.isArchived)
    .map(mapTemplate)
    .sort((a, b) => a.title.localeCompare(b.title));
}

export async function getPilotTemplateWithSteps(input: { workspaceId: string; templateId: string }): Promise<PilotTemplateWithSteps | null> {
  const tpl = await db.query.pilotTemplates.findFirst({
    where: and(eq(pilotTemplates.id, input.templateId), or(eq(pilotTemplates.workspaceId, input.workspaceId), eq(pilotTemplates.isGlobal, true))),
  });
  if (!tpl || (tpl.workspaceId !== input.workspaceId && !tpl.isGlobal)) return null;
  const steps = await db
    .select()
    .from(pilotTemplateSteps)
    .where(eq(pilotTemplateSteps.templateId, tpl.id))
    .orderBy(pilotTemplateSteps.orderIndex);
  return {
    template: mapTemplate(tpl),
    steps: steps.map((s) => ({
      id: s.id,
      orderIndex: s.orderIndex,
      title: s.title,
      description: s.description ?? null,
      expectedOutcome: s.expectedOutcome ?? null,
      suggestedDueOffsetWeeks: s.suggestedDueOffsetWeeks ?? null,
      isRequired: !!s.isRequired,
    })),
  };
}

export async function createCustomPilotTemplate(input: {
  workspaceId: string;
  userId: string;
  data: {
    title: string;
    description?: string;
    targetRole?: string;
    targetSkillId?: string;
    suggestedDurationWeeks?: number;
    intensityLevel?: string;
    steps: Array<{ title: string; description?: string; expectedOutcome?: string; suggestedDueOffsetWeeks?: number; isRequired?: boolean }>;
  };
}): Promise<PilotTemplateWithSteps> {
  const id = randomUUID();
  const slug = input.data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const now = new Date().toISOString();
  db.insert(pilotTemplates)
    .values({
      id,
      workspaceId: input.workspaceId,
      slug,
      title: input.data.title,
      description: input.data.description ?? null,
      targetRole: input.data.targetRole ?? null,
      targetSkillId: input.data.targetSkillId ?? null,
      suggestedDurationWeeks: input.data.suggestedDurationWeeks ?? null,
      intensityLevel: input.data.intensityLevel ?? null,
      isGlobal: false,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
      createdByUserId: input.userId,
    })
    .run();

  let order = 0;
  for (const step of input.data.steps) {
    db.insert(pilotTemplateSteps)
      .values({
        id: randomUUID(),
        templateId: id,
        orderIndex: order++,
        title: step.title,
        description: step.description ?? null,
        expectedOutcome: step.expectedOutcome ?? null,
        suggestedDueOffsetWeeks: step.suggestedDueOffsetWeeks ?? null,
        isRequired: step.isRequired ?? true,
      })
      .run();
  }

  const created = await getPilotTemplateWithSteps({ workspaceId: input.workspaceId, templateId: id });
  if (!created) {
    throw new Error("PILOT_TEMPLATE_CREATE_FAILED");
  }
  return created;
}

export async function archivePilotTemplate(input: { workspaceId: string; templateId: string }) {
  const tpl = await db.query.pilotTemplates.findFirst({ where: eq(pilotTemplates.id, input.templateId) });
  if (!tpl || (tpl.workspaceId !== input.workspaceId && !tpl.isGlobal)) {
    throw new Error("TEMPLATE_NOT_FOUND");
  }
  db.update(pilotTemplates)
    .set({ isArchived: true, updatedAt: new Date().toISOString() })
    .where(eq(pilotTemplates.id, input.templateId))
    .run();
}
