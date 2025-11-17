import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { requireMember } from "@/services/rbac";
import {
  getEmployeesRiskList,
  getTopSkills,
  getWeakSkills,
  getWorkspaceOverview,
} from "@/services/analyticsService";
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
    const [overview, topSkills, weakSkills, riskEmployees] = await Promise.all([
      getWorkspaceOverview(context.workspace.id),
      getTopSkills(context.workspace.id, 5),
      getWeakSkills(context.workspace.id, 5),
      getEmployeesRiskList(context.workspace.id, 5),
    ]);
    return NextResponse.json({
      ok: true,
      overview,
      topSkills,
      weakSkills,
      riskEmployees,
    });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "dashboard" }));
  }
}
