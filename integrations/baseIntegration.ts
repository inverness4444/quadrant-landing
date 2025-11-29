import type { ArtifactAssigneeRole, ArtifactType } from "@/drizzle/schema";
import type { IntegrationType } from "@/integrations/types";

export type DemoArtifactPayload = {
  externalId: string;
  type: ArtifactType;
  title: string;
  summary: string;
  url?: string;
  createdAt?: string;
  updatedAt?: string;
  assignees: Array<{ employeeId: string; role?: ArtifactAssigneeRole }>;
  skills?: Array<{ skillId: string; confidence?: number }>;
};

export type IntegrationClient = {
  type: IntegrationType;
  syncDemoArtifacts(params: { workspaceId: string }): Promise<DemoArtifactPayload[]>;
};
