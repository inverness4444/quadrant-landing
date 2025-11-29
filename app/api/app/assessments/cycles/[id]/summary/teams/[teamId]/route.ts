import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { getTeamAssessmentSummary } from "@/services/assessmentService";
import { requireRole } from "@/services/rbac";
import {
  authRequiredError,
  forbiddenError,
  internalError,
  notFoundError,
  respondWithApiError,
} from "@/services/apiError";

type RouteParams = { params: { id: string; teamId: string } };

export async function GET(request: NextRequest, { params }: RouteParams) {
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
    const summary = await getTeamAssessmentSummary(params.id, params.teamId);
    if (!summary) {
      return respondWithApiError(notFoundError("Команда или цикл не найдены"));
    }
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "assessments:summary:team", cycleId: params.id, teamId: params.teamId }));
  }
}
