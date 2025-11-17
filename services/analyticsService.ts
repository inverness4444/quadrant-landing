import { and, asc, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  artifacts,
  employeeSkills,
  employees,
  integrations,
  skills,
  tracks,
  trackLevels,
  type EmployeeLevel,
} from "@/drizzle/schema";
import { listSkills } from "@/repositories/skillRepository";
import {
  listEmployees,
  listEmployeeSkillsByWorkspace,
} from "@/repositories/employeeRepository";
import { listTracks, listTrackLevelsByWorkspace } from "@/repositories/trackRepository";
import { getWorkspacePlan, getWorkspaceUsage } from "@/services/planLimits";

export type WorkspacePlanSnapshot = {
  id: string;
  code: string;
  name: string;
  maxMembers: number | null;
  maxEmployees: number | null;
  maxIntegrations: number | null;
  pricePerMonth: number | null;
  currentEmployeesCount: number;
  currentIntegrationsCount: number;
};

export type WorkspaceOverview = {
  employeesCount: number;
  skillsCount: number;
  tracksCount: number;
  integrationsCount: number;
  artifactsCount: number;
  plan: WorkspacePlanSnapshot | null;
};

export type SkillAggregate = {
  skillId: string;
  name: string;
  averageLevel: number;
  employeesWithSkillCount: number;
};

export type EmployeeSkillProblem = {
  skillId: string | null;
  skillName: string;
  currentLevel: number | null;
  targetLevel: number | null;
  note?: string;
};

export type EmployeeRiskEntry = {
  employeeId: string;
  name: string;
  position: string;
  level: EmployeeLevel;
  trackName: string | null;
  trackLevelName: string | null;
  problems: EmployeeSkillProblem[];
};

const MIN_EMPLOYEES_FOR_WEAK_SKILL = 2;
const LOW_SKILL_THRESHOLD = 3;
const MIN_SKILLS_PER_EMPLOYEE = 2;

const TARGET_LEVEL_MAP: Record<EmployeeLevel, number> = {
  Junior: 2,
  Middle: 3,
  Senior: 4,
};

const LEVEL_PRIORITY: Record<EmployeeLevel, number> = {
  Junior: 0,
  Middle: 1,
  Senior: 2,
};

export async function getWorkspaceOverview(workspaceId: string): Promise<WorkspaceOverview> {
  const [{ count: skillsCount }, { count: tracksCount }, usage] = await Promise.all([
    db.select({ count: sql<number>`COUNT(*)` }).from(skills).where(eq(skills.workspaceId, workspaceId)).then(([row]) => ({
      count: Number(row?.count ?? 0),
    })),
    db.select({ count: sql<number>`COUNT(*)` }).from(tracks).where(eq(tracks.workspaceId, workspaceId)).then(([row]) => ({
      count: Number(row?.count ?? 0),
    })),
    getWorkspaceUsage(workspaceId),
  ]);

  let plan: WorkspacePlanSnapshot | null = null;
  try {
    const { plan: workspacePlan } = await getWorkspacePlan(workspaceId);
    plan = {
      id: workspacePlan.id,
      code: workspacePlan.code,
      name: workspacePlan.name,
      maxMembers: workspacePlan.maxMembers ?? null,
      maxEmployees: workspacePlan.maxEmployees ?? null,
      maxIntegrations: workspacePlan.maxIntegrations ?? null,
      pricePerMonth: workspacePlan.pricePerMonth ?? null,
      currentEmployeesCount: usage.currentEmployeesCount,
      currentIntegrationsCount: usage.currentIntegrationsCount,
    };
  } catch {
    plan = null;
  }

  return {
    employeesCount: usage.currentEmployeesCount,
    skillsCount,
    tracksCount,
    integrationsCount: usage.currentIntegrationsCount,
    artifactsCount: usage.currentArtifactsCount,
    plan,
  };
}

export async function getTopSkills(workspaceId: string, limit = 5): Promise<SkillAggregate[]> {
  const avgLevelExpression = sql<number>`avg(${employeeSkills.level})`;
  const employeesCountExpression = sql<number>`count(distinct ${employeeSkills.employeeId})`;
  const rows = await db
    .select({
      skillId: skills.id,
      name: skills.name,
      averageLevel: avgLevelExpression,
      employeesWithSkillCount: employeesCountExpression,
    })
    .from(employeeSkills)
    .innerJoin(skills, eq(skills.id, employeeSkills.skillId))
    .innerJoin(employees, eq(employeeSkills.employeeId, employees.id))
    .where(eq(skills.workspaceId, workspaceId))
    .groupBy(skills.id)
    .orderBy(desc(avgLevelExpression))
    .limit(Math.max(1, limit));

  return rows.map((row) => ({
    skillId: row.skillId,
    name: row.name,
    averageLevel: Number(row.averageLevel ?? 0),
    employeesWithSkillCount: Number(row.employeesWithSkillCount ?? 0),
  }));
}

