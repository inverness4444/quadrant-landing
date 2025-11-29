import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  employeeSkills,
  employees,
  skillRoleProfileItems,
  skillRoleProfiles,
  skills,
  tracks,
  type SkillLevelScale,
} from "@/drizzle/schema";
import type {
  EmployeeSkillSnapshot,
  ProfileMatchScore,
  ProfileWithItems,
  SkillGapAggregate,
  SkillGapForEmployee,
} from "@/services/types/skillsAnalytics";

export async function getEmployeeSkillSnapshots(input: { workspaceId: string; teamId?: string }): Promise<EmployeeSkillSnapshot[]> {
  const employeeWhere = input.teamId ? and(eq(employees.workspaceId, input.workspaceId), eq(employees.primaryTrackId, input.teamId)) : eq(employees.workspaceId, input.workspaceId);
  const rows = await db
    .select({
      employeeId: employees.id,
      employeeName: employees.name,
      teamId: employees.primaryTrackId,
      teamName: tracks.name,
      skillId: employeeSkills.skillId,
      skillName: skills.name,
      level: employeeSkills.level,
    })
    .from(employeeSkills)
    .innerJoin(employees, eq(employeeSkills.employeeId, employees.id))
    .leftJoin(tracks, eq(employees.primaryTrackId, tracks.id))
    .innerJoin(skills, eq(employeeSkills.skillId, skills.id))
    .where(employeeWhere);
  return rows.map((row) => ({
    employeeId: row.employeeId,
    employeeName: row.employeeName,
    teamId: row.teamId ?? null,
    teamName: row.teamName ?? null,
    skillId: row.skillId,
    skillName: row.skillName,
    level: (row.level as SkillLevelScale | null) ?? null,
  }));
}

export async function getProfileWithItems(workspaceId: string, profileId: string): Promise<ProfileWithItems | null> {
  const profile = await db.query.skillRoleProfiles.findFirst({
    where: and(eq(skillRoleProfiles.id, profileId), eq(skillRoleProfiles.workspaceId, workspaceId)),
  });
  if (!profile) return null;
  const items = await db
    .select({
      id: skillRoleProfileItems.id,
      skillId: skillRoleProfileItems.skillId,
      targetLevel: skillRoleProfileItems.targetLevel,
      weight: skillRoleProfileItems.weight,
      skillName: skills.name,
    })
    .from(skillRoleProfileItems)
    .innerJoin(skills, eq(skillRoleProfileItems.skillId, skills.id))
    .where(eq(skillRoleProfileItems.profileId, profileId));
  return {
    id: profile.id,
    name: profile.name,
    description: profile.description ?? null,
    roleCode: profile.roleCode ?? null,
    items: items.map((item) => ({
      id: item.id,
      skillId: item.skillId,
      skillName: item.skillName,
      targetLevel: item.targetLevel,
      weight: item.weight,
    })),
  };
}

export async function getProfileGapsForTeam(input: {
  workspaceId: string;
  profileId: string;
  teamId: string;
}): Promise<SkillGapForEmployee[]> {
  const profile = await getProfileWithItems(input.workspaceId, input.profileId);
  if (!profile) return [];
  const employeesRows = await db
    .select({
      id: employees.id,
      name: employees.name,
      teamName: tracks.name,
    })
    .from(employees)
    .leftJoin(tracks, eq(employees.primaryTrackId, tracks.id))
    .where(and(eq(employees.workspaceId, input.workspaceId), eq(employees.primaryTrackId, input.teamId)));
  const employeeIds = employeesRows.map((e) => e.id);
  if (employeeIds.length === 0) return [];
  const skillRows =
    employeeIds.length > 0
      ? await db
          .select({
            employeeId: employeeSkills.employeeId,
            skillId: employeeSkills.skillId,
            level: employeeSkills.level,
          })
          .from(employeeSkills)
          .where(inArray(employeeSkills.employeeId, employeeIds))
      : [];
  const skillMap = new Map<string, Map<string, number>>();
  for (const row of skillRows) {
    const map = skillMap.get(row.employeeId) ?? new Map<string, number>();
    map.set(row.skillId, row.level);
    skillMap.set(row.employeeId, map);
  }
  const gaps: SkillGapForEmployee[] = [];
  for (const employee of employeesRows) {
    const skillsForEmployee = skillMap.get(employee.id);
    for (const item of profile.items) {
      const currentLevel = skillsForEmployee?.get(item.skillId) ?? null;
      const delta = Math.max(0, item.targetLevel - (currentLevel ?? 0));
      if (delta > 0) {
        gaps.push({
          employeeId: employee.id,
          employeeName: employee.name,
          teamName: employee.teamName ?? null,
          skillId: item.skillId,
          skillName: item.skillName,
          currentLevel: (currentLevel as SkillLevelScale | null) ?? null,
          targetLevel: item.targetLevel as SkillLevelScale,
          delta,
          weight: item.weight,
        });
      }
    }
  }
  return gaps;
}

