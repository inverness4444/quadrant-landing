import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  artifacts,
  artifactAssignees,
  artifactSkills,
  employeeSkills,
  employees,
  skills,
  tracks,
  type Employee,
  type Skill,
  type Track,
} from "@/drizzle/schema";
import type {
  RiskItem,
  RiskSeverity,
  SkillSummary,
  TeamSkillProfile,
  WorkspaceSkillMap,
} from "@/services/types/analytics";

const levelOrder: Record<Employee["level"], number> = {
  Junior: 0,
  Middle: 1,
  Senior: 2,
};

type AssignmentRow = {
  employeeId: string;
  employeeName: string;
  employeePosition: string;
  employeeLevel: Employee["level"];
  employeeTrackId: string | null;
  skillId: string;
  skillName: string;
  skillType: Skill["type"];
  skillLevel: number;
};

export type WorkspaceSkillSnapshot = {
  workspaceId: string;
  employees: Employee[];
  skills: Skill[];
  tracks: Track[];
  assignments: AssignmentRow[];
  artifactCountByEmployee: Map<string, number>;
};

export async function loadWorkspaceSkillSnapshot(workspaceId: string): Promise<WorkspaceSkillSnapshot> {
  const [employeeList, skillList, assignmentRows, trackRows] = await Promise.all([
    db.select().from(employees).where(eq(employees.workspaceId, workspaceId)),
    db.select().from(skills).where(eq(skills.workspaceId, workspaceId)),
    db
      .select({
        employeeId: employees.id,
        employeeName: employees.name,
        employeePosition: employees.position,
        employeeLevel: employees.level,
        employeeTrackId: employees.primaryTrackId,
        skillId: skills.id,
        skillName: skills.name,
        skillType: skills.type,
        skillLevel: employeeSkills.level,
      })
      .from(employeeSkills)
      .innerJoin(employees, eq(employeeSkills.employeeId, employees.id))
      .innerJoin(skills, eq(employeeSkills.skillId, skills.id))
      .where(eq(employees.workspaceId, workspaceId)),
    db.select().from(tracks).where(eq(tracks.workspaceId, workspaceId)),
  ]);
  let artifactRows: Array<{ employeeId: string; total: number }> = [];
  try {
    artifactRows = await db
      .select({
        employeeId: artifactAssignees.employeeId,
        total: sql<number>`count(distinct ${artifactAssignees.artifactId})`,
      })
      .from(artifactAssignees)
      .innerJoin(artifacts, eq(artifactAssignees.artifactId, artifacts.id))
      .where(eq(artifacts.workspaceId, workspaceId))
      .groupBy(artifactAssignees.employeeId);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("no such table")) {
      throw error;
    }
  }

  const artifactMap = new Map<string, number>();
  for (const row of artifactRows) {
    artifactMap.set(row.employeeId, Number(row.total ?? 0));
  }

  return {
    workspaceId,
    employees: employeeList,
    skills: skillList,
    tracks: trackRows,
    assignments: assignmentRows,
    artifactCountByEmployee: artifactMap,
  };
}

export async function getWorkspaceSkillMap(workspaceId: string): Promise<WorkspaceSkillMap> {
  const snapshot = await loadWorkspaceSkillSnapshot(workspaceId);
  let artifactSkillRows: Array<{ skillId: string; total: number }> = [];
  try {
    artifactSkillRows = await db
      .select({
        skillId: artifactSkills.skillId,
        total: sql<number>`count(distinct ${artifactSkills.artifactId})`,
      })
      .from(artifactSkills)
      .innerJoin(artifacts, eq(artifactSkills.artifactId, artifacts.id))
      .where(eq(artifacts.workspaceId, workspaceId))
      .groupBy(artifactSkills.skillId);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("no such table")) {
      throw error;
    }
  }
  const artifactSkillMap = new Map<string, number>(
    artifactSkillRows.map((row) => [row.skillId, Number(row.total ?? 0)]),
  );
  const totalEmployees = snapshot.employees.length;
  const assignmentsBySkill = new Map<string, AssignmentRow[]>();
  for (const assignment of snapshot.assignments) {
    if (!assignmentsBySkill.has(assignment.skillId)) {
      assignmentsBySkill.set(assignment.skillId, []);
    }
    assignmentsBySkill.get(assignment.skillId)!.push(assignment);
  }
  const skillSummaries: SkillSummary[] = snapshot.skills.map((skill) => {
    const holders = assignmentsBySkill.get(skill.id) ?? [];
    const peopleCount = holders.length;
    const averageLevel =
      peopleCount === 0
        ? 0
        : Math.round((holders.reduce((sum, row) => sum + row.skillLevel, 0) / peopleCount) * 10) / 10;
    const coverage =
      totalEmployees === 0 ? 0 : Math.round(((peopleCount / totalEmployees) * 100 + Number.EPSILON) * 10) / 10;
    const busFactor = peopleCount;
    const riskLevel = resolveRiskLevel(busFactor);
    const riskScore = busFactor === 0 ? 100 : Math.round((1 / busFactor) * 100);
    const keyHolders = [...holders]
      .sort((a, b) => b.skillLevel - a.skillLevel || levelOrder[b.employeeLevel] - levelOrder[a.employeeLevel])
      .slice(0, 3)
      .map((row) => ({
        employeeId: row.employeeId,
        name: row.employeeName,
        position: row.employeePosition,
        level: row.employeeLevel,
        skillLevel: row.skillLevel,
      }));
    const artifactCount = artifactSkillMap.get(skill.id) ?? 0;
    return {
      skillId: skill.id,
      name: skill.name,
      type: skill.type,
      averageLevel,
      peopleCount,
      coverage,
      busFactor,
      riskLevel,
      riskScore,
      artifactCount,
      keyHolders,
    };
  });

  const teams = buildTeamProfiles(snapshot);

  return {
    workspaceId,
    totalEmployees,
    totalSkills: snapshot.skills.length,
    skills: [...skillSummaries].sort((a, b) => b.coverage - a.coverage),
    teams,
    generatedAt: new Date().toISOString(),
  };
}

