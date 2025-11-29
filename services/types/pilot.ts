import type { PilotNoteType, PilotRunStatus, PilotRunStepStatus } from "@/drizzle/schema";

export type PilotRunStepDTO = {
  id: string;
  pilotRunId: string;
  key: string;
  title: string;
  description: string | null;
  orderIndex: number;
  status: PilotRunStepStatus;
  dueDate: string | null;
  completedAt: string | null;
};

export type PilotRunNoteDTO = {
  id: string;
  pilotRunId: string;
  authorUserId: string;
  type: PilotNoteType;
  title: string;
  body: string;
  relatedTeamId: string | null;
  relatedScenarioId: string | null;
  createdAt: string;
};

export type PilotRunDTO = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  status: PilotRunStatus;
  ownerUserId: string;
  targetCycleId: string | null;
  createdAt: string;
  updatedAt: string;
  teams: Array<{ teamId: string; teamName: string }>;
  steps: PilotRunStepDTO[];
  summaryProgress: {
    totalSteps: number;
    completedSteps: number;
    percent: number;
    lateStepsCount: number;
  };
};
