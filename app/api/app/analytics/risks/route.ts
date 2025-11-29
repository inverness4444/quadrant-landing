import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { getWorkspaceRiskOverview } from "@/services/riskService";
import { requireMember } from "@/services/rbac";
import {
  authRequiredError,
  forbiddenError,
  internalError,
  respondWithApiError,
} from "@/services/apiError";

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
    const risks = await getWorkspaceRiskOverview(context.workspace.id, 5);
    return NextResponse.json({ ok: true, risks });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "analytics:risks" }));
  }
}
