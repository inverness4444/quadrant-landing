import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, forbiddenError, internalError, respondWithApiError } from "@/services/apiError";
import { getFeedbackOverview } from "@/services/analyticsService";
import { requireRole } from "@/services/rbac";

function parseDate(param: string | null) {
  if (!param) return null;
  const d = new Date(param);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

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

  const { searchParams } = new URL(request.url);
  const since = parseDate(searchParams.get("since"));
  const until = parseDate(searchParams.get("until"));

  try {
    const data = await getFeedbackOverview({ workspaceId: context.workspace.id, since, until });
    return NextResponse.json({ ok: true, feedback: data });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "analytics:feedback" }));
  }
}
