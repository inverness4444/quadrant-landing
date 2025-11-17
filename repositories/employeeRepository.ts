import { randomUUID } from "crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm/sql";
import { db } from "@/lib/db";
import {
  employees,
  employeeSkills,
  skills,
  tracks,
  trackLevels,
  type EmployeeLevel,
} from "@/drizzle/schema";

const now = () => new Date().toISOString();

export type EmployeeSkillInput = {
  skillId: string;
  level: number;
};

export type EmployeePayload = {
  name: string;
  position: string;
  level: EmployeeLevel;
  primaryTrackId?: string | null;
  trackLevelId?: string | null;
  skills?: EmployeeSkillInput[];
};

export type EmployeeListFilters = {
  page: number;
  pageSize: number;
  search?: string;
  level?: EmployeeLevel | "all";
  position?: string | null;
};

export async function listEmployees(workspaceId: string) {
  return db.select().from(employees).where(eq(employees.workspaceId, workspaceId)).orderBy(asc(employees.name));
}

export async function getEmployeeById(id: string) {
  const [employee] = await db.select().from(employees).where(eq(employees.id, id));
  return employee ?? null;
}

export async function createEmployee(workspaceId: string, payload: EmployeePayload) {
  await validateTrackAssignments(workspaceId, payload.primaryTrackId, payload.trackLevelId);
  if (payload.skills?.length) {
    await validateSkillAssignments(workspaceId, payload.skills.map((item) => item.skillId));
  }
  const employeeId = randomUUID();
  db.insert(employees)
    .values({
      id: employeeId,
      workspaceId,
      name: payload.name,
      position: payload.position,
      level: payload.level,
      primaryTrackId: payload.primaryTrackId || null,
      trackLevelId: payload.trackLevelId || null,
      createdAt: now(),
      updatedAt: now(),
    })
    .run();
  if (payload.skills?.length) {
    for (const assignment of payload.skills) {
      db.insert(employeeSkills)
        .values({
          employeeId,
          skillId: assignment.skillId,
          level: normalizeSkillLevel(assignment.level),
        })
        .run();
    }
  }
  return getEmployeeById(employeeId);
}

export async function updateEmployee(workspaceId: string, id: string, payload: EmployeePayload) {
  const existing = await db.query.employees.findFirst({ where: eq(employees.id, id) });
  if (!existing || existing.workspaceId !== workspaceId) {
    throw new Error("EMPLOYEE_NOT_FOUND");
  }
  await validateTrackAssignments(workspaceId, payload.primaryTrackId, payload.trackLevelId);
  if (payload.skills) {
    await validateSkillAssignments(workspaceId, payload.skills.map((item) => item.skillId));
  }
  db.update(employees)
    .set({
      name: payload.name,
      position: payload.position,
      level: payload.level,
      primaryTrackId: payload.primaryTrackId || null,
      trackLevelId: payload.trackLevelId || null,
      updatedAt: now(),
    })
    .where(eq(employees.id, id))
    .run();
  if (payload.skills) {
    db.delete(employeeSkills).where(eq(employeeSkills.employeeId, id)).run();
    for (const assignment of payload.skills) {
      db.insert(employeeSkills)
        .values({
          employeeId: id,
          skillId: assignment.skillId,
          level: normalizeSkillLevel(assignment.level),
        })
        .run();
    }
  }
  return getEmployeeById(id);
}

export async function removeEmployee(workspaceId: string, id: string) {
  const existing = await db.query.employees.findFirst({ where: eq(employees.id, id) });
  if (!existing || existing.workspaceId !== workspaceId) {
    throw new Error("EMPLOYEE_NOT_FOUND");
  }
  db.delete(employeeSkills).where(eq(employeeSkills.employeeId, id)).run();
  db.delete(employees).where(eq(employees.id, id)).run();
}

