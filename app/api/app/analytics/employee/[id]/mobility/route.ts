import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { findPotentialReplacements, suggestGrowthPaths } from "@/services/mobilityService";
import { getEmployeeRiskProfile } from "@/services/riskService";
import { requireMember } from "@/services/rbac";
import {
  authRequiredError,
  forbiddenError,
  internalError,
  notFoundError,
  respondWithApiError,
} from "@/services/apiError";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
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
    const riskProfile = await getEmployeeRiskProfile(context.workspace.id, id);
    if (!riskProfile) {
      return respondWithApiError(notFoundError("Сотрудник не найден"));
    }
    const [replacements, growth] = await Promise.all([
      findPotentialReplacements(context.workspace.id, id, 5),
      suggestGrowthPaths(context.workspace.id, id, 3),
    ]);
    return NextResponse.json({
      ok: true,
      replacements,
      growth,
      riskProfile,
    });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "analytics:mobility" }));
  }
}
