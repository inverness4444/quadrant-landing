import { randomUUID } from "crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm/sql";
import { db } from "@/lib/db";
import {
  artifactAssignees,
  artifactSkills,
  artifacts,
  type Artifact,
  type ArtifactAssigneeRole,
  type ArtifactType,
} from "@/drizzle/schema";

const now = () => new Date().toISOString();

export type ArtifactInput = {
  integrationId?: string | null;
  employeeId?: string | null;
  externalId?: string | null;
  type: ArtifactType | string;
  title: string;
  summary?: string | null;
  url?: string | null;
  createdAt?: string;
  updatedAt?: string;
  ingestedAt?: string;
  assignees?: Array<{ employeeId: string; role?: ArtifactAssigneeRole }>;
  skills?: Array<{ skillId: string; confidence?: number }>;
};

export async function createArtifact(workspaceId: string, payload: ArtifactInput) {
  const id = randomUUID();
  const createdAt = payload.createdAt ?? now();
  const updatedAt = payload.updatedAt ?? createdAt;
  const ingestedAt = payload.ingestedAt ?? now();
  const primaryEmployeeId = payload.employeeId ?? payload.assignees?.[0]?.employeeId ?? null;

  db.insert(artifacts)
    .values({
      id,
      workspaceId,
      integrationId: payload.integrationId ?? null,
      employeeId: primaryEmployeeId,
      externalId: payload.externalId ?? null,
      type: payload.type,
      title: payload.title,
      url: payload.url ?? null,
      summary: payload.summary ?? null,
      createdAt,
      updatedAt,
      ingestedAt,
    })
    .run();

  if (payload.assignees?.length) {
    await replaceArtifactAssignees(id, payload.assignees);
  }
  if (payload.skills?.length) {
    await replaceArtifactSkills(id, payload.skills);
  }

  return findArtifactById(id);
}

export async function updateArtifact(
  id: string,
  data: Partial<Omit<ArtifactInput, "assignees" | "skills">>,
) {
  const updates: Partial<typeof artifacts.$inferInsert> = {
    updatedAt: data.updatedAt ?? now(),
  };
  if (typeof data.integrationId !== "undefined") {
    updates.integrationId = data.integrationId;
  }
  if (typeof data.employeeId !== "undefined") {
    updates.employeeId = data.employeeId;
  }
  if (typeof data.externalId !== "undefined") {
    updates.externalId = data.externalId;
  }
  if (typeof data.type !== "undefined") {
    updates.type = data.type;
  }
  if (typeof data.title !== "undefined") {
    updates.title = data.title;
  }
  if (typeof data.summary !== "undefined") {
    updates.summary = data.summary;
  }
  if (typeof data.url !== "undefined") {
    updates.url = data.url;
  }
  if (typeof data.createdAt !== "undefined") {
    updates.createdAt = data.createdAt;
  }
  if (typeof data.ingestedAt !== "undefined") {
    updates.ingestedAt = data.ingestedAt;
  }
  await db.update(artifacts).set(updates).where(eq(artifacts.id, id));
  return findArtifactById(id);
}

export async function replaceArtifactAssignees(
  artifactId: string,
  assignees: Array<{ employeeId: string; role?: ArtifactAssigneeRole }>,
) {
  await db.delete(artifactAssignees).where(eq(artifactAssignees.artifactId, artifactId)).run();
  if (assignees.length === 0) return;
  const timestamp = now();
  for (const assignee of assignees) {
    db.insert(artifactAssignees)
      .values({
        id: randomUUID(),
        artifactId,
        employeeId: assignee.employeeId,
        role: assignee.role ?? "assignee",
        createdAt: timestamp,
      })
      .run();
  }
}

export async function replaceArtifactSkills(
  artifactId: string,
  skills: Array<{ skillId: string; confidence?: number }>,
) {
  await db.delete(artifactSkills).where(eq(artifactSkills.artifactId, artifactId)).run();
  if (skills.length === 0) return;
  for (const skill of skills) {
    db.insert(artifactSkills)
      .values({
        id: randomUUID(),
        artifactId,
        skillId: skill.skillId,
        confidence: typeof skill.confidence === "number" ? skill.confidence : 0.7,
      })
      .run();
  }
}

export async function findArtifactById(id: string) {
  const [artifact] = await db.select().from(artifacts).where(eq(artifacts.id, id));
  return artifact ?? null;
}

export async function findArtifactByExternalRef(
  workspaceId: string,
  integrationId: string | null,
  externalId: string | null,
) {
  if (!externalId) return null;
  const [artifact] = await db
    .select()
    .from(artifacts)
    .where(
      and(
        eq(artifacts.workspaceId, workspaceId),
        eq(artifacts.integrationId, integrationId ?? null),
        eq(artifacts.externalId, externalId),
      ),
    );
  return artifact ?? null;
}

export async function listArtifactsByWorkspace(workspaceId: string) {
  return db.select().from(artifacts).where(eq(artifacts.workspaceId, workspaceId));
}

export async function listArtifactSkillsByWorkspace(workspaceId: string) {
  const records = await db.select({ id: artifacts.id }).from(artifacts).where(eq(artifacts.workspaceId, workspaceId));
  if (records.length === 0) return [];
  const artifactIds = records.map((record) => record.id);
  return db.select().from(artifactSkills).where(inArray(artifactSkills.artifactId, artifactIds));
}

export async function listArtifactSkillsByArtifactIds(artifactIds: string[]) {
  if (artifactIds.length === 0) return [];
  return db.select().from(artifactSkills).where(inArray(artifactSkills.artifactId, artifactIds));
}

