import { GithubIntegrationClient } from "@/integrations/githubIntegration";
import { JiraIntegrationClient } from "@/integrations/jiraIntegration";
import { NotionIntegrationClient } from "@/integrations/notionIntegration";
import type { IntegrationClient } from "@/integrations/baseIntegration";
import type { IntegrationType } from "@/integrations/types";

const clients: Record<IntegrationType, IntegrationClient> = {
  github: new GithubIntegrationClient(),
  jira: new JiraIntegrationClient(),
  notion: new NotionIntegrationClient(),
};

export function getIntegrationClient(type: IntegrationType): IntegrationClient {
  const client = clients[type];
  if (!client) {
    throw new Error(`Unsupported integration: ${type}`);
  }
  return client;
}
