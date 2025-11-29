import { and, desc, eq, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import {
  assessmentCycles,
  jobRoleSkillRequirements,
  jobRoles,
  moveScenarioActions,
  moveScenarios,
  skillAssessments,
  employeeSkills,
  employees,
  type MoveScenarioStatus,
} from "@/drizzle/schema";
import { loadWorkspaceSkillSnapshot, getWorkspaceSkillMap } from "@/services/skillMapService";
import type {
  GapForRoleDTO,
  JobRoleDTO,
  JobRoleSkillRequirementDTO,
  MoveScenarioActionDTO,
  MoveScenarioDTO,
  TeamRiskHiringSummaryDTO,
} from "@/services/types/moves";

const BASE_HIRE_COST = 50000;
const LEADERSHIP_MULTIPLIER = 1.5;
const HIGH_PRIORITY_MULTIPLIER = 1.2;
const BASE_TRAINING_COST_PER_MONTH = 3000;
const INTERNAL_CANDIDATE_GAP_THRESHOLD = 6;

export async function getWorkspaceJobRoles(workspaceId: string): Promise<JobRoleDTO[]> {
  const roles = await db.select().from(jobRoles).where(eq(jobRoles.workspaceId, workspaceId));
  const ids = roles.map((role) => role.id);
  const requirements = await loadRequirements(ids);
  return roles.map((role) => ({
    ...role,
    description: role.description ?? null,
    levelBand: role.levelBand ?? null,
    requirements: requirements.get(role.id) ?? [],
  }));
}

export async function getJobRoleById(jobRoleId: string, workspaceId: string): Promise<JobRoleDTO | null> {
  const role = await db.query.jobRoles.findFirst({ where: and(eq(jobRoles.id, jobRoleId), eq(jobRoles.workspaceId, workspaceId)) });
  if (!role) return null;
  const requirements = await loadRequirements([jobRoleId]);
  return {
    ...role,
    description: role.description ?? null,
    levelBand: role.levelBand ?? null,
    requirements: requirements.get(jobRoleId) ?? [],
  };
}

export async function createJobRole(input: {
  workspaceId: string;
  name: string;
  description?: string | null;
  levelBand?: string | null;
  isLeadership?: boolean;
  requirements: Array<{ skillId: string; requiredLevel: number; importance: JobRoleSkillRequirementDTO["importance"] }>;
}): Promise<JobRoleDTO> {
  const id = randomUUID();
  db.insert(jobRoles)
    .values({
      id,
      workspaceId: input.workspaceId,
      name: input.name,
      description: input.description ?? null,
      levelBand: input.levelBand ?? null,
      isLeadership: Boolean(input.isLeadership),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .run();
  if (input.requirements.length > 0) {
    for (const req of input.requirements) {
      db.insert(jobRoleSkillRequirements)
        .values({
          id: randomUUID(),
          jobRoleId: id,
          skillId: req.skillId,
          requiredLevel: req.requiredLevel,
          importance: req.importance,
        })
        .run();
    }
  }
  const role = await getJobRoleById(id, input.workspaceId);
  if (!role) {
    throw new Error("FAILED_TO_CREATE_JOB_ROLE");
  }
  return role;
}

export async function updateJobRole(input: {
  jobRoleId: string;
  workspaceId: string;
  name?: string;
  description?: string | null;
  levelBand?: string | null;
  isLeadership?: boolean;
  requirements?: Array<{ skillId: string; requiredLevel: number; importance: JobRoleSkillRequirementDTO["importance"] }>;
}): Promise<JobRoleDTO | null> {
  const existing = await db.query.jobRoles.findFirst({
    where: and(eq(jobRoles.id, input.jobRoleId), eq(jobRoles.workspaceId, input.workspaceId)),
  });
  if (!existing) return null;
  db.update(jobRoles)
    .set({
      name: input.name ?? existing.name,
      description: input.description ?? existing.description,
      levelBand: input.levelBand ?? existing.levelBand,
      isLeadership: input.isLeadership ?? existing.isLeadership,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(jobRoles.id, input.jobRoleId))
    .run();
  if (input.requirements) {
    db.delete(jobRoleSkillRequirements).where(eq(jobRoleSkillRequirements.jobRoleId, input.jobRoleId)).run();
    for (const req of input.requirements) {
      db.insert(jobRoleSkillRequirements)
        .values({
          id: randomUUID(),
          jobRoleId: input.jobRoleId,
          skillId: req.skillId,
          requiredLevel: req.requiredLevel,
          importance: req.importance,
        })
        .run();
    }
  }
  return getJobRoleById(input.jobRoleId, input.workspaceId);
}

export async function computeEmployeeRoleGap(input: {
  employeeId: string;
  jobRoleId: string;
  cycleId?: string;
}): Promise<GapForRoleDTO> {
  const workspaceId = await resolveWorkspaceIdForRole(input.jobRoleId);
  const role = await getJobRoleById(input.jobRoleId, workspaceId);
  if (!role) {
    throw new Error("ROLE_NOT_FOUND");
  }
  const requirementSkills = role.requirements;
  const currentLevels = await buildSkillLevelMap(input.employeeId, workspaceId, input.cycleId);
  const skills = requirementSkills.map((req) => {
    const currentLevel = currentLevels.get(req.skillId) ?? 0;
    return {
      skillId: req.skillId,
      requiredLevel: req.requiredLevel,
      currentLevel,
      gap: req.requiredLevel - currentLevel,
      importance: req.importance,
    };
  });
  const aggregatedGapScore = skills
    .filter((item) => item.importance === "must_have")
    .reduce((sum, item) => sum + Math.max(0, item.gap), 0);
  return {
    employeeId: input.employeeId,
    jobRoleId: input.jobRoleId,
    skills: skills.map(({ skillId, requiredLevel, currentLevel, gap }) => ({
      skillId,
      requiredLevel,
      currentLevel,
      gap,
    })),
    aggregatedGapScore,
  };
}

export async function computeTeamNeedsSummary(input: {
  teamId: string;
  workspaceId: string;
  cycleId?: string;
}): Promise<TeamRiskHiringSummaryDTO | null> {
  const snapshot = await loadWorkspaceSkillSnapshot(input.workspaceId);
  const team = snapshot.tracks.find((track) => track.id === input.teamId);
  if (!team) return null;
  const teamEmployees = snapshot.employees.filter((employee) => employee.primaryTrackId === input.teamId);
  const assignments = snapshot.assignments.filter((assignment) =>
    teamEmployees.some((emp) => emp.id === assignment.employeeId),
  );
  const skillOwners = new Map<
    string,
    {
      name: string;
      owners: Array<{ employeeId: string; name: string }>;
      count: number;
      riskScore: number;
    }
  >();
  for (const assignment of assignments) {
    const entry = skillOwners.get(assignment.skillId) ?? {
      name: assignment.skillName,
      owners: [],
      count: 0,
      riskScore: 0,
    };
    entry.count += 1;
    entry.owners.push({ employeeId: assignment.employeeId, name: assignment.employeeName });
    skillOwners.set(assignment.skillId, entry);
  }
  const keySkills = Array.from(skillOwners.entries())
    .filter(([, data]) => data.count <= 2)
    .map(([skillId, data]) => ({
      skillId,
      skillName: data.name,
      riskScore: data.count <= 1 ? 90 : 65,
      busFactor: data.count,
      owners: data.owners,
      isSinglePointOfFailure: data.count === 1,
    }));

  const jobRolesList = await getWorkspaceJobRoles(input.workspaceId);
  const rolesSummary: TeamRiskHiringSummaryDTO["roles"] = [];
  for (const role of jobRolesList) {
    const candidates = await findInternalCandidatesForRole({
      employees: teamEmployees.map((emp) => emp.id),
      jobRoleId: role.id,
      workspaceId: input.workspaceId,
      cycleId: input.cycleId,
    });
    const hireRequired = candidates.length === 0;
    const minGap = candidates.length === 0 ? null : Math.min(...candidates.map((c) => c.aggregatedGapScore));
    rolesSummary.push({
      jobRoleId: role.id,
      jobRoleName: role.name,
      isLeadership: role.isLeadership,
      internalCandidatesCount: candidates.length,
      minGapScoreAmongCandidates: minGap,
      hireRequired,
      primarySkillsForRole: role.requirements.filter((req) => req.importance === "must_have").map((req) => req.skillId),
    });
  }

  const summaryMetrics = {
    totalRiskSkillsCount: keySkills.length,
    singlePointOfFailureCount: keySkills.filter((skill) => skill.isSinglePointOfFailure).length,
    rolesWithoutInternalCandidatesCount: rolesSummary.filter((role) => role.hireRequired).length,
    suggestedHireCount: rolesSummary.filter((role) => role.hireRequired).length,
    suggestedDevelopCount: rolesSummary.filter((role) => !role.hireRequired).length,
  };

  return {
    team: {
      teamId: input.teamId,
      teamName: team.name,
    },
    keySkills,
    roles: rolesSummary,
    summaryMetrics,
  };
}

export async function getWorkspaceMoveScenarios(workspaceId: string): Promise<MoveScenarioDTO[]> {
  const scenarios = await db.select().from(moveScenarios).where(eq(moveScenarios.workspaceId, workspaceId));
  if (scenarios.length === 0) return [];
  const actions = await db
    .select()
    .from(moveScenarioActions)
    .where(inArray(moveScenarioActions.scenarioId, scenarios.map((s) => s.id)));
  const actionsByScenario = new Map<string, typeof actions>();
  for (const action of actions) {
    const list = actionsByScenario.get(action.scenarioId) ?? [];
    list.push(action);
    actionsByScenario.set(action.scenarioId, list);
  }
  return scenarios.map((scenario) => ({
    ...scenario,
    description: scenario.description ?? null,
    actions: (actionsByScenario.get(scenario.id) ?? []).map(mapAction),
  }));
}

export async function getMoveScenarioById(
  scenarioId: string,
  workspaceId: string,
): Promise<MoveScenarioDTO | null> {
  const scenario = await db.query.moveScenarios.findFirst({
    where: and(eq(moveScenarios.id, scenarioId), eq(moveScenarios.workspaceId, workspaceId)),
  });
  if (!scenario) return null;
  const actions = await db.select().from(moveScenarioActions).where(eq(moveScenarioActions.scenarioId, scenarioId));
  return {
    ...scenario,
    description: scenario.description ?? null,
    actions: actions.map(mapAction),
  };
}

export async function saveMoveScenario(input: {
  workspaceId: string;
  title: string;
  description?: string | null;
  createdByUserId: string;
  actions: Array<Partial<MoveScenarioActionDTO>>;
}): Promise<MoveScenarioDTO> {
  const id = randomUUID();
  const now = new Date().toISOString();
  db.insert(moveScenarios)
    .values({
      id,
      workspaceId: input.workspaceId,
      title: input.title,
      description: input.description ?? null,
      createdByUserId: input.createdByUserId,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    })
    .run();
  for (const action of input.actions ?? []) {
    db.insert(moveScenarioActions)
      .values({
        id: randomUUID(),
        scenarioId: id,
        type: action.type ?? "develop",
        teamId: action.teamId ?? null,
        fromEmployeeId: action.fromEmployeeId ?? null,
        toEmployeeId: action.toEmployeeId ?? null,
        jobRoleId: action.jobRoleId ?? null,
        skillId: action.skillId ?? null,
        priority: action.priority ?? "medium",
        estimatedTimeMonths: action.estimatedTimeMonths ?? null,
        estimatedCostHire: action.estimatedCostHire ?? null,
        estimatedCostDevelop: action.estimatedCostDevelop ?? null,
        impactOnRisk: action.impactOnRisk ?? null,
      })
      .run();
  }
  const scenario = await getMoveScenarioById(id, input.workspaceId);
  if (!scenario) {
    throw new Error("FAILED_TO_CREATE_SCENARIO");
  }
  return scenario;
}

export async function updateMoveScenarioStatus(input: {
  scenarioId: string;
  workspaceId: string;
  status: MoveScenarioStatus;
}): Promise<MoveScenarioDTO | null> {
  const existing = await db.query.moveScenarios.findFirst({
    where: and(eq(moveScenarios.id, input.scenarioId), eq(moveScenarios.workspaceId, input.workspaceId)),
  });
  if (!existing) return null;
  db.update(moveScenarios)
    .set({ status: input.status, updatedAt: new Date().toISOString() })
    .where(eq(moveScenarios.id, input.scenarioId))
    .run();
  return getMoveScenarioById(input.scenarioId, input.workspaceId);
}

export async function suggestMoveScenarioFromRisks(input: {
  workspaceId: string;
  createdByUserId: string;
  teamId?: string;
  cycleId?: string;
}): Promise<MoveScenarioDTO> {
  const summaries: TeamRiskHiringSummaryDTO[] = [];
  if (input.teamId) {
    const summary = await computeTeamNeedsSummary({
      teamId: input.teamId,
      workspaceId: input.workspaceId,
      cycleId: input.cycleId,
    });
    if (summary) summaries.push(summary);
  } else {
    const skillMap = await getWorkspaceSkillMap(input.workspaceId);
    for (const team of skillMap.teams.slice(0, 5)) {
      if (!team.teamId) continue;
      const summary = await computeTeamNeedsSummary({
        teamId: team.teamId,
        workspaceId: input.workspaceId,
        cycleId: input.cycleId,
      });
      if (summary) summaries.push(summary);
    }
  }

  if (summaries.length === 0) {
    throw new Error("Недостаточно данных для генерации сценария");
  }

  const actions: Array<Partial<MoveScenarioActionDTO>> = [];

  for (const summary of summaries) {
    const hasSinglePoint = summary.summaryMetrics.singlePointOfFailureCount > 0;
    for (const role of summary.roles) {
      if (role.hireRequired) {
        actions.push({
          type: "hire",
          teamId: summary.team.teamId,
          jobRoleId: role.jobRoleId,
          skillId: role.primarySkillsForRole[0] ?? null,
          priority: role.isLeadership || hasSinglePoint ? "high" : "medium",
          estimatedCostHire: computeHireCost(role.isLeadership, role.isLeadership || hasSinglePoint),
        });
      } else {
        const candidates = await findInternalCandidatesForRole({
          employees: await getTeamEmployeeIds(summary.team.teamId, input.workspaceId),
          jobRoleId: role.jobRoleId,
          workspaceId: input.workspaceId,
          cycleId: input.cycleId,
        });
        const sorted = candidates.sort((a, b) => a.aggregatedGapScore - b.aggregatedGapScore).slice(0, 2);
        for (const candidate of sorted) {
          const months = estimateTimeMonths(candidate.aggregatedGapScore);
          if (!months) continue;
          actions.push({
            type: role.isLeadership ? "promote" : "develop",
            teamId: summary.team.teamId,
            fromEmployeeId: candidate.employeeId,
            jobRoleId: role.jobRoleId,
            priority: role.isLeadership || hasSinglePoint ? "high" : "medium",
            estimatedTimeMonths: months,
            estimatedCostDevelop: estimateDevelopCost(months),
          });
        }
      }
    }
  }

  if (actions.length === 0) {
    throw new Error("Недостаточно данных для генерации сценария");
  }

  const title = input.teamId
    ? `Сценарий закрытия рисков команды ${summaries[0]?.team.teamName ?? ""}`
    : "Сценарий закрытия ключевых рисков по workspace";
  const description =
    "Сценарий создан автоматически на основе рисков, потребностей в ролях и оценки кандидатов внутри команды.";
  return saveMoveScenario({
    workspaceId: input.workspaceId,
    createdByUserId: input.createdByUserId,
    title,
    description,
    actions,
  });
}

export async function addMoveScenarioAction(input: {
  scenarioId: string;
  workspaceId: string;
  action: Partial<MoveScenarioActionDTO>;
}): Promise<MoveScenarioDTO | null> {
  const scenario = await db.query.moveScenarios.findFirst({
    where: and(eq(moveScenarios.id, input.scenarioId), eq(moveScenarios.workspaceId, input.workspaceId)),
  });
  if (!scenario) return null;
  db.insert(moveScenarioActions)
    .values({
      id: randomUUID(),
      scenarioId: input.scenarioId,
      type: input.action.type ?? "develop",
      teamId: input.action.teamId ?? null,
      fromEmployeeId: input.action.fromEmployeeId ?? null,
      toEmployeeId: input.action.toEmployeeId ?? null,
      jobRoleId: input.action.jobRoleId ?? null,
      skillId: input.action.skillId ?? null,
      priority: input.action.priority ?? "medium",
      estimatedTimeMonths: input.action.estimatedTimeMonths ?? null,
      estimatedCostHire: input.action.estimatedCostHire ?? null,
      estimatedCostDevelop: input.action.estimatedCostDevelop ?? null,
      impactOnRisk: input.action.impactOnRisk ?? null,
    })
    .run();
  return getMoveScenarioById(input.scenarioId, input.workspaceId);
}

async function findInternalCandidatesForRole(params: {
  employees: string[];
  jobRoleId: string;
  workspaceId: string;
  cycleId?: string;
}): Promise<GapForRoleDTO[]> {
  const results: GapForRoleDTO[] = [];
  for (const employeeId of params.employees) {
    const gap = await computeEmployeeRoleGap({ employeeId, jobRoleId: params.jobRoleId, cycleId: params.cycleId });
    results.push(gap);
  }
  return results.filter((gap) => gap.aggregatedGapScore <= INTERNAL_CANDIDATE_GAP_THRESHOLD);
}

async function getTeamEmployeeIds(teamId: string, workspaceId: string): Promise<string[]> {
  const rows = await db.select().from(employees).where(and(eq(employees.workspaceId, workspaceId), eq(employees.primaryTrackId, teamId)));
  return rows.map((row) => row.id);
}

function estimateTimeMonths(gapScore: number): number | null {
  if (gapScore <= 3) return 6;
  if (gapScore <= 7) return 12;
  return null;
}

function estimateDevelopCost(months: number) {
  return months * BASE_TRAINING_COST_PER_MONTH;
}

function computeHireCost(isLeadership: boolean, highPriority: boolean) {
  let cost = BASE_HIRE_COST;
  if (isLeadership) cost *= LEADERSHIP_MULTIPLIER;
  if (highPriority) cost *= HIGH_PRIORITY_MULTIPLIER;
  return Math.round(cost);
}

async function loadRequirements(roleIds: string[]) {
  const map = new Map<string, JobRoleSkillRequirementDTO[]>();
  if (roleIds.length === 0) return map;
  const rows = await db
    .select()
    .from(jobRoleSkillRequirements)
    .where(inArray(jobRoleSkillRequirements.jobRoleId, roleIds));
  for (const row of rows) {
    const list = map.get(row.jobRoleId) ?? [];
    list.push({
      ...row,
    });
    map.set(row.jobRoleId, list);
  }
  return map;
}

async function buildSkillLevelMap(employeeId: string, workspaceId: string, cycleId?: string) {
  const map = new Map<string, number>();
  if (cycleId) {
    const rows = await db
      .select()
      .from(skillAssessments)
      .where(and(eq(skillAssessments.cycleId, cycleId), eq(skillAssessments.employeeId, employeeId)));
    rows.forEach((row) => {
      const level = row.finalLevel ?? row.managerLevel ?? row.selfLevel;
      if (level !== null && level !== undefined) {
        map.set(row.skillId, Number(level));
      }
    });
  } else {
    const latestClosed = await db
      .select()
      .from(assessmentCycles)
      .where(and(eq(assessmentCycles.status, "closed"), eq(assessmentCycles.workspaceId, workspaceId)))
      .orderBy(desc(assessmentCycles.updatedAt))
      .limit(1);
    const cycle = latestClosed[0];
    if (cycle) {
      const rows = await db
        .select()
        .from(skillAssessments)
        .where(and(eq(skillAssessments.cycleId, cycle.id), eq(skillAssessments.employeeId, employeeId)));
      rows.forEach((row) => {
        const level = row.finalLevel ?? row.managerLevel ?? row.selfLevel;
        if (level !== null && level !== undefined) {
          map.set(row.skillId, Number(level));
        }
      });
    }
  }
  if (map.size === 0) {
    const skills = await db.select().from(employeeSkills).where(eq(employeeSkills.employeeId, employeeId));
    skills.forEach((row) => map.set(row.skillId, Number(row.level)));
  }
  return map;
}

async function resolveWorkspaceIdForRole(jobRoleId: string): Promise<string> {
  const role = await db.query.jobRoles.findFirst({ where: eq(jobRoles.id, jobRoleId) });
  if (!role) {
    throw new Error("ROLE_NOT_FOUND");
  }
  return role.workspaceId;
}

function mapAction(row: typeof moveScenarioActions.$inferSelect): MoveScenarioActionDTO {
  return {
    ...row,
    teamId: row.teamId ?? null,
    fromEmployeeId: row.fromEmployeeId ?? null,
    toEmployeeId: row.toEmployeeId ?? null,
    jobRoleId: row.jobRoleId ?? null,
    skillId: row.skillId ?? null,
    estimatedTimeMonths: row.estimatedTimeMonths ?? null,
    estimatedCostHire: row.estimatedCostHire ?? null,
    estimatedCostDevelop: row.estimatedCostDevelop ?? null,
    impactOnRisk: row.impactOnRisk ?? null,
  };
}
