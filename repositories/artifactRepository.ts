import { randomUUID } from "crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm/sql";
import { db } from "@/lib/db";
import { artifacts, artifactSkills, type Artifact } from "@/drizzle/schema";

const now = () => new Date().toISOString();

export type ArtifactInput = {
  employeeId: string;
  type: string;
  title: string;
  description: string;
  link?: string;
  skills?: Array<{ skillId: string; weight: number }>;
};

export async function createArtifact(workspaceId: string, payload: ArtifactInput) {
  const id = randomUUID();
  const timestamp = now();
  db.insert(artifacts)
    .values({
      id,
      workspaceId,
      employeeId: payload.employeeId,
      type: payload.type,
      title: payload.title,
      description: payload.description,
      link: payload.link,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();
  if (payload.skills?.length) {
    for (const skill of payload.skills) {
      db.insert(artifactSkills)
        .values({
          artifactId: id,
          skillId: skill.skillId,
          weight: skill.weight,
        })
        .run();
    }
  }
  return findArtifactById(id);
}

export async function findArtifactById(id: string) {
  const [artifact] = await db.select().from(artifacts).where(eq(artifacts.id, id));
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

export async function listArtifactsByEmployeeIds(employeeIds: string[]) {
  if (employeeIds.length === 0) return [];
  return db.select().from(artifacts).where(inArray(artifacts.employeeId, employeeIds));
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

export async function listArtifactsByEmployeePaginated(
  workspaceId: string,
  employeeId: string,
  page: number,
  pageSize: number,
) {
  const safePage = Math.max(1, page || 1);
  const safePageSize = Math.min(50, Math.max(1, pageSize || 10));
  const where = and(eq(artifacts.workspaceId, workspaceId), eq(artifacts.employeeId, employeeId));
  const [{ count }] = await db.select({ count: sql<number>`COUNT(*)` }).from(artifacts).where(where);
  const rows = await db
    .select()
    .from(artifacts)
    .where(where)
    .orderBy(desc(artifacts.createdAt))
    .limit(safePageSize)
    .offset((safePage - 1) * safePageSize);
  return {
    artifacts: rows,
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
  const rows = await db.select({ id: artifacts.id }).from(artifacts).where(eq(artifacts.employeeId, employeeId));
  if (rows.length === 0) return;
  const ids = rows.map((row) => row.id);
  await db.delete(artifactSkills).where(inArray(artifactSkills.artifactId, ids));
  await db.delete(artifacts).where(inArray(artifacts.id, ids));
}
