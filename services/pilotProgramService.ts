import { randomUUID } from "crypto";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { employees, pilotRunParticipants, pilotRuns, type NotificationType, type PilotRunParticipant } from "@/drizzle/schema";
import { createNotification } from "@/services/notificationService";

type PilotStatus = "draft" | "planned" | "active" | "completed" | "cancelled" | "archived";

export async function createOrUpdatePilot(input: {
  workspaceId: string;
  ownerId: string;
  pilotId?: string;
  name: string;
  description?: string;
  startDate?: string | null;
  endDate?: string | null;
  targetAudience?: string | null;
  successCriteria?: string | null;
  notes?: string | null;
  status?: PilotStatus;
}) {
  const now = new Date().toISOString();
  const id = input.pilotId ?? randomUUID();
  if (!input.pilotId) {
    db.insert(pilotRuns)
      .values({
        id,
        workspaceId: input.workspaceId,
        name: input.name,
        description: input.description ?? null,
        status: (input.status as PilotStatus) ?? "draft",
        ownerUserId: input.ownerId,
        targetCycleId: null,
        templateId: null,
        origin: "manual",
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
        targetAudience: input.targetAudience ?? null,
        successCriteria: input.successCriteria ?? null,
        notes: input.notes ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  } else {
    const existing = await db.query.pilotRuns.findFirst({
      where: (fields, { and, eq }) => and(eq(fields.id, input.pilotId!), eq(fields.workspaceId, input.workspaceId)),
    });
    if (!existing) {
      throw new Error("PILOT_NOT_FOUND");
    }
    db.update(pilotRuns)
      .set({
        name: input.name,
        description: input.description ?? null,
        status: (input.status as PilotStatus) ?? existing.status,
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
        targetAudience: input.targetAudience ?? null,
        successCriteria: input.successCriteria ?? null,
        notes: input.notes ?? null,
        updatedAt: now,
      })
      .where(and(eq(pilotRuns.id, input.pilotId), eq(pilotRuns.workspaceId, input.workspaceId)))
      .run();
  }
  const pilot = await db.query.pilotRuns.findFirst({ where: (fields, { and, eq }) => and(eq(fields.id, id), eq(fields.workspaceId, input.workspaceId)) });
  if (!pilot) throw new Error("PILOT_SAVE_FAILED");
  if (!input.pilotId && pilot.status === "active") {
    await notifyPilotStatus({
      type: "pilot_started",
      pilotId: pilot.id,
      workspaceId: input.workspaceId,
      userId: pilot.ownerUserId,
      title: `Пилот ${pilot.name} запущен`,
    });
  }
  return pilot;
}

export async function setPilotStatus(input: { workspaceId: string; pilotId: string; status: PilotStatus }) {
  const existing = await db.query.pilotRuns.findFirst({
    where: (fields, { and, eq }) => and(eq(fields.id, input.pilotId), eq(fields.workspaceId, input.workspaceId)),
  });
  if (!existing) throw new Error("PILOT_NOT_FOUND");
  db.update(pilotRuns)
    .set({ status: input.status, updatedAt: new Date().toISOString() })
    .where(and(eq(pilotRuns.id, input.pilotId), eq(pilotRuns.workspaceId, input.workspaceId)))
    .run();
  const result = await getPilotById({ workspaceId: input.workspaceId, pilotId: input.pilotId });
  if (input.status === "active" && existing.status !== "active") {
    await notifyPilotStatus({
      type: "pilot_started",
      pilotId: existing.id,
      workspaceId: input.workspaceId,
      userId: existing.ownerUserId,
      title: `Пилот ${existing.name} запущен`,
    });
  }
  return result;
}

export async function updatePilotParticipants(input: {
  workspaceId: string;
  pilotId: string;
  employeeIds: string[];
}): Promise<PilotRunParticipant[]> {
  const current = await db
    .select()
    .from(pilotRunParticipants)
    .where(and(eq(pilotRunParticipants.workspaceId, input.workspaceId), eq(pilotRunParticipants.pilotRunId, input.pilotId)));
  const currentIds = new Set(current.map((p) => p.employeeId));
  const targetIds = new Set(input.employeeIds);

  // remove
  const toRemove = current.filter((p) => !targetIds.has(p.employeeId)).map((p) => p.id);
  if (toRemove.length) {
    db.delete(pilotRunParticipants).where(inArray(pilotRunParticipants.id, toRemove)).run();
  }
  // add
  for (const empId of targetIds) {
    if (!currentIds.has(empId)) {
      db.insert(pilotRunParticipants)
        .values({
          id: randomUUID(),
          pilotRunId: input.pilotId,
          workspaceId: input.workspaceId,
          employeeId: empId,
          roleInPilot: null,
          createdAt: new Date().toISOString(),
        })
        .run();
    }
  }
  return db
    .select()
    .from(pilotRunParticipants)
    .where(and(eq(pilotRunParticipants.workspaceId, input.workspaceId), eq(pilotRunParticipants.pilotRunId, input.pilotId)));
}

export async function getPilotById(input: { workspaceId: string; pilotId: string }) {
  const pilot = await db.query.pilotRuns.findFirst({
    where: (fields, { and, eq }) => and(eq(fields.id, input.pilotId), eq(fields.workspaceId, input.workspaceId)),
  });
  if (!pilot) throw new Error("PILOT_NOT_FOUND");
  const participants = await db
    .select({
      participant: pilotRunParticipants,
      employeeName: employees.name,
    })
    .from(pilotRunParticipants)
    .leftJoin(employees, eq(pilotRunParticipants.employeeId, employees.id))
    .where(and(eq(pilotRunParticipants.workspaceId, input.workspaceId), eq(pilotRunParticipants.pilotRunId, input.pilotId)))
    .orderBy(asc(pilotRunParticipants.createdAt));
  return {
    pilot,
    participants: participants.map((p) => ({
      ...p.participant,
      employeeName: p.employeeName ?? null,
    })),
  };
}

export async function listPilots(input: {
  workspaceId: string;
  status?: PilotStatus | "all";
  limit?: number;
  offset?: number;
}): Promise<{ items: typeof pilotRuns.$inferSelect[]; total: number }> {
  const where =
    input.status && input.status !== "all"
      ? and(eq(pilotRuns.workspaceId, input.workspaceId), eq(pilotRuns.status, input.status))
      : eq(pilotRuns.workspaceId, input.workspaceId);
  const totalRows = await db.select({ count: sql<number>`count(*)` }).from(pilotRuns).where(where);
  const query = db.select().from(pilotRuns).where(where).orderBy(desc(pilotRuns.createdAt));
  const paged = input.limit ? query.limit(input.limit).offset(input.offset ?? 0) : query;
  const items = await paged;
  return { items, total: Number(totalRows[0]?.count ?? items.length) };
}

async function notifyPilotStatus(input: {
  type: NotificationType;
  pilotId: string;
  workspaceId: string;
  userId: string;
  title: string;
}) {
  if (input.type !== "pilot_started") return;
  await createNotification({
    workspaceId: input.workspaceId,
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: "Проверьте участников и шаги пилота",
    entityType: "pilot_run",
    entityId: input.pilotId,
    url: `/app/pilots/${input.pilotId}`,
    priority: 2,
  });
}
