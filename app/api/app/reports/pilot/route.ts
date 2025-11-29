import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { getPilotDetailedReport } from "@/services/reportService";
import { requireMember } from "@/services/rbac";
import {
  authRequiredError,
  forbiddenError,
  internalError,
  notFoundError,
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
    const report = await getPilotDetailedReport(context.workspace.id);
    if (!report) {
      return respondWithApiError(notFoundError("Пилот ещё не запущен в этом workspace"));
    }
    return NextResponse.json(report);
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "reports:pilot" }));
  }
}