export async function getWeakSkills(workspaceId: string, limit = 5): Promise<SkillAggregate[]> {
  const avgLevelExpression = sql<number>`avg(${employeeSkills.level})`;
  const employeesCountExpression = sql<number>`count(distinct ${employeeSkills.employeeId})`;
  const rows = await db
    .select({
      skillId: skills.id,
      name: skills.name,
      averageLevel: avgLevelExpression,
      employeesWithSkillCount: employeesCountExpression,
    })
    .from(employeeSkills)
    .innerJoin(skills, eq(skills.id, employeeSkills.skillId))
    .innerJoin(employees, eq(employeeSkills.employeeId, employees.id))
    .where(eq(skills.workspaceId, workspaceId))
    .groupBy(skills.id)
    .having(gt(employeesCountExpression, MIN_EMPLOYEES_FOR_WEAK_SKILL - 1))
    .orderBy(asc(avgLevelExpression))
    .limit(Math.max(1, limit));

  return rows.map((row) => ({
    skillId: row.skillId,
    name: row.name,
    averageLevel: Number(row.averageLevel ?? 0),
    employeesWithSkillCount: Number(row.employeesWithSkillCount ?? 0),
  }));
}

export async function getEmployeesRiskList(workspaceId: string, limit = 5): Promise<EmployeeRiskEntry[]> {
  const [employeeList, employeeSkillRows, skillList, trackList, trackLevelList] = await Promise.all([
    listEmployees(workspaceId),
    listEmployeeSkillsByWorkspace(workspaceId),
    listSkills(workspaceId),
    listTracks(workspaceId),
    listTrackLevelsByWorkspace(workspaceId),
  ]);

  if (employeeList.length === 0) {
    return [];
  }

  const skillMap = new Map(skillList.map((skill) => [skill.id, skill]));
  type EmployeeSkillRow = (typeof employeeSkillRows)[number];
  const employeeSkillsMap = new Map<string, EmployeeSkillRow[]>();
  for (const row of employeeSkillRows) {
    if (!employeeSkillsMap.has(row.employeeId)) {
      employeeSkillsMap.set(row.employeeId, []);
    }
    employeeSkillsMap.get(row.employeeId)?.push(row);
  }
  const trackMap = new Map(trackList.map((track) => [track.id, track]));
  const trackLevelMap = new Map(trackLevelList.map((level) => [level.id, level]));

  const entries: Array<EmployeeRiskEntry & { score: number }> = [];

  for (const employee of employeeList) {
    const assignments = employeeSkillsMap.get(employee.id) ?? [];
    const problems: EmployeeSkillProblem[] = [];
    const targetSkillLevel = TARGET_LEVEL_MAP[employee.level] ?? 3;

    if (assignments.length < MIN_SKILLS_PER_EMPLOYEE) {
      problems.push({
        skillId: null,
        skillName: assignments.length === 0 ? "Нет данных по навыкам" : "Недостаточно навыков",
        currentLevel: assignments.length === 0 ? 0 : average(assignments.map((item) => item.level)),
        targetLevel: targetSkillLevel,
        note: "Добавьте оценки навыков, чтобы увидеть динамику",
      });
    }

    const lowSkillAssignments = assignments.filter((assignment) => assignment.level < LOW_SKILL_THRESHOLD);
    lowSkillAssignments.sort((a, b) => a.level - b.level);
    for (const assignment of lowSkillAssignments.slice(0, 3)) {
      const meta = skillMap.get(assignment.skillId);
      problems.push({
        skillId: assignment.skillId,
        skillName: meta?.name ?? "Навык",
        currentLevel: assignment.level,
        targetLevel: targetSkillLevel,
        note: "Уровень навыка ниже целевого",
      });
    }

    if (employee.trackLevelId) {
      const trackLevel = trackLevelMap.get(employee.trackLevelId);
      const trackDefinition = employee.primaryTrackId ? trackMap.get(employee.primaryTrackId) : null;
      const requiredOrder = LEVEL_PRIORITY[employee.level];
      if (trackLevel && typeof requiredOrder === "number" && trackLevel.order < requiredOrder) {
        problems.push({
          skillId: null,
          skillName: `Трек ${trackDefinition?.name ?? ""}`.trim() || "Трек",
          currentLevel: trackLevel.order + 1,
          targetLevel: requiredOrder + 1,
          note: `Назначенный уровень трека ниже ожидаемого для роли ${employee.level}`,
        });
      }
    }

    if (problems.length === 0) {
      continue;
    }

    const severityScore =
      problems.reduce((sum, problem) => {
        const diff = (problem.targetLevel ?? 3) - (problem.currentLevel ?? 0);
        return sum + Math.max(diff, 1);
      }, 0) + (assignments.length === 0 ? 2 : 0);

    entries.push({
      employeeId: employee.id,
      name: employee.name,
      position: employee.position,
      level: employee.level,
      trackName: employee.primaryTrackId ? trackMap.get(employee.primaryTrackId)?.name ?? null : null,
      trackLevelName: employee.trackLevelId ? trackLevelMap.get(employee.trackLevelId)?.name ?? null : null,
      problems,
      score: severityScore,
    });
  }

  return entries
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, limit))
    .map(({ score, ...entry }) => entry);
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, value) => acc + value, 0);
  return Math.round((sum / values.length) * 10) / 10;
}
