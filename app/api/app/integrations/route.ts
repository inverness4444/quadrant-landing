import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import {
  createIntegration,
  listIntegrationsByWorkspace,
} from "@/repositories/integrationRepository";
import { requireMember, requireRole } from "@/services/rbac";
import { canAddIntegration } from "@/services/planLimits";
import {
  authRequiredError,
  forbiddenError,
  internalError,
  planLimitError,
  respondWithApiError,
  validationError,
} from "@/services/apiError";

const integrationTypeEnum = z.enum(["github", "jira", "notion", "linear", "custom"]);

const createSchema = z.object({
  type: integrationTypeEnum,
  name: z.string().min(2),
  config: z.union([z.string(), z.record(z.any())]).optional(),
});

export async function GET(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  try {
    await requireMember(context.workspace.id, context.user.id);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  try {
    const integrations = await listIntegrationsByWorkspace(context.workspace.id);
    return NextResponse.json({ ok: true, integrations });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "app/integrations:list" }));
  }
}

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
  const payload = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  const check = await canAddIntegration(context.workspace.id);
  if (!check.allowed) {
    return respondWithApiError(planLimitError(check.reason ?? "Достигнут лимит интеграций"));
  }
  try {
    const integration = await createIntegration({
      workspaceId: context.workspace.id,
      type: parsed.data.type,
      name: parsed.data.name,
      config: parsed.data.config ?? {},
      status: "connected",
    });
    return NextResponse.json({ ok: true, integration });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "app/integrations:create" }));
  }
}
