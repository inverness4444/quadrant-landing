import type { EmployeeLevel, SkillType } from "@/drizzle/schema";
import type {
  ArtifactWithAssigneesAndSkills,
  ArtifactWithContext,
} from "@/services/types/artifact";
import type {
  EmployeeRiskProfile,
  GrowthPathSuggestion,
  ReplacementCandidate,
  RiskSeverity,
} from "@/services/types/analytics";

export type InsightKind = "risk" | "growth" | "workload" | "info";

export type InsightItem = {
  id: string;
  kind: InsightKind;
  text: string;
};

export type TeamSkillStat = {
  skillId: string;
  name: string;
  type: SkillType;
  owners: number;
  coverage: number;
  averageLevel: number;
  risk: RiskSeverity;
};

export type TeamMemberSummary = {
  id: string;
  name: string;
  position: string;
  level: EmployeeLevel;
  keySkills: number;
  supportingSkills: number;
  topSkills: string[];
  artifactCount: number;
  isSinglePoint: boolean;
};

export type TeamProfile = {
  teamId: string;
  teamName: string;
  lead: TeamMemberSummary | null;
  metrics: {
    headcount: number;
    skillCount: number;
    highRiskSkills: number;
    singlePointsOfFailure: number;
    artifactCount: number;
  };
  members: TeamMemberSummary[];
  skills: TeamSkillStat[];
  riskySkills: TeamSkillStat[];
  artifacts: ArtifactWithAssigneesAndSkills[];
  insights: InsightItem[];
  dataStatus: {
    hasEmployees: boolean;
    hasSkills: boolean;
    hasArtifacts: boolean;
  };
  generatedAt: string;
};

export type EmployeeSkillStat = {
  skillId: string;
  name: string;
  type: SkillType;
  level: number;
  artifactCount: number;
  isKey: boolean;
};

export type EmployeeProfile = {
  employee: {
    id: string;
    name: string;
    position: string;
    level: EmployeeLevel;
    teamId: string | null;
    teamName: string | null;
  };
  stats: {
    totalSkills: number;
    keySkills: number;
    supportingSkills: number;
    artifactCount: number;
    recentArtifacts: number;
    isSinglePoint: boolean;
  };
  skills: EmployeeSkillStat[];
  artifacts: ArtifactWithContext[];
  replacements: ReplacementCandidate[];
  growth: GrowthPathSuggestion[];
  riskProfile: EmployeeRiskProfile | null;
  insights: InsightItem[];
  generatedAt: string;
};
