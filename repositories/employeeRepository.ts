import { randomUUID } from "crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
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
