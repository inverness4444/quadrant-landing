import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { computeTeamNeedsSummary } from "@/services/movesService";
import { requireRole } from "@/services/rbac";
import {
  authRequiredError,
  forbiddenError,
  internalError,
  notFoundError,
  respondWithApiError,
} from "@/services/apiError";

type RouteParams = { params: { teamId: string } };

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
    const summary = await computeTeamNeedsSummary({
      teamId: params.teamId,
      workspaceId: context.workspace.id,
    });
    if (!summary) {
      return respondWithApiError(notFoundError("Команда не найдена или нет данных для summary"));
    }
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "moves:team-summary", teamId: params.teamId }));
  }
}
