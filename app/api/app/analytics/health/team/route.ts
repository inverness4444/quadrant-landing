import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, forbiddenError, internalError, respondWithApiError } from "@/services/apiError";
import { getTeamHealthSnapshot } from "@/services/analyticsService";
import { requireRole } from "@/services/rbac";

export async function GET(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    // если не owner/admin — пробуем менеджера
    const member = context.member;
    if (!member || member.role === "member") {
      return respondWithApiError(forbiddenError());
    }
  }
  try {
    const snapshot = await getTeamHealthSnapshot({ workspaceId: context.workspace.id, managerId: context.user.id });
    return NextResponse.json({ ok: true, snapshot });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "analytics:health-team" }));
  }
}

