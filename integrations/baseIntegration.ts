import type { IntegrationType } from "@/integrations/types";

export type DemoArtifactPayload = {
  employeeId: string;
  type: "code" | "task" | "doc" | "review";
  title: string;
  description: string;
  link?: string;
  skills: Array<{ skillId: string; weight: number }>;
};

export type IntegrationClient = {
  type: IntegrationType;
  syncDemoArtifacts(params: { workspaceId: string }): Promise<DemoArtifactPayload[]>;
};
