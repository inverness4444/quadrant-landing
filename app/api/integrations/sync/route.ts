import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { requireRole } from "@/services/rbac";
import {
  findIntegrationByWorkspaceAndType,
  updateIntegration,
} from "@/repositories/integrationRepository";
import { runIntegrationSync } from "@/services/integrationSyncService";
import { rateLimitRequest } from "@/services/rateLimit";
import {
  authRequiredError,
  forbiddenError,
  internalError,
  notFoundError,
  rateLimitedError,
  respondWithApiError,
  validationError,
} from "@/services/apiError";
import { trackError } from "@/services/monitoring";

const schema = z.object({
  type: z.enum(["github", "jira", "notion"]),
});

export async function POST(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  const integration = await findIntegrationByWorkspaceAndType(context.workspace.id, parsed.data.type);
  if (!integration) {
    return respondWithApiError(notFoundError("Интеграция не найдена"));
  }
  if (integration.status !== "connected") {
    return respondWithApiError(validationError({ type: ["Интеграция отключена"] }));
  }

  const limiter = rateLimitRequest(request, `integration-sync:${parsed.data.type}`, 3, 60_000);
  if (!limiter.allowed) {
    return respondWithApiError(rateLimitedError(limiter.retryAfter));
  }

  try {
    const result = await runIntegrationSync(integration);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    await updateIntegration(integration.id, { status: "error" });
    trackError(error, { route: "integrations/sync", integrationId: integration.id });
    return respondWithApiError(await internalError(error, { route: "integrations/sync" }));
  }
}
