import type { Integration } from "@/drizzle/schema";
import { createArtifact, type ArtifactInput } from "@/repositories/artifactRepository";
import { updateIntegration } from "@/repositories/integrationRepository";
import { getIntegrationClient } from "@/integrations/registry";
import type { DemoArtifactPayload } from "@/integrations/baseIntegration";
import type { IntegrationType } from "@/integrations/types";
import { trackEvent } from "@/services/monitoring";

export async function createArtifactsFromPayloads(workspaceId: string, payloads: DemoArtifactPayload[]) {
  let created = 0;
  for (const payload of payloads) {
    const artifactPayload: ArtifactInput = {
      employeeId: payload.employeeId,
      type: payload.type,
      title: payload.title,
      description: payload.description,
      link: payload.link,
      skills: (payload.skills ?? []).map((skill) => ({
        skillId: skill.skillId,
        weight: skill.weight,
      })),
    };
    await createArtifact(workspaceId, artifactPayload);
    created += 1;
  }
  return created;
}

export async function runIntegrationSync(integration: Integration) {
  const client = getIntegrationClient(integration.type as IntegrationType);
  const payloads = await client.syncDemoArtifacts({ workspaceId: integration.workspaceId });
  const created = await createArtifactsFromPayloads(integration.workspaceId, payloads);
  await updateIntegration(integration.id, {
    lastSyncedAt: new Date().toISOString(),
    status: "connected",
  });
  trackEvent("integration_synced", { integrationId: integration.id, createdArtifacts: created });
  return { createdArtifactsCount: created };
}
