import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  artifactAssignees,
  artifactSkills,
  artifacts,
  employees,
  integrations,
  skills,
  type ArtifactAssigneeRole,
  type ArtifactType,
} from "@/drizzle/schema";
import {
  createArtifact,
  findArtifactByExternalRef,
  listArtifactsByWorkspace,
  replaceArtifactAssignees,
  replaceArtifactSkills,
  updateArtifact,
} from "@/repositories/artifactRepository";
import type { ArtifactWithAssigneesAndSkills, ArtifactWithContext } from "@/services/types/artifact";

type ArtifactFilters = {
  type?: ArtifactType | string;
  employeeId?: string;
  employeeIds?: string[];
  skillId?: string;
  integrationId?: string;
  limit?: number;
};

type IntegrationArtifactInput = {
  workspaceId: string;
  integrationId: string | null;
  externalId?: string | null;
  type: ArtifactType;
  title: string;
  summary?: string | null;
  url?: string | null;
  createdAt?: string;
  updatedAt?: string;
  assignees?: Array<{ employeeId: string; role?: ArtifactAssigneeRole }>;
  skills?: Array<{ skillId: string; confidence?: number }>;
};

export async function getWorkspaceArtifacts(
  workspaceId: string,
  filters: ArtifactFilters = {},
): Promise<ArtifactWithAssigneesAndSkills[]> {
  const limit = Math.min(100, Math.max(1, filters.limit ?? 25));
  const whereParts = [eq(artifacts.workspaceId, workspaceId)];
  if (filters.type) {
    whereParts.push(eq(artifacts.type, filters.type as ArtifactType));
  }
  if (filters.integrationId) {
    whereParts.push(eq(artifacts.integrationId, filters.integrationId));
  }
  if (filters.employeeId) {
    whereParts.push(
      sql`exists(select 1 from artifact_assignees aa where aa.artifact_id = ${artifacts.id} and aa.employee_id = ${filters.employeeId})`,
    );
  }
  if (filters.employeeIds && filters.employeeIds.length > 0) {
    const values = sql.join(filters.employeeIds.map((employeeId) => sql`${employeeId}`), sql`, `);
    whereParts.push(
      sql`exists(select 1 from artifact_assignees aa where aa.artifact_id = ${artifacts.id} and aa.employee_id in (${values}))`,
    );
  }
  if (filters.skillId) {
    whereParts.push(
      sql`exists(select 1 from artifact_skills aks where aks.artifact_id = ${artifacts.id} and aks.skill_id = ${filters.skillId})`,
    );
  }
  const where = whereParts.length === 1 ? whereParts[0] : and(...whereParts);

  const rows = await db
    .select({
      id: artifacts.id,
      workspaceId: artifacts.workspaceId,
      type: artifacts.type,
      title: artifacts.title,
      summary: artifacts.summary,
      url: artifacts.url,
      createdAt: artifacts.createdAt,
      updatedAt: artifacts.updatedAt,
      integrationId: artifacts.integrationId,
      integrationName: integrations.name,
      integrationType: integrations.type,
    })
    .from(artifacts)
    .leftJoin(integrations, eq(artifacts.integrationId, integrations.id))
    .where(where)
    .orderBy(desc(artifacts.createdAt))
    .limit(limit);

  if (rows.length === 0) {
    return [];
  }

  const artifactIds = rows.map((row) => row.id);
  const [assigneeRows, skillRows] = await Promise.all([
    db
      .select({
        artifactId: artifactAssignees.artifactId,
        employeeId: artifactAssignees.employeeId,
        role: artifactAssignees.role,
        name: employees.name,
        position: employees.position,
      })
      .from(artifactAssignees)
      .innerJoin(employees, eq(employees.id, artifactAssignees.employeeId))
      .where(inArray(artifactAssignees.artifactId, artifactIds)),
    db
      .select({
        artifactId: artifactSkills.artifactId,
        skillId: artifactSkills.skillId,
        name: skills.name,
        confidence: artifactSkills.confidence,
      })
      .from(artifactSkills)
      .innerJoin(skills, eq(skills.id, artifactSkills.skillId))
      .where(inArray(artifactSkills.artifactId, artifactIds)),
  ]);

  const assigneeMap = new Map<string, ArtifactWithAssigneesAndSkills["assignees"]>();
  for (const row of assigneeRows) {
    if (!assigneeMap.has(row.artifactId)) {
      assigneeMap.set(row.artifactId, []);
    }
    assigneeMap.get(row.artifactId)?.push({
      employeeId: row.employeeId,
      name: row.name ?? "Сотрудник",
      position: row.position ?? "",
      role: row.role,
    });
  }

  const skillMap = new Map<string, ArtifactWithAssigneesAndSkills["skills"]>();
  for (const row of skillRows) {
    if (!skillMap.has(row.artifactId)) {
      skillMap.set(row.artifactId, []);
    }
    skillMap.get(row.artifactId)?.push({
      skillId: row.skillId,
      name: row.name ?? "Навык",
      confidence: Number(row.confidence ?? 0),
    });
  }

  return rows.map((row) => ({
    id: row.id,
    workspaceId: row.workspaceId,
    type: row.type as ArtifactType,
    title: row.title,
    summary: row.summary ?? null,
    url: row.url ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    integration: {
      id: row.integrationId,
      name: row.integrationName ?? null,
      type: (row.integrationType as (typeof integrations.$inferSelect)["type"]) ?? null,
    },
    assignees: assigneeMap.get(row.id) ?? [],
    skills: skillMap.get(row.id) ?? [],
  }));
}

