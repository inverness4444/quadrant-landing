import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import {
  deleteIntegration,
  findIntegrationById,
  updateIntegration,
} from "@/repositories/integrationRepository";
import { requireRole } from "@/services/rbac";
import {
  authRequiredError,
  forbiddenError,
  internalError,
  notFoundError,
  respondWithApiError,
  validationError,
} from "@/services/apiError";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  status: z.enum(["connected", "disconnected", "error"]).optional(),
  config: z.union([z.string(), z.record(z.any())]).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  const integration = await findIntegrationById(params.id);
  if (!integration || integration.workspaceId !== context.workspace.id) {
    return respondWithApiError(notFoundError("Интеграция не найдена"));
  }
  const payload = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  try {
    const updated = await updateIntegration(integration.id, parsed.data);
    return NextResponse.json({ ok: true, integration: updated });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "app/integrations:update" }));
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  const integration = await findIntegrationById(params.id);
  if (!integration || integration.workspaceId !== context.workspace.id) {
    return respondWithApiError(notFoundError("Интеграция не найдена"));
  }
  try {
    await deleteIntegration(integration.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "app/integrations:delete" }));
  }
}
