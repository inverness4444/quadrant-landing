import { randomUUID } from "crypto";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  pilotStepStatuses,
  pilotSteps,
  pilots,
  type PilotStatus,
  type PilotStepStatus,
} from "@/drizzle/schema";

export type PilotInput = {
  name: string;
  status: PilotStatus;
  startDate?: string | null;
  endDate?: string | null;
  goals?: string | null;
};

export type PilotStepInput = {
  key: string;
  title: string;
  description: string;
  order: number;
  mandatory?: boolean;
};

export async function findPilotById(id: string) {
  const [pilot] = await db.select().from(pilots).where(eq(pilots.id, id));
  return pilot ?? null;
}

export async function findActivePilot(workspaceId: string) {
  const [pilot] = await db
    .select()
    .from(pilots)
    .where(and(eq(pilots.workspaceId, workspaceId), eq(pilots.status, "active")))
    .orderBy(desc(pilots.createdAt))
    .limit(1);
  return pilot ?? null;
}

export async function findLatestPilot(workspaceId: string) {
  const [pilot] = await db
    .select()
    .from(pilots)
    .where(eq(pilots.workspaceId, workspaceId))
    .orderBy(desc(pilots.createdAt))
    .limit(1);
  return pilot ?? null;
}

export async function createPilot(workspaceId: string, payload: PilotInput) {
  const id = randomUUID();
  const timestamp = new Date().toISOString();
  await db
    .insert(pilots)
    .values({
      id,
      workspaceId,
      name: payload.name,
      status: payload.status,
      startDate: payload.startDate ?? null,
      endDate: payload.endDate ?? null,
      goals: payload.goals ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();
  return findPilotById(id);
}

export async function updatePilot(pilotId: string, data: Partial<PilotInput>) {
  const [pilot] = await db
    .update(pilots)
    .set({
      ...data,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(pilots.id, pilotId))
    .returning();
  return pilot ?? null;
}

export async function createPilotSteps(pilotId: string, steps: PilotStepInput[]) {
  const timestamp = new Date().toISOString();
  for (const step of steps) {
    await db
      .insert(pilotSteps)
      .values({
        id: randomUUID(),
        pilotId,
        key: step.key,
        title: step.title,
        description: step.description,
        order: step.order,
        mandatory: step.mandatory ?? true,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();
  }
}

export async function listPilotSteps(pilotId: string) {
  return db.select().from(pilotSteps).where(eq(pilotSteps.pilotId, pilotId)).orderBy(asc(pilotSteps.order));
}

export async function findPilotStepById(stepId: string) {
  const [step] = await db.select().from(pilotSteps).where(eq(pilotSteps.id, stepId));
  return step ?? null;
}

export async function findPilotStepByKey(pilotId: string, key: string) {
  const [step] = await db.select().from(pilotSteps).where(and(eq(pilotSteps.pilotId, pilotId), eq(pilotSteps.key, key)));
  return step ?? null;
}

export async function listPilotStepStatuses(pilotId: string) {
  return db.select().from(pilotStepStatuses).where(eq(pilotStepStatuses.pilotId, pilotId));
}

export async function upsertPilotStepStatus(
  pilotId: string,
  stepId: string,
  status: PilotStepStatus,
  notes?: string | null,
) {
  const timestamp = new Date().toISOString();
  const existing = await db
    .select()
    .from(pilotStepStatuses)
    .where(and(eq(pilotStepStatuses.pilotId, pilotId), eq(pilotStepStatuses.stepId, stepId)))
    .limit(1);
  if (existing.length > 0) {
    await db
      .update(pilotStepStatuses)
      .set({
        status,
        notes: notes ?? null,
        updatedAt: timestamp,
      })
      .where(eq(pilotStepStatuses.id, existing[0].id))
      .run();
    return {
      ...existing[0],
      status,
      notes: notes ?? null,
      updatedAt: timestamp,
    };
  }
  const id = randomUUID();
  await db
    .insert(pilotStepStatuses)
    .values({
      id,
      pilotId,
      stepId,
      status,
      notes: notes ?? null,
      updatedAt: timestamp,
    })
    .run();
  return {
    id,
    pilotId,
    stepId,
    status,
    notes: notes ?? null,
    updatedAt: timestamp,
  };
}

export async function deletePilotStepStatuses(pilotId: string) {
  await db.delete(pilotStepStatuses).where(eq(pilotStepStatuses.pilotId, pilotId));
}
