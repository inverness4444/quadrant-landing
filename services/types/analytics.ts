import type { EmployeeLevel, SkillType } from "@/drizzle/schema";

export type RiskSeverity = "low" | "medium" | "high";

export type SkillOwner = {
  employeeId: string;
  name: string;
  position: string;
  level: EmployeeLevel;
  skillLevel: number;
};

export type SkillSummary = {
  skillId: string;
  name: string;
  type: SkillType;
  averageLevel: number;
  peopleCount: number;
  coverage: number;
  busFactor: number;
  riskLevel: RiskSeverity;
  riskScore: number;
  artifactCount: number;
  keyHolders: SkillOwner[];
};

export type RiskItem = {
  id: string;
  kind: "skill" | "bus_factor" | "workload" | "transition";
  severity: RiskSeverity;
  title: string;
  description: string;
  metricValue?: number | null;
  metricLabel?: string;
  teamId?: string | null;
  affectedSkills?: string[];
  affectedEmployees: Array<{
    employeeId: string;
    name: string;
    position: string;
  }>;
};

export type TeamSkillProfile = {
  teamId: string | null;
  teamName: string;
  headcount: number;
  dominantSkills: Array<{
    skillId: string;
    name: string;
    averageLevel: number;
    coverage: number;
  }>;
  risks: RiskItem[];
};

export type WorkspaceSkillMap = {
  workspaceId: string;
  totalEmployees: number;
  totalSkills: number;
  skills: SkillSummary[];
  teams: TeamSkillProfile[];
  generatedAt: string;
};

export type EmployeeRiskProfile = {
  employeeId: string;
  name: string;
  position: string;
  level: EmployeeLevel;
  riskScore: number;
  criticalSkills: RiskItem[];
};

export type ReplacementCandidate = {
  employeeId: string;
  name: string;
  position: string;
  level: EmployeeLevel;
  similarityScore: number;
  readiness: "ready" | "stretch";
  overlapScore: number;
  sharedSkills: Array<{
    skillId: string;
    name: string;
    level: number;
    targetLevel: number;
  }>;
  missingSkills: Array<{
    skillId: string;
    name: string;
    targetLevel: number;
  }>;
  artifactEvidence: number;
};

export type GrowthPathSuggestion = {
  targetRoleId: string;
  targetRoleName: string;
  readinessScore: number;
  missingSkills: Array<{
    skillId: string | null;
    name: string;
    currentLevel: number | null;
    targetLevel: number;
  }>;
  recommendedActions: string[];
};

export type SkillRequirement = {
  skillId: string;
  minLevel?: number;
  weight?: number;
};

export type ProjectStaffingSuggestion = {
  employeeId: string;
  name: string;
  position: string;
  level: EmployeeLevel;
  fitScore: number;
  matchingSkills: Array<{
    skillId: string;
    name: string;
    level: number;
    requiredLevel: number;
    contribution: number;
  }>;
  missingSkills: Array<{
    skillId: string;
    name: string;
    requiredLevel: number;
  }>;
  riskFlags: string[];
  availability: "available" | "unknown";
};

export type ProjectStaffingResult = {
  candidates: ProjectStaffingSuggestion[];
  warnings: RiskItem[];
};