export function aggregateSkillGaps({ gaps }: { gaps: SkillGapForEmployee[] }): SkillGapAggregate[] {
  const grouped = new Map<string, SkillGapAggregate & { totalDelta: number }>();
  for (const gap of gaps) {
    const key = gap.skillId;
    const entry = grouped.get(key) ?? {
      skillId: gap.skillId,
      skillName: gap.skillName,
      avgDelta: 0,
      maxDelta: 0,
      affectedEmployeesCount: 0,
      totalDelta: 0,
    };
    entry.affectedEmployeesCount += 1;
    entry.totalDelta += gap.delta;
    entry.maxDelta = Math.max(entry.maxDelta, gap.delta);
    grouped.set(key, entry);
  }
  return [...grouped.values()].map((entry) => ({
    skillId: entry.skillId,
    skillName: entry.skillName,
    avgDelta: entry.affectedEmployeesCount === 0 ? 0 : entry.totalDelta / entry.affectedEmployeesCount,
    maxDelta: entry.maxDelta,
    affectedEmployeesCount: entry.affectedEmployeesCount,
  }));
}

export async function computeProfileMatchScores(input: {
  workspaceId: string;
  profileId: string;
  teamId?: string;
}): Promise<ProfileMatchScore[]> {
  const profile = await getProfileWithItems(input.workspaceId, input.profileId);
  if (!profile) return [];
  const employeeWhere = input.teamId
    ? and(eq(employees.workspaceId, input.workspaceId), eq(employees.primaryTrackId, input.teamId))
    : eq(employees.workspaceId, input.workspaceId);
  const employeesRows = await db
    .select({
      id: employees.id,
      name: employees.name,
      teamName: tracks.name,
    })
    .from(employees)
    .leftJoin(tracks, eq(employees.primaryTrackId, tracks.id))
    .where(employeeWhere);
  const employeeIds = employeesRows.map((e) => e.id);
  if (employeeIds.length === 0) return [];
  const skillRows =
    employeeIds.length > 0
      ? await db
          .select({
            employeeId: employeeSkills.employeeId,
            skillId: employeeSkills.skillId,
            level: employeeSkills.level,
          })
          .from(employeeSkills)
          .where(inArray(employeeSkills.employeeId, employeeIds))
      : [];
  const skillMap = new Map<string, Map<string, number>>();
  for (const row of skillRows) {
    const map = skillMap.get(row.employeeId) ?? new Map<string, number>();
    map.set(row.skillId, row.level);
    skillMap.set(row.employeeId, map);
  }
  const maxPossibleDelta =
    profile.items.reduce((sum, item) => sum + item.weight * item.targetLevel, 0) + 0.0001; // avoid zero division
  const scores: ProfileMatchScore[] = [];
  for (const employee of employeesRows) {
    const map = skillMap.get(employee.id) ?? new Map<string, number>();
    let totalWeightedDelta = 0;
    let covered = 0;
    for (const item of profile.items) {
      const currentLevel = map.get(item.skillId);
      const delta = Math.max(0, item.targetLevel - (currentLevel ?? 0));
      totalWeightedDelta += item.weight * delta;
      if (currentLevel !== undefined && currentLevel !== null) {
        covered += 1;
      }
    }
    const matchPercent = Math.max(0, Math.min(100, 100 * (1 - totalWeightedDelta / maxPossibleDelta)));
    const coveragePercent = profile.items.length === 0 ? 0 : Math.round((covered / profile.items.length) * 100);
    scores.push({
      employeeId: employee.id,
      employeeName: employee.name,
      teamName: employee.teamName ?? null,
      profileId: profile.id,
      profileName: profile.name,
      matchPercent,
      coveragePercent,
      totalWeightedDelta,
    });
  }
  return scores.sort((a, b) => b.matchPercent - a.matchPercent);
}
