import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tracks, type EmployeeLevel } from "@/drizzle/schema";
import { getWorkspaceArtifacts } from "@/services/artifactService";
import { buildTeamInsights } from "@/services/insightService";
import { loadWorkspaceSkillSnapshot } from "@/services/skillMapService";
import type { TeamMemberSummary, TeamProfile, TeamSkillStat } from "@/services/types/profile";
import type { RiskSeverity } from "@/services/types/analytics";

const levelRank: Record<EmployeeLevel, number> = {
  Junior: 0,
  Middle: 1,
  Senior: 2,
};

export async function getTeamProfile(workspaceId: string, teamId: string): Promise<TeamProfile | null> {
  const track = await db.query.tracks.findFirst({ where: eq(tracks.id, teamId) });
  if (!track || track.workspaceId !== workspaceId) {
    return null;
  }
  const snapshot = await loadWorkspaceSkillSnapshot(workspaceId);
  const employees = snapshot.employees.filter((employee) => employee.primaryTrackId === teamId);
  const employeeIds = new Set(employees.map((employee) => employee.id));
  const assignments = snapshot.assignments.filter((assignment) => employeeIds.has(assignment.employeeId));
  const assignmentsByEmployee = new Map<string, typeof assignments>();
  for (const assignment of assignments) {
    const list = assignmentsByEmployee.get(assignment.employeeId) ?? [];
    list.push(assignment);
    assignmentsByEmployee.set(assignment.employeeId, list);
  }
  const skillStats = new Map<
    string,
    {
      name: string;
      type: TeamSkillStat["type"];
      owners: Set<string>;
      totalLevel: number;
    }
  >();
  for (const assignment of assignments) {
    const stat = skillStats.get(assignment.skillId) ?? {
      name: assignment.skillName,
      type: assignment.skillType,
      owners: new Set<string>(),
      totalLevel: 0,
    };
    stat.owners.add(assignment.employeeId);
    stat.totalLevel += assignment.skillLevel;
    skillStats.set(assignment.skillId, stat);
  }

  const members: TeamMemberSummary[] = employees.map((employee) => {
    const employeeAssignments = assignmentsByEmployee.get(employee.id) ?? [];
    const keySkills = employeeAssignments.filter((assignment) => assignment.skillLevel >= 4).length;
    const supportingSkills = Math.max(employeeAssignments.length - keySkills, 0);
    const topSkills = [...employeeAssignments]
      .sort((a, b) => b.skillLevel - a.skillLevel || a.skillName.localeCompare(b.skillName))
      .slice(0, 3)
      .map((assignment) => assignment.skillName);
    return {
      id: employee.id,
      name: employee.name,
      position: employee.position,
      level: employee.level,
      keySkills,
      supportingSkills,
      topSkills,
      artifactCount: snapshot.artifactCountByEmployee.get(employee.id) ?? 0,
      isSinglePoint: false,
    };
  });

  const allSkillSummaries = Array.from(skillStats.entries()).map<TeamSkillStat>(([skillId, stat]) => {
    const owners = stat.owners.size;
    const coverage =
      employees.length === 0 ? 0 : Math.round(((owners / employees.length) * 100 + Number.EPSILON) * 10) / 10;
    const averageLevel =
      owners === 0 ? 0 : Math.round((stat.totalLevel / owners + Number.EPSILON) * 10) / 10;
    const risk = resolveRisk(owners);
    return {
      skillId,
      name: stat.name,
      type: stat.type,
      owners,
      coverage,
      averageLevel,
      risk,
    };
  });

  const singleOwnerSet = new Set<string>();
  for (const stat of allSkillSummaries) {
    if (stat.owners === 1) {
      const assignment = assignments.find((entry) => entry.skillId === stat.skillId);
      if (assignment) {
        singleOwnerSet.add(assignment.employeeId);
      }
    }
  }

  const membersWithFlags = members.map((member) => ({
    ...member,
    isSinglePoint: singleOwnerSet.has(member.id),
  }));

  const sortedMembers = [...membersWithFlags].sort(
    (a, b) =>
      levelRank[b.level] - levelRank[a.level] ||
      (b.artifactCount ?? 0) - (a.artifactCount ?? 0) ||
      a.name.localeCompare(b.name),
  );
  const lead = sortedMembers[0] ?? null;

  const topSkills = [...allSkillSummaries].sort((a, b) => b.coverage - a.coverage).slice(0, 10);
  const riskySkills = [...allSkillSummaries]
    .filter((skill) => skill.risk !== "low")
    .sort((a, b) => severityWeight(b.risk) - severityWeight(a.risk))
    .slice(0, 5);

  const artifactCount = membersWithFlags.reduce(
    (sum, member) => sum + (member.artifactCount ?? 0),
    0,
  );

  const artifacts =
    membersWithFlags.length === 0
      ? []
      : await getWorkspaceArtifacts(workspaceId, {
          employeeIds: membersWithFlags.map((member) => member.id),
          limit: 20,
        });

  const insights = buildTeamInsights({
    teamName: track.name,
    headcount: membersWithFlags.length,
    artifactCount,
    members: membersWithFlags,
    riskySkills,
    skillCount: allSkillSummaries.length,
  });

  return {
    teamId,
    teamName: track.name,
    lead,
    metrics: {
      headcount: membersWithFlags.length,
      skillCount: allSkillSummaries.length,
      highRiskSkills: allSkillSummaries.filter((skill) => skill.risk === "high").length,
      singlePointsOfFailure: singleOwnerSet.size,
      artifactCount,
    },
    members: membersWithFlags,
    skills: topSkills,
    riskySkills,
    artifacts,
    insights,
    dataStatus: {
      hasEmployees: membersWithFlags.length > 0,
      hasSkills: allSkillSummaries.length > 0,
      hasArtifacts: artifacts.length > 0,
    },
    generatedAt: new Date().toISOString(),
  };
}

function resolveRisk(owners: number): RiskSeverity {
  if (owners <= 1) {
    return "high";
  }
  if (owners === 2) {
    return "medium";
  }
  return "low";
}

function severityWeight(severity: RiskSeverity) {
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  return 1;
}
