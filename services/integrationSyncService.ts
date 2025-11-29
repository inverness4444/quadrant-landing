import type { Integration } from "@/drizzle/schema";
import { updateIntegration } from "@/repositories/integrationRepository";
import { getIntegrationClient } from "@/integrations/registry";
import type { DemoArtifactPayload } from "@/integrations/baseIntegration";
import type { IntegrationType } from "@/integrations/types";
import { trackEvent } from "@/services/monitoring";
import { createOrUpdateArtifactFromIntegration } from "@/services/artifactService";

export async function createArtifactsFromPayloads(
  workspaceId: string,
  integrationId: string | null,
  payloads: DemoArtifactPayload[],
) {
  let created = 0;
  for (const payload of payloads) {
    await createOrUpdateArtifactFromIntegration({
      workspaceId,
      integrationId,
      externalId: payload.externalId,
      type: payload.type,
      title: payload.title,
      summary: payload.summary,
      url: payload.url,
      createdAt: payload.createdAt,
      updatedAt: payload.updatedAt,
      assignees: payload.assignees,
      skills: payload.skills,
    });
    created += 1;
  }
  return created;
}

export async function runIntegrationSync(integration: Integration) {
  const client = getIntegrationClient(integration.type as IntegrationType);
  const payloads = await client.syncDemoArtifacts({ workspaceId: integration.workspaceId });
  const created = await createArtifactsFromPayloads(integration.workspaceId, integration.id, payloads);
  await updateIntegration(integration.id, {
    lastSyncedAt: new Date().toISOString(),
    status: "connected",
  });
  trackEvent("integration_synced", { integrationId: integration.id, createdArtifacts: created });
  return { createdArtifactsCount: created };
}
