import type {
  QuestAssignmentStatus,
  QuestGoalType,
  QuestPriority,
  QuestStatus,
  QuestStepStatus,
} from "@/drizzle/schema";

export type QuestStepDTO = {
  id: string;
  questId: string;
  title: string;
  description: string;
  order: number;
  required: boolean;
  relatedSkillId: string | null;
  suggestedArtifactsCount: number | null;
};

export type QuestDTO = {
  id: string;
  workspaceId: string;
  templateId: string | null;
  title: string;
  description: string;
  status: QuestStatus;
  ownerEmployeeId: string;
  relatedTeamId: string | null;
  priority: QuestPriority;
  goalType: QuestGoalType;
  createdAt: string;
  updatedAt: string;
};

export type QuestWithStepsDTO = QuestDTO & {
  steps: QuestStepDTO[];
};

export type StepProgressDTO = {
  id: string;
  questAssignmentId: string;
  stepId: string;
  status: QuestStepStatus;
  notes: string | null;
  updatedAt: string;
};

export type QuestAssignmentDTO = {
  id: string;
  questId: string;
  employeeId: string;
  status: QuestAssignmentStatus;
  startedAt: string | null;
  completedAt: string | null;
  mentorEmployeeId: string | null;
};

export type QuestAssignmentWithProgressDTO = QuestAssignmentDTO & {
  steps: StepProgressDTO[];
  quest?: QuestWithStepsDTO;
};

export type SuggestedQuestDraftDTO = {
  title: string;
  description: string;
  skills: Array<{ skillId: string; name: string }>;
  teams: Array<{ teamId: string | null; teamName: string }>;
  affectedEmployees: Array<{ employeeId: string; name: string }>;
};