function buildTeamProfiles(snapshot: WorkspaceSkillSnapshot): TeamSkillProfile[] {
  if (snapshot.employees.length === 0) {
    return [];
  }
  const trackMap = new Map(snapshot.tracks.map((track) => [track.id, track]));
  type TeamAccumulator = {
    teamId: string | null;
    teamName: string;
    employeeIds: Set<string>;
    skillStats: Map<
      string,
      {
        totalLevel: number;
        owners: Set<string>;
      }
    >;
  };

  const teamMap = new Map<string, TeamAccumulator>();
  for (const employee of snapshot.employees) {
    const key = employee.primaryTrackId ?? "unassigned";
    if (!teamMap.has(key)) {
      const track = employee.primaryTrackId ? trackMap.get(employee.primaryTrackId) : null;
      teamMap.set(key, {
        teamId: employee.primaryTrackId,
        teamName: track?.name ?? "Общий пул",
        employeeIds: new Set(),
        skillStats: new Map(),
      });
    }
    teamMap.get(key)!.employeeIds.add(employee.id);
  }

  for (const assignment of snapshot.assignments) {
    const employee = snapshot.employees.find((item) => item.id === assignment.employeeId);
    const key = employee?.primaryTrackId ?? "unassigned";
    if (!teamMap.has(key)) {
      const track = employee?.primaryTrackId ? trackMap.get(employee.primaryTrackId) : null;
      teamMap.set(key, {
        teamId: employee?.primaryTrackId ?? null,
        teamName: track?.name ?? "Общий пул",
        employeeIds: new Set(employee ? [employee.id] : []),
        skillStats: new Map(),
      });
    }
    const acc = teamMap.get(key)!;
    const stat = acc.skillStats.get(assignment.skillId) ?? { totalLevel: 0, owners: new Set<string>() };
    stat.totalLevel += assignment.skillLevel;
    stat.owners.add(assignment.employeeId);
    acc.skillStats.set(assignment.skillId, stat);
  }

  const employeeMap = new Map(snapshot.employees.map((employee) => [employee.id, employee]));
  const result: TeamSkillProfile[] = [];
  for (const team of teamMap.values()) {
    const headcount = team.employeeIds.size;
    if (headcount === 0) continue;
    const dominantSkills = Array.from(team.skillStats.entries())
      .map(([skillId, stat]) => {
        const skillMeta = snapshot.skills.find((item) => item.id === skillId);
        if (!skillMeta) return null;
        const coverage =
          headcount === 0 ? 0 : Math.round(((stat.owners.size / headcount) * 100 + Number.EPSILON) * 10) / 10;
        const averageLevel =
          stat.owners.size === 0 ? 0 : Math.round((stat.totalLevel / stat.owners.size) * 10) / 10;
        return {
          skillId,
          name: skillMeta.name,
          coverage,
          averageLevel,
          owners: stat.owners,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
      .sort((a, b) => b.coverage - a.coverage)
      .slice(0, 5)
      .map((entry) => ({
        skillId: entry.skillId,
        name: entry.name,
        coverage: entry.coverage,
        averageLevel: entry.averageLevel,
      }));

    const risks: RiskItem[] = [];
    for (const [skillId, stat] of team.skillStats.entries()) {
      const skillMeta = snapshot.skills.find((item) => item.id === skillId);
      if (!skillMeta) continue;
      const coverage =
        headcount === 0 ? 0 : Math.round(((stat.owners.size / headcount) * 100 + Number.EPSILON) * 10) / 10;
      const severity = resolveRiskLevel(stat.owners.size);
      if (severity === "low" && coverage > 30) {
        continue;
      }
      const affectedEmployees = Array.from(stat.owners).map((employeeId) => {
        const employee = employeeMap.get(employeeId);
        return {
          employeeId,
          name: employee?.name ?? "Сотрудник",
          position: employee?.position ?? "",
        };
      });
      risks.push({
        id: `team-${team.teamId ?? "unassigned"}-${skillId}`,
        kind: "skill",
        severity: severity === "low" && coverage <= 30 ? "medium" : severity,
        title: `Риск по навыку ${skillMeta.name}`,
        description:
          stat.owners.size <= 1
            ? `Только ${stat.owners.size} человек в команде владеет ${skillMeta.name}`
            : `Только ${coverage}% команды покрывает ${skillMeta.name}`,
        metricValue: stat.owners.size,
        metricLabel: "bus factor",
        teamId: team.teamId,
        affectedSkills: [skillId],
        affectedEmployees,
      });
    }

    result.push({
      teamId: team.teamId,
      teamName: team.teamName,
      headcount,
      dominantSkills,
      risks: [...risks].sort((a, b) => (a.severity === b.severity ? 0 : severityWeight(b.severity) - severityWeight(a.severity))).slice(0, 3),
    });
  }

  return result.sort((a, b) => b.headcount - a.headcount);
}

function resolveRiskLevel(busFactor: number): RiskSeverity {
  if (busFactor <= 1) {
    return "high";
  }
  if (busFactor === 2) {
    return "medium";
  }
  return "low";
}

function severityWeight(severity: RiskSeverity) {
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  return 1;
}
