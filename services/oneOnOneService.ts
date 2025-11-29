import { randomUUID } from "crypto";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { oneOnOneLinks, oneOnOneNotes, oneOnOnes, type OneOnOne, type OneOnOneLink, type OneOnOneNote } from "@/drizzle/schema";
import { createNotification } from "@/services/notificationService";

export async function scheduleOneOnOne(input: {
  workspaceId: string;
  managerId: string;
  employeeId: string;
  scheduledAt: string;
  durationMinutes?: number;
}): Promise<OneOnOne> {
  const id = randomUUID();
  const now = new Date().toISOString();
  db.insert(oneOnOnes)
    .values({
      id,
      workspaceId: input.workspaceId,
      managerId: input.managerId,
      employeeId: input.employeeId,
      scheduledAt: input.scheduledAt,
      durationMinutes: input.durationMinutes ?? 60,
      status: "scheduled",
      createdAt: now,
      updatedAt: now,
    })
    .run();
  const created = (await db.query.oneOnOnes.findFirst({ where: eq(oneOnOnes.id, id) })) as OneOnOne;
  await createNotification({
    workspaceId: input.workspaceId,
    userId: input.managerId,
    type: "one_on_one_scheduled",
    title: "Назначена 1:1",
    body: `Сотрудник ${input.employeeId}`,
    entityType: "employee",
    entityId: input.employeeId,
    url: `/app/one-on-ones/${id}`,
    priority: 2,
  });
  return created;
}

export async function updateOneOnOne(input: {
  workspaceId: string;
  oneOnOneId: string;
  managerId: string;
  scheduledAt?: string;
  durationMinutes?: number;
  status?: "scheduled" | "completed" | "cancelled";
}): Promise<OneOnOne | null> {
  const existing = await db.query.oneOnOnes.findFirst({
    where: and(eq(oneOnOnes.id, input.oneOnOneId), eq(oneOnOnes.workspaceId, input.workspaceId), eq(oneOnOnes.managerId, input.managerId)),
  });
  if (!existing) return null;
  db.update(oneOnOnes)
    .set({
      scheduledAt: input.scheduledAt ?? existing.scheduledAt,
      durationMinutes: input.durationMinutes ?? existing.durationMinutes,
      status: input.status ?? existing.status,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(oneOnOnes.id, input.oneOnOneId), eq(oneOnOnes.workspaceId, input.workspaceId)))
    .run();
  return (await db.query.oneOnOnes.findFirst({ where: eq(oneOnOnes.id, input.oneOnOneId) })) as OneOnOne;
}

export async function addNote(input: {
  workspaceId: string;
  oneOnOneId: string;
  authorId: string;
  visibility?: "private" | "shared_with_employee";
  text: string;
}): Promise<OneOnOneNote> {
  const id = randomUUID();
  const now = new Date().toISOString();
  db.insert(oneOnOneNotes)
    .values({
      id,
      workspaceId: input.workspaceId,
      oneOnOneId: input.oneOnOneId,
      authorId: input.authorId,
      visibility: input.visibility ?? "private",
      text: input.text,
      createdAt: now,
    })
    .run();
  return (await db.query.oneOnOneNotes.findFirst({ where: eq(oneOnOneNotes.id, id) })) as OneOnOneNote;
}

export async function getOneOnOneById(input: {
  workspaceId: string;
  oneOnOneId: string;
  managerId: string;
}): Promise<{ oneOnOne: OneOnOne; notes: OneOnOneNote[]; links: OneOnOneLink[] } | null> {
  const one = await db.query.oneOnOnes.findFirst({
    where: and(eq(oneOnOnes.id, input.oneOnOneId), eq(oneOnOnes.workspaceId, input.workspaceId), eq(oneOnOnes.managerId, input.managerId)),
  });
  if (!one) return null;
  const notes = await db
    .select()
    .from(oneOnOneNotes)
    .where(and(eq(oneOnOneNotes.workspaceId, input.workspaceId), eq(oneOnOneNotes.oneOnOneId, input.oneOnOneId)))
    .orderBy(oneOnOneNotes.createdAt);
  const links = await db
    .select()
    .from(oneOnOneLinks)
    .where(and(eq(oneOnOneLinks.workspaceId, input.workspaceId), eq(oneOnOneLinks.oneOnOneId, input.oneOnOneId)));
  return { oneOnOne: one, notes, links };
}

export async function listUpcomingForManager(input: {
  workspaceId: string;
  managerId: string;
  fromDate: string;
  toDate: string;
}): Promise<OneOnOne[]> {
  return db
    .select()
    .from(oneOnOnes)
    .where(
      and(
        eq(oneOnOnes.workspaceId, input.workspaceId),
        eq(oneOnOnes.managerId, input.managerId),
        gte(oneOnOnes.scheduledAt, input.fromDate),
        lte(oneOnOnes.scheduledAt, input.toDate),
      ),
    );
}

export async function listForEmployee(input: {
  workspaceId: string;
  employeeId: string;
  managerId?: string;
  limit?: number;
}): Promise<OneOnOne[]> {
  const where = input.managerId
    ? and(eq(oneOnOnes.workspaceId, input.workspaceId), eq(oneOnOnes.employeeId, input.employeeId), eq(oneOnOnes.managerId, input.managerId))
    : and(eq(oneOnOnes.workspaceId, input.workspaceId), eq(oneOnOnes.employeeId, input.employeeId));
  const query = db.select().from(oneOnOnes).where(where).orderBy(oneOnOnes.scheduledAt);
  return input.limit ? await query.limit(input.limit) : await query;
}

export async function linkEntities(input: {
  workspaceId: string;
  oneOnOneId: string;
  links: { entityType: string; entityId: string }[];
}): Promise<OneOnOneLink[]> {
  if (!input.links.length) return [];
  for (const link of input.links) {
    db.insert(oneOnOneLinks)
      .values({
        id: randomUUID(),
        workspaceId: input.workspaceId,
        oneOnOneId: input.oneOnOneId,
        entityType: link.entityType,
        entityId: link.entityId,
      })
      .run();
  }
  return db
    .select()
    .from(oneOnOneLinks)
    .where(and(eq(oneOnOneLinks.workspaceId, input.workspaceId), eq(oneOnOneLinks.oneOnOneId, input.oneOnOneId)));
}
