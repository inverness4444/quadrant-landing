import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, forbiddenError, internalError, respondWithApiError } from "@/services/apiError";
import { getSkillsOverview } from "@/services/analyticsService";
import { requireRole } from "@/services/rbac";

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

  try {
    const data = await getSkillsOverview({ workspaceId: context.workspace.id });
    return NextResponse.json({ ok: true, skills: data });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "analytics:skills" }));
  }
}