export async function listEmployeeSkillsByWorkspace(workspaceId: string) {
  const employeeList = await db.select({ id: employees.id }).from(employees).where(eq(employees.workspaceId, workspaceId));
  const ids = employeeList.map((entry) => entry.id);
  if (ids.length === 0) return [];
  return db.select().from(employeeSkills).where(inArray(employeeSkills.employeeId, ids));
}

export async function listEmployeeSkillsForEmployee(employeeId: string) {
  return db.select().from(employeeSkills).where(eq(employeeSkills.employeeId, employeeId));
}

export async function listEmployeeSkillsForEmployees(employeeIds: string[]) {
  if (employeeIds.length === 0) return [];
  return db.select().from(employeeSkills).where(inArray(employeeSkills.employeeId, employeeIds));
}

export async function listEmployeeSkillsBySkillIds(skillIds: string[]) {
  if (skillIds.length === 0) return [];
  return db.select().from(employeeSkills).where(inArray(employeeSkills.skillId, skillIds));
}

export async function listEmployeesByIds(ids: string[]) {
  if (ids.length === 0) return [];
  return db.select().from(employees).where(inArray(employees.id, ids));
}

export async function listEmployeePositions(workspaceId: string) {
  const rows = await db
    .select({ position: employees.position })
    .from(employees)
    .where(eq(employees.workspaceId, workspaceId))
    .groupBy(employees.position)
    .orderBy(asc(employees.position));
  return rows.map((row) => row.position).filter((position): position is string => Boolean(position));
}

export async function listEmployeesPaginated(workspaceId: string, filters: EmployeeListFilters) {
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize || 20));
  let where = eq(employees.workspaceId, workspaceId);
  if (filters.level && filters.level !== "all") {
    const levelFilter = and(where, eq(employees.level, filters.level));
    if (levelFilter) {
      where = levelFilter;
    }
  }
  if (filters.position && filters.position !== "all") {
    const positionFilter = and(where, eq(employees.position, filters.position));
    if (positionFilter) {
      where = positionFilter;
    }
  }
  if (filters.search) {
    const term = `%${filters.search.toLowerCase()}%`;
    const searchFilter = and(
      where,
      sql`(lower(${employees.name}) like ${term} or lower(${employees.position}) like ${term})`,
    );
    if (searchFilter) {
      where = searchFilter;
    }
  }
  const [{ count }] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(employees)
    .where(where);
  const items = await db
    .select()
    .from(employees)
    .where(where)
    .orderBy(asc(employees.name))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  return {
    employees: items,
    total: Number(count ?? 0),
    page,
    pageSize,
  };
}

async function validateSkillAssignments(workspaceId: string, skillIds: string[]) {
  if (skillIds.length === 0) return;
  const rows = await db
    .select({ id: skills.id })
    .from(skills)
    .where(and(eq(skills.workspaceId, workspaceId), inArray(skills.id, skillIds)));
  if (rows.length !== skillIds.length) {
    throw new Error("SKILL_NOT_FOUND");
  }
}

async function validateTrackAssignments(
  workspaceId: string,
  primaryTrackId?: string | null,
  trackLevelId?: string | null,
) {
  if (trackLevelId) {
    const [level] = await db
      .select({
        trackId: trackLevels.trackId,
      })
      .from(trackLevels)
      .where(eq(trackLevels.id, trackLevelId));
    if (!level) {
      throw new Error("TRACK_LEVEL_NOT_FOUND");
    }
    const [track] = await db.select().from(tracks).where(eq(tracks.id, level.trackId));
    if (!track || track.workspaceId !== workspaceId) {
      throw new Error("TRACK_LEVEL_NOT_FOUND");
    }
  }
  if (primaryTrackId) {
    const [track] = await db.select().from(tracks).where(eq(tracks.id, primaryTrackId));
    if (!track || track.workspaceId !== workspaceId) {
      throw new Error("TRACK_NOT_FOUND");
    }
  }
}

function normalizeSkillLevel(level: number) {
  if (Number.isNaN(level)) return 1;
  return Math.min(5, Math.max(1, Math.round(level)));
}
