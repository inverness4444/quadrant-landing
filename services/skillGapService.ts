import { randomUUID } from "crypto";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { employees, employeeRoleAssignments, employeeSkillRatings, roleProfiles, roleProfileSkillRequirements, skills } from "@/drizzle/schema";

type RoleRequirement = typeof roleProfileSkillRequirements.$inferSelect;
type RoleProfileWithRequirements = (typeof roleProfiles.$inferSelect) & { requirements: RoleRequirement[] };
type EmployeeRoleAssignment = typeof employeeRoleAssignments.$inferSelect;

export type EmployeeSkillLevel = {
  employeeId: string;
  skillId: string;
  level: number;
  source: string | null;
  ratedAt: string | null;
};

export type SkillGapForEmployee = {
  employeeId: string;
  employeeName?: string;
  roleId: string;
  skillId: string;
  skillName?: string;
  requiredLevel: number;
  currentLevel: number | null;
  gap: number | null;
  importance: number;
};

function nowIso() {
  return new Date().toISOString();
}

async function getRoleRequirements(roleId: string): Promise<RoleRequirement[]> {
  if (!roleId) return [];
  return db.select().from(roleProfileSkillRequirements).where(eq(roleProfileSkillRequirements.roleProfileId, roleId));
}

async function getSkillNameMap(workspaceId: string, skillCodes: string[]) {
  if (skillCodes.length === 0) return new Map<string, string>();
  const workspaceSkills = await db.select({ id: skills.id, name: skills.name }).from(skills).where(eq(skills.workspaceId, workspaceId));
  const map = new Map<string, string>();
  workspaceSkills.forEach((row) => {
    const name = row.name ?? row.id;
    map.set(row.id, name);
    map.set(name, name);
  });
  return map;
}

export async function getRoleProfilesForWorkspace(workspaceId: string): Promise<RoleProfileWithRequirements[]> {
  const profiles = await db.select().from(roleProfiles).where(eq(roleProfiles.workspaceId, workspaceId));
  const roleIds = profiles.map((p) => p.id);
  const requirements = roleIds.length
    ? await db.select().from(roleProfileSkillRequirements).where(inArray(roleProfileSkillRequirements.roleProfileId, roleIds))
    : [];
  const groupedReqs = new Map<string, RoleRequirement[]>();
  requirements.forEach((req) => {
    const list = groupedReqs.get(req.roleProfileId) ?? [];
    list.push(req);
    groupedReqs.set(req.roleProfileId, list);
  });
  return profiles.map((profile) => ({
    ...profile,
    requirements: groupedReqs.get(profile.id) ?? [],
  }));
}

