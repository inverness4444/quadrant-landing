import { NextRequest, NextResponse } from "next/server";
import { listTemplates } from "@/services/programService";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, forbiddenError, internalError, respondWithApiError } from "@/services/apiError";
import { requireRole } from "@/services/rbac";

export async function GET(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  try {
    const templates = await listTemplates();
    return NextResponse.json({ ok: true, templates });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "programs:templates" }));
  }
}
