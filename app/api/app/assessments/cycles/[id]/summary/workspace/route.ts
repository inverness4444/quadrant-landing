import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { getWorkspaceAssessmentSummary } from "@/services/assessmentService";
import { requireRole } from "@/services/rbac";
import {
  authRequiredError,
  forbiddenError,
  internalError,
  notFoundError,
  respondWithApiError,
} from "@/services/apiError";

type RouteParams = { params: { id: string } };

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
    const summary = await getWorkspaceAssessmentSummary(params.id, context.workspace.id);
    if (!summary) {
      return respondWithApiError(notFoundError("Цикл не найден"));
    }
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "assessments:summary:workspace", cycleId: params.id }));
  }
}