export async function upsertRoleProfile(input: {
  workspaceId: string;
  roleId?: string;
  name: string;
  description?: string | null;
  isDefault?: boolean;
  requirements: Array<{ skillCode: string; levelRequired: number; weight?: number | null }>;
}): Promise<RoleProfileWithRequirements> {
  const roleId = input.roleId ?? randomUUID();
  const timestamp = nowIso();
  const existing = await db.query.roleProfiles.findFirst({ where: (fields, { and, eq }) => and(eq(fields.id, roleId), eq(fields.workspaceId, input.workspaceId)) });
  if (existing) {
    db.update(roleProfiles)
      .set({
        name: input.name,
        description: input.description ?? null,
        isDefault: Boolean(input.isDefault),
        updatedAt: timestamp,
      })
      .where(and(eq(roleProfiles.id, roleId), eq(roleProfiles.workspaceId, input.workspaceId)))
      .run();
  } else {
    db.insert(roleProfiles)
      .values({
        id: roleId,
        workspaceId: input.workspaceId,
        name: input.name,
        description: input.description ?? null,
        isDefault: Boolean(input.isDefault),
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();
  }
  db.delete(roleProfileSkillRequirements).where(eq(roleProfileSkillRequirements.roleProfileId, roleId)).run();
  input.requirements.forEach((req) => {
    db.insert(roleProfileSkillRequirements)
      .values({
        id: randomUUID(),
        roleProfileId: roleId,
        skillCode: req.skillCode,
        levelRequired: req.levelRequired,
        weight: req.weight ?? 1,
        createdAt: timestamp,
      })
      .run();
  });
  if (input.isDefault) {
    db.update(roleProfiles)
      .set({ isDefault: false, updatedAt: timestamp })
      .where(and(eq(roleProfiles.workspaceId, input.workspaceId), ne(roleProfiles.id, roleId)))
      .run();
  }
  const updated = (await getRoleProfilesForWorkspace(input.workspaceId)).find((role) => role.id === roleId);
  if (!updated) {
    throw new Error("ROLE_PROFILE_SAVE_FAILED");
  }
  return updated;
}

export async function assignRoleToEmployee(input: {
  workspaceId: string;
  employeeId: string;
  roleProfileId: string;
  isPrimary?: boolean;
}): Promise<EmployeeRoleAssignment> {
  const employee = await db.query.employees.findFirst({ where: eq(employees.id, input.employeeId) });
  if (!employee || employee.workspaceId !== input.workspaceId) {
    throw new Error("EMPLOYEE_NOT_FOUND");
  }
  const role = await db.query.roleProfiles.findFirst({ where: (fields, { and, eq }) => and(eq(fields.id, input.roleProfileId), eq(fields.workspaceId, input.workspaceId)) });
  if (!role) {
    throw new Error("ROLE_PROFILE_NOT_FOUND");
  }
  const isPrimary = input.isPrimary ?? true;
  const timestamp = nowIso();
  if (isPrimary) {
    db.update(employeeRoleAssignments)
      .set({ isPrimary: false })
      .where(and(eq(employeeRoleAssignments.workspaceId, input.workspaceId), eq(employeeRoleAssignments.employeeId, input.employeeId)))
      .run();
  }
  const existing = await db.query.employeeRoleAssignments.findFirst({
    where: (fields, { and, eq }) => and(eq(fields.workspaceId, input.workspaceId), eq(fields.employeeId, input.employeeId), eq(fields.roleProfileId, input.roleProfileId)),
  });
  if (existing) {
    db.update(employeeRoleAssignments)
      .set({ isPrimary, assignedAt: timestamp })
      .where(eq(employeeRoleAssignments.id, existing.id))
      .run();
    return { ...existing, isPrimary, assignedAt: timestamp };
  }
  const id = randomUUID();
  db.insert(employeeRoleAssignments)
    .values({
      id,
      workspaceId: input.workspaceId,
      employeeId: input.employeeId,
      roleProfileId: input.roleProfileId,
      isPrimary,
      assignedAt: timestamp,
    })
    .run();
  const created = await db.query.employeeRoleAssignments.findFirst({ where: eq(employeeRoleAssignments.id, id) });
  if (!created) {
    throw new Error("ROLE_ASSIGNMENT_SAVE_FAILED");
  }
  return created;
}

export async function upsertEmployeeSkillRatings(input: {
  workspaceId: string;
  employeeId: string;
  source: "self" | "manager" | "system";
  ratings: Array<{ skillCode: string; level: number; ratedAt?: string }>;
}) {
  const results: typeof employeeSkillRatings.$inferSelect[] = [];
  const timestamp = nowIso();
  for (const rating of input.ratings) {
    const ratedAt = rating.ratedAt ?? timestamp;
    const existing = await db.query.employeeSkillRatings.findFirst({
      where: (fields, { and, eq }) =>
        and(
          eq(fields.workspaceId, input.workspaceId),
          eq(fields.employeeId, input.employeeId),
          eq(fields.skillCode, rating.skillCode),
          eq(fields.source, input.source),
        ),
    });
    if (existing) {
      db.update(employeeSkillRatings)
        .set({ level: rating.level, ratedAt })
        .where(eq(employeeSkillRatings.id, existing.id))
        .run();
      results.push({ ...existing, level: rating.level, ratedAt });
    } else {
      const id = randomUUID();
      db.insert(employeeSkillRatings)
        .values({
          id,
          workspaceId: input.workspaceId,
          employeeId: input.employeeId,
          skillCode: rating.skillCode,
          level: rating.level,
          source: input.source,
          ratedAt,
        })
        .run();
      const created = await db.query.employeeSkillRatings.findFirst({ where: eq(employeeSkillRatings.id, id) });
      if (created) {
        results.push(created);
      }
    }
  }
  return results;
}

export async function getSkillGapForEmployee(input: { workspaceId: string; employeeId: string }) {
  const assignments = await db
    .select()
    .from(employeeRoleAssignments)
    .where(and(eq(employeeRoleAssignments.workspaceId, input.workspaceId), eq(employeeRoleAssignments.employeeId, input.employeeId)))
    .orderBy(desc(employeeRoleAssignments.assignedAt));
  const primaryAssignment = assignments.find((a) => a.isPrimary) ?? assignments[0];
  if (!primaryAssignment) {
    return { primaryRole: null, skills: [] };
  }
  const [role] = await db
    .select()
    .from(roleProfiles)
    .where(and(eq(roleProfiles.id, primaryAssignment.roleProfileId), eq(roleProfiles.workspaceId, input.workspaceId)));
  if (!role) {
    return { primaryRole: null, skills: [] };
  }
  const requirements = await getRoleRequirements(primaryAssignment.roleProfileId);
  if (!requirements.length) {
    return { primaryRole: role, skills: [] };
  }
  const ratings = await getEmployeeSkillLevels(input.workspaceId, [input.employeeId]);
  const skillCodes = requirements.map((req) => req.skillCode);
  const skillNameMap = await getSkillNameMap(input.workspaceId, skillCodes);
  const skillsProfile = requirements.map((req) => {
    const rating = ratings.find((r) => r.employeeId === input.employeeId && r.skillId === req.skillCode);
    const current = rating?.level ?? null;
    const gap = current !== null ? current - req.levelRequired : null;
    return {
      skillCode: req.skillCode,
      requiredLevel: req.levelRequired,
      actualLevel: current,
      gap,
      weight: req.weight ?? 1,
      skillName: skillNameMap.get(req.skillCode) ?? req.skillCode,
    };
  });
  return { primaryRole: role, skills: skillsProfile };
}

export async function getEmployeeSkillLevels(workspaceId: string, employeeIds: string[]): Promise<EmployeeSkillLevel[]> {
  if (employeeIds.length === 0) return [];
  const rows = await db
    .select({
      employeeId: employeeSkillRatings.employeeId,
      skillId: employeeSkillRatings.skillCode,
      level: employeeSkillRatings.level,
      source: employeeSkillRatings.source,
      ratedAt: employeeSkillRatings.ratedAt,
    })
    .from(employeeSkillRatings)
    .where(and(eq(employeeSkillRatings.workspaceId, workspaceId), inArray(employeeSkillRatings.employeeId, employeeIds)))
    .orderBy(desc(employeeSkillRatings.ratedAt));
  const latest = new Map<string, EmployeeSkillLevel>();
  rows.forEach((row) => {
    const key = `${row.employeeId}:${row.skillId}`;
    if (!latest.has(key)) {
      latest.set(key, row);
    }
  });
  return Array.from(latest.values());
}

export async function computeGapsForRole(input: { workspaceId: string; roleId: string; employeeIds?: string[] }) {
  const requirements = await getRoleRequirements(input.roleId);
  if (requirements.length === 0) {
    return { roleId: input.roleId, employees: [], skills: [], employeesList: [] };
  }
  const skillCodes = Array.from(new Set(requirements.map((r) => r.skillCode)));
  const skillNameMap = await getSkillNameMap(input.workspaceId, skillCodes);
  const assignments = await db
    .select()
    .from(employeeRoleAssignments)
    .where(and(eq(employeeRoleAssignments.workspaceId, input.workspaceId), eq(employeeRoleAssignments.roleProfileId, input.roleId)));
  const employeeIds = input.employeeIds?.length ? input.employeeIds : assignments.map((a) => a.employeeId);
  const ratings = await getEmployeeSkillLevels(input.workspaceId, employeeIds);
  const employeeRows =
    employeeIds.length > 0
      ? await db
          .select({ id: employees.id, name: employees.name })
          .from(employees)
          .where(and(eq(employees.workspaceId, input.workspaceId), inArray(employees.id, employeeIds)))
      : [];
  const employeeNameMap = new Map(employeeRows.map((e) => [e.id, e.name]));
  const gaps: SkillGapForEmployee[] = [];
  requirements.forEach((req) => {
    employeeIds.forEach((empId) => {
      const rating = ratings.find((r) => r.employeeId === empId && r.skillId === req.skillCode);
      const current = rating?.level ?? null;
      const gap = current !== null ? current - req.levelRequired : null;
      gaps.push({
        employeeId: empId,
        employeeName: employeeNameMap.get(empId),
        roleId: req.roleProfileId,
        skillId: req.skillCode,
        skillName: skillNameMap.get(req.skillCode),
        requiredLevel: req.levelRequired,
        currentLevel: current,
        gap,
        importance: req.weight ?? 1,
      });
    });
  });
  const skillsList = skillCodes.map((code) => ({ id: code, name: skillNameMap.get(code) ?? code }));
  return { roleId: input.roleId, employees: gaps, skills: skillsList, employeesList: employeeRows };
}

export async function computeTopGapsForRole(input: { workspaceId: string; roleId: string; limit?: number }) {
  const { employees: gaps } = await computeGapsForRole(input);
  const grouped = new Map<string, { skillId: string; totalGap: number; count: number; negativeCount: number; importance: number; skillName?: string }>();
  gaps.forEach((g) => {
    const entry =
      grouped.get(g.skillId) ??
      { skillId: g.skillId, totalGap: 0, count: 0, negativeCount: 0, importance: g.importance, skillName: g.skillName };
    if (typeof g.gap === "number") {
      entry.totalGap += g.gap;
      entry.count += 1;
      if (g.gap < 0) entry.negativeCount += 1;
    } else {
      entry.negativeCount += 1;
    }
    entry.importance = g.importance;
    entry.skillName = entry.skillName ?? g.skillName;
    grouped.set(g.skillId, entry);
  });
  const result = Array.from(grouped.values())
    .map((entry) => ({
      skillId: entry.skillId,
      skillName: entry.skillName ?? entry.skillId,
      avgGap: entry.count ? entry.totalGap / entry.count : -999,
      importance: entry.importance,
      affectedEmployees: entry.negativeCount,
    }))
    .sort((a, b) => b.importance - a.importance || a.avgGap - b.avgGap || b.affectedEmployees - a.affectedEmployees)
    .slice(0, input.limit ?? 5);
  return result;
}

export async function computeSkillProfileForEmployee(input: { workspaceId: string; employeeId: string }) {
  const assignments = await db
    .select()
    .from(employeeRoleAssignments)
    .where(and(eq(employeeRoleAssignments.workspaceId, input.workspaceId), eq(employeeRoleAssignments.employeeId, input.employeeId)));
  const roleId = assignments.find((a) => a.isPrimary)?.roleProfileId ?? assignments[0]?.roleProfileId ?? null;
  if (!roleId) return { roleId: null, roleName: null, skills: [] };
  const roleRow = await db
    .select({ id: roleProfiles.id, name: roleProfiles.name })
    .from(roleProfiles)
    .where(and(eq(roleProfiles.id, roleId), eq(roleProfiles.workspaceId, input.workspaceId)));
  const requirements = await getRoleRequirements(roleId);
  const ratings = await getEmployeeSkillLevels(input.workspaceId, [input.employeeId]);
  const skillCodes = requirements.map((r) => r.skillCode);
  const skillNameMap = await getSkillNameMap(input.workspaceId, skillCodes);
  const skillsProfile = requirements.map((req) => {
    const rating = ratings.find((r) => r.skillId === req.skillCode);
    const current = rating?.level ?? null;
    const gap = current !== null ? current - req.levelRequired : null;
    return {
      skillId: req.skillCode,
      skillName: skillNameMap.get(req.skillCode) ?? req.skillCode,
      requiredLevel: req.levelRequired,
      currentLevel: current,
      gap,
      importance: req.weight ?? 1,
    };
  });
  return { roleId, roleName: roleRow[0]?.name ?? null, skills: skillsProfile };
}
