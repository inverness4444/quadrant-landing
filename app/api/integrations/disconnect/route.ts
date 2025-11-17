import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { requireRole } from "@/services/rbac";
import { findIntegrationByWorkspaceAndType, updateIntegration } from "@/repositories/integrationRepository";
import {
  authRequiredError,
  forbiddenError,
  notFoundError,
  respondWithApiError,
  validationError,
} from "@/services/apiError";

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
  await updateIntegration(integration.id, { status: "disconnected" });
  return NextResponse.json({ ok: true });
}
