import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { getDashboardData } from "@/services/dashboardService";
import { authRequiredError, internalError, respondWithApiError } from "@/services/apiError";

export async function GET(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  try {
    const data = await getDashboardData({ workspaceId: context.workspace.id, userId: context.user.id });
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "dashboard" }));
  }
}
