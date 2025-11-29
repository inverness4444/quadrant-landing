import type {
  JobRoleImportance,
  MoveActionType,
  MovePriority,
  MoveScenarioStatus,
} from "@/drizzle/schema";

export type JobRoleSkillRequirementDTO = {
  id: string;
  jobRoleId: string;
  skillId: string;
  requiredLevel: number;
  importance: JobRoleImportance;
};

export type JobRoleDTO = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  levelBand: string | null;
  isLeadership: boolean;
  createdAt: string;
  updatedAt: string;
  requirements: JobRoleSkillRequirementDTO[];
};

export type MoveScenarioDTO = {
  id: string;
  workspaceId: string;
  title: string;
  description: string | null;
  status: MoveScenarioStatus;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  actions: MoveScenarioActionDTO[];
};

export type MoveScenarioActionDTO = {
  id: string;
  scenarioId: string;
  type: MoveActionType;
  teamId: string | null;
  fromEmployeeId: string | null;
  toEmployeeId: string | null;
  jobRoleId: string | null;
  skillId: string | null;
  priority: MovePriority;
  estimatedTimeMonths: number | null;
  estimatedCostHire: number | null;
  estimatedCostDevelop: number | null;
  impactOnRisk: number | null;
};

export type GapForRoleDTO = {
  employeeId: string;
  jobRoleId: string;
  skills: Array<{
    skillId: string;
    requiredLevel: number;
    currentLevel: number;
    gap: number;
  }>;
  aggregatedGapScore: number;
};

export type TeamRiskHiringSummaryDTO = {
  team: {
    teamId: string;
    teamName: string;
  };
  keySkills: Array<{
    skillId: string;
    skillName: string;
    riskScore: number;
    busFactor: number;
    owners: Array<{ employeeId: string; name: string }>;
    isSinglePointOfFailure: boolean;
  }>;
  roles: Array<{
    jobRoleId: string;
    jobRoleName: string;
    isLeadership: boolean;
    internalCandidatesCount: number;
    minGapScoreAmongCandidates: number | null;
    hireRequired: boolean;
    primarySkillsForRole: string[];
  }>;
  summaryMetrics: {
    totalRiskSkillsCount: number;
    singlePointOfFailureCount: number;
    rolesWithoutInternalCandidatesCount: number;
    suggestedHireCount: number;
    suggestedDevelopCount: number;
  };
};
