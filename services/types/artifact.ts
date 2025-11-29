import type {
  ArtifactAssigneeRole,
  ArtifactType,
  IntegrationType,
} from "@/drizzle/schema";

export type ArtifactAssigneeInfo = {
  employeeId: string;
  name: string;
  position: string;
  role: ArtifactAssigneeRole;
};

export type ArtifactSkillInfo = {
  skillId: string;
  name: string;
  confidence: number;
};

export type ArtifactIntegrationInfo = {
  id: string | null;
  name: string | null;
  type: IntegrationType | null;
};

export type ArtifactWithAssigneesAndSkills = {
  id: string;
  workspaceId: string;
  type: ArtifactType;
  title: string;
  summary: string | null;
  url: string | null;
  createdAt: string;
  updatedAt: string;
  integration: ArtifactIntegrationInfo;
  assignees: ArtifactAssigneeInfo[];
  skills: ArtifactSkillInfo[];
};

export type ArtifactWithContext = ArtifactWithAssigneesAndSkills;
