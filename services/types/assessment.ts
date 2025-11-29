import type {
  AssessmentFinalStatus,
  AssessmentManagerStatus,
  AssessmentSelfStatus,
  AssessmentSkillStatus,
  AssessmentStatus,
} from "@/drizzle/schema";

export type AssessmentCycleDTO = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  status: AssessmentStatus;
  startsAt: string | null;
  endsAt: string | null;
  teamIds: string[];
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type AssessmentParticipantDTO = {
  id: string;
  cycleId: string;
  employeeId: string;
  selfStatus: AssessmentSelfStatus;
  managerStatus: AssessmentManagerStatus;
  finalStatus: AssessmentFinalStatus;
  managerEmployeeId: string | null;
  updatedAt: string;
};

export type SkillAssessmentDTO = {
  id: string;
  cycleId: string;
  employeeId: string;
  skillId: string;
  selfLevel: number | null;
  managerLevel: number | null;
  finalLevel: number | null;
  selfComment: string | null;
  managerComment: string | null;
  finalComment: string | null;
  status: AssessmentSkillStatus;
  updatedAt: string;
};

export type EmployeeAssessmentSummaryDTO = {
  employeeId: string;
  name: string;
  teamId: string | null;
  selfProgress: number;
  finalProgress: number;
  averageGap: number;
};

export type TeamAssessmentSummaryDTO = {
  teamId: string;
  teamName: string;
  averageGap: number;
  finalizedPercent: number;
  selfSubmittedPercent: number;
};

export type WorkspaceAssessmentSummaryDTO = {
  cycleId: string;
  participants: number;
  finalizedPercent: number;
  averageGap: number;
  teams: TeamAssessmentSummaryDTO[];
};