export async function listArtifactsByIds(ids: string[]) {
  if (ids.length === 0) return [];
  return db.select().from(artifacts).where(inArray(artifacts.id, ids));
}

export async function listArtifactSkillsBySkillIds(skillIds: string[]) {
  if (skillIds.length === 0) return [];
  return db.select().from(artifactSkills).where(inArray(artifactSkills.skillId, skillIds));
}

export async function listArtifactsByEmployeeIds(employeeIds: string[]) {
  if (employeeIds.length === 0) return [];
  const rows = await db
    .select({ artifactId: artifactAssignees.artifactId })
    .from(artifactAssignees)
    .where(inArray(artifactAssignees.employeeId, employeeIds));
  const ids = Array.from(new Set(rows.map((row) => row.artifactId)));
  if (ids.length === 0) return [];
  return listArtifactsByIds(ids);
}

export async function listArtifactsByEmployeePaginated(
  workspaceId: string,
  employeeId: string,
  page: number,
  pageSize: number,
) {
  const safePage = Math.max(1, page || 1);
  const safePageSize = Math.min(50, Math.max(1, pageSize || 10));
  const where = and(eq(artifacts.workspaceId, workspaceId), eq(artifactAssignees.employeeId, employeeId));
  const [{ count }] = await db
    .select({ count: sql<number>`COUNT(DISTINCT ${artifactAssignees.artifactId})` })
    .from(artifactAssignees)
    .innerJoin(artifacts, eq(artifactAssignees.artifactId, artifacts.id))
    .where(where);

  const artifactRows = await db
    .select({
      artifactId: artifactAssignees.artifactId,
      createdAt: artifacts.createdAt,
    })
    .from(artifactAssignees)
    .innerJoin(artifacts, eq(artifactAssignees.artifactId, artifacts.id))
    .where(where)
    .groupBy(artifactAssignees.artifactId)
    .orderBy(desc(artifacts.createdAt))
    .limit(safePageSize)
    .offset((safePage - 1) * safePageSize);

  const artifactIds = artifactRows.map((row) => row.artifactId);
  if (artifactIds.length === 0) {
    return { artifacts: [], total: Number(count ?? 0), page: safePage, pageSize: safePageSize };
  }

  const records = await listArtifactsByIds(artifactIds);
  const map = new Map(records.map((record) => [record.id, record] as const));
  const ordered = artifactIds
    .map((id) => map.get(id))
    .filter((item): item is Artifact => Boolean(item));

  return {
    artifacts: ordered,
    total: Number(count ?? 0),
    page: safePage,
    pageSize: safePageSize,
  };
}

export async function listArtifactsBySkillPaginated(
  workspaceId: string,
  skillId: string,
  page: number,
  pageSize: number,
) {
  const safePage = Math.max(1, page || 1);
  const safePageSize = Math.min(50, Math.max(1, pageSize || 10));
  const where = and(eq(artifacts.workspaceId, workspaceId), eq(artifactSkills.skillId, skillId));
  const [{ count }] = await db
    .select({ count: sql<number>`COUNT(DISTINCT ${artifactSkills.artifactId})` })
    .from(artifactSkills)
    .innerJoin(artifacts, eq(artifactSkills.artifactId, artifacts.id))
    .where(where);

  const artifactRows = await db
    .select({
      artifactId: artifactSkills.artifactId,
      createdAt: artifacts.createdAt,
    })
    .from(artifactSkills)
    .innerJoin(artifacts, eq(artifactSkills.artifactId, artifacts.id))
    .where(where)
    .groupBy(artifactSkills.artifactId)
    .orderBy(desc(artifacts.createdAt))
    .limit(safePageSize)
    .offset((safePage - 1) * safePageSize);

  const artifactIds = artifactRows.map((row) => row.artifactId);
  if (artifactIds.length === 0) {
    return { artifacts: [], total: Number(count ?? 0), page: safePage, pageSize: safePageSize };
  }

  const records = await listArtifactsByIds(artifactIds);
  const map = new Map(records.map((record) => [record.id, record] as const));
  const ordered = artifactIds
    .map((id) => map.get(id))
    .filter((item): item is Artifact => Boolean(item));

  return {
    artifacts: ordered,
    total: Number(count ?? 0),
    page: safePage,
    pageSize: safePageSize,
  };
}

export async function deleteArtifactsByEmployee(employeeId: string) {
  const rows = await db
    .select({ artifactId: artifactAssignees.artifactId })
    .from(artifactAssignees)
    .where(eq(artifactAssignees.employeeId, employeeId));
  if (rows.length === 0) return;
  const artifactIds = Array.from(new Set(rows.map((row) => row.artifactId)));
  await db.delete(artifactAssignees).where(eq(artifactAssignees.employeeId, employeeId)).run();
  if (artifactIds.length === 0) return;
  const remaining = await db
    .select({ artifactId: artifactAssignees.artifactId })
    .from(artifactAssignees)
    .where(inArray(artifactAssignees.artifactId, artifactIds));
  const orphaned = artifactIds.filter((id) => !remaining.some((row) => row.artifactId === id));
  if (orphaned.length) {
    await db.delete(artifactSkills).where(inArray(artifactSkills.artifactId, orphaned)).run();
    await db.delete(artifacts).where(inArray(artifacts.id, orphaned)).run();
  } else {
    await db
      .update(artifacts)
      .set({ employeeId: null })
      .where(and(inArray(artifacts.id, artifactIds), eq(artifacts.employeeId, employeeId)));
  }
}