export async function getEmployeeArtifacts(employeeId: string, limit = 10): Promise<ArtifactWithContext[]> {
  if (!employeeId) return [];
  const employee = await db.query.employees.findFirst({ where: eq(employees.id, employeeId) });
  if (!employee) return [];
  return getWorkspaceArtifacts(employee.workspaceId, { employeeId, limit });
}

export async function getSkillArtifacts(skillId: string, limit = 10): Promise<ArtifactWithContext[]> {
  if (!skillId) return [];
  const skill = await db.query.skills.findFirst({ where: eq(skills.id, skillId) });
  if (!skill) return [];
  return getWorkspaceArtifacts(skill.workspaceId, { skillId, limit });
}

export async function createOrUpdateArtifactFromIntegration(input: IntegrationArtifactInput) {
  const existing =
    input.externalId && input.integrationId
      ? await findArtifactByExternalRef(input.workspaceId, input.integrationId, input.externalId)
      : null;

  if (existing) {
    await updateArtifact(existing.id, {
      integrationId: input.integrationId,
      externalId: input.externalId,
      type: input.type,
      title: input.title,
      summary: input.summary ?? null,
      url: input.url ?? null,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
    });
    if (input.assignees) {
      await replaceArtifactAssignees(existing.id, input.assignees);
    }
    if (input.skills) {
      await replaceArtifactSkills(existing.id, input.skills);
    }
    return existing.id;
  }

  const result = await createArtifact(input.workspaceId, {
    integrationId: input.integrationId,
    externalId: input.externalId,
    type: input.type,
    title: input.title,
    summary: input.summary,
    url: input.url,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    assignees: input.assignees,
    skills: input.skills,
  });
  return result?.id ?? null;
}

export async function countArtifactsBySkill(workspaceId: string) {
  const rows = await db
    .select({
      skillId: artifactSkills.skillId,
      total: sql<number>`count(distinct ${artifactSkills.artifactId})`,
    })
    .from(artifactSkills)
    .innerJoin(artifacts, eq(artifactSkills.artifactId, artifacts.id))
    .where(eq(artifacts.workspaceId, workspaceId))
    .groupBy(artifactSkills.skillId);
  return new Map(rows.map((row) => [row.skillId, Number(row.total ?? 0)]));
}

export async function getWorkspaceArtifactCount(workspaceId: string) {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(artifacts)
    .where(eq(artifacts.workspaceId, workspaceId));
  return Number(count ?? 0);
}

export async function getWorkspaceArtifactLeaders(workspaceId: string, limit = 5) {
  const rows = await db
    .select({
      employeeId: artifactAssignees.employeeId,
      total: sql<number>`count(distinct ${artifactAssignees.artifactId})`,
    })
    .from(artifactAssignees)
    .innerJoin(artifacts, eq(artifactAssignees.artifactId, artifacts.id))
    .where(eq(artifacts.workspaceId, workspaceId))
    .groupBy(artifactAssignees.employeeId)
    .orderBy(desc(sql`count(distinct ${artifactAssignees.artifactId})`))
    .limit(Math.max(1, limit));
  const employeeIds = rows.map((row) => row.employeeId).filter(Boolean);
  if (employeeIds.length === 0) {
    return [];
  }
  const employeeRecords = await db
    .select({
      id: employees.id,
      name: employees.name,
      position: employees.position,
    })
    .from(employees)
    .where(inArray(employees.id, employeeIds));
  const employeeMap = new Map(employeeRecords.map((employee) => [employee.id, employee]));
  return rows
    .map((row) => {
      const employee = employeeMap.get(row.employeeId);
      if (!employee) return null;
      return {
        employeeId: employee.id,
        name: employee.name ?? "Сотрудник",
        position: employee.position ?? "",
        artifacts: Number(row.total ?? 0),
      };
    })
    .filter((item): item is { employeeId: string; name: string; position: string; artifacts: number } => Boolean(item));
}

export async function listAllWorkspaceArtifacts(workspaceId: string) {
  return listArtifactsByWorkspace(workspaceId);
}
