import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { requireRole } from "@/services/rbac";
import { listIntegrationsByWorkspace } from "@/repositories/integrationRepository";
import { AVAILABLE_INTEGRATIONS } from "@/integrations/types";
import { authRequiredError, forbiddenError, respondWithApiError } from "@/services/apiError";

function parseConfig(raw: string | null | undefined) {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function GET(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  const records = await listIntegrationsByWorkspace(context.workspace.id);
  const map = new Map(records.map((record) => [record.type, record]));
  const payload = AVAILABLE_INTEGRATIONS.map((descriptor) => {
    const integration = map.get(descriptor.type);
    return {
      ...descriptor,
      integration: integration
        ? {
            id: integration.id,
            status: integration.status,
            lastSyncedAt: integration.lastSyncedAt,
            config: parseConfig(integration.config),
          }
        : null,
    };
  });
  return NextResponse.json({ ok: true, integrations: payload });
}
