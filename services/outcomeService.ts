import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  programOutcomes,
  pilotOutcomes,
  workspacePrograms,
  pilotRuns,
  type OutcomeSentiment,
} from "@/drizzle/schema";

type Metric = { key: string; label: string; value: number | string; unit?: string; direction?: "up" | "down" | "neutral" };

export async function getProgramOutcome(workspaceId: string, programId: string) {
  const rows = await db
    .select()
    .from(programOutcomes)
    .where(and(eq(programOutcomes.workspaceId, workspaceId), eq(programOutcomes.programId, programId)));
  const programRows = await db
    .select()
    .from(workspacePrograms)
    .where(and(eq(workspacePrograms.workspaceId, workspaceId), eq(workspacePrograms.id, programId)));
  const program = programRows[0] ?? null;
  return { outcome: rows[0] ?? null, program };
}

export async function upsertProgramOutcome(input: {
  workspaceId: string;
  programId: string;
  summaryTitle: string;
  summaryText: string;
  metrics: Metric[];
  sentiment: OutcomeSentiment;
  recommendations: string;
  createdBy: string;
}) {
  const now = new Date().toISOString();
  const existing = await db
    .select()
    .from(programOutcomes)
    .where(and(eq(programOutcomes.workspaceId, input.workspaceId), eq(programOutcomes.programId, input.programId)));
  if (existing[0]) {
    await db
      .update(programOutcomes)
      .set({
        summaryTitle: input.summaryTitle,
        summaryText: input.summaryText,
        metrics: JSON.stringify(input.metrics ?? []),
        sentiment: input.sentiment,
        recommendations: input.recommendations,
        updatedAt: now,
      })
      .where(eq(programOutcomes.id, existing[0].id))
      .run();
    return getProgramOutcome(input.workspaceId, input.programId);
  }
  await db
    .insert(programOutcomes)
    .values({
      id: randomUUID(),
      workspaceId: input.workspaceId,
      programId: input.programId,
      summaryTitle: input.summaryTitle,
      summaryText: input.summaryText,
      metrics: JSON.stringify(input.metrics ?? []),
      sentiment: input.sentiment,
      recommendations: input.recommendations,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return getProgramOutcome(input.workspaceId, input.programId);
}

export async function suggestProgramMetrics(input: { workspaceId: string; programId: string }) {
  void input;
  // Placeholder: real implementation should use goal/feedback/1:1 services
  return [
    { key: "goals_completed", label: "Цели закрыты", value: 0, unit: "%", direction: "neutral" },
    { key: "pulse_score", label: "Средний pulse", value: "-", direction: "neutral" },
    { key: "one_on_ones", label: "Проведено 1:1", value: 0 },
  ];
}

export async function getPilotOutcome(workspaceId: string, pilotId: string) {
  const rows = await db
    .select()
    .from(pilotOutcomes)
    .where(and(eq(pilotOutcomes.workspaceId, workspaceId), eq(pilotOutcomes.pilotId, pilotId)));
  const pilotRows = await db
    .select()
    .from(pilotRuns)
    .where(and(eq(pilotRuns.workspaceId, workspaceId), eq(pilotRuns.id, pilotId)));
  const pilot = pilotRows[0] ?? null;
  return { outcome: rows[0] ?? null, pilot };
}

export async function upsertPilotOutcome(input: {
  workspaceId: string;
  pilotId: string;
  summaryTitle: string;
  summaryText: string;
  metrics: Metric[];
  sentiment: OutcomeSentiment;
  recommendations: string;
  createdBy: string;
}) {
  const now = new Date().toISOString();
  const existing = await db
    .select()
    .from(pilotOutcomes)
    .where(and(eq(pilotOutcomes.workspaceId, input.workspaceId), eq(pilotOutcomes.pilotId, input.pilotId)));
  if (existing[0]) {
    await db
      .update(pilotOutcomes)
      .set({
        summaryTitle: input.summaryTitle,
        summaryText: input.summaryText,
        metrics: JSON.stringify(input.metrics ?? []),
        sentiment: input.sentiment,
        recommendations: input.recommendations,
        updatedAt: now,
      })
      .where(eq(pilotOutcomes.id, existing[0].id))
      .run();
    return getPilotOutcome(input.workspaceId, input.pilotId);
  }
  await db
    .insert(pilotOutcomes)
    .values({
      id: randomUUID(),
      workspaceId: input.workspaceId,
      pilotId: input.pilotId,
      summaryTitle: input.summaryTitle,
      summaryText: input.summaryText,
      metrics: JSON.stringify(input.metrics ?? []),
      sentiment: input.sentiment,
      recommendations: input.recommendations,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return getPilotOutcome(input.workspaceId, input.pilotId);
}

export async function suggestPilotMetrics(input: { workspaceId: string; pilotId: string }) {
  void input;
  // Placeholder: real implementation should use pilot participants/goals/feedback
  return [
    { key: "pilot_completion", label: "Завершение шагов", value: 0, unit: "%", direction: "neutral" },
    { key: "participant_coverage", label: "Участники пилота", value: 0 },
  ];
}
