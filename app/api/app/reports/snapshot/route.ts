import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { getWorkspaceSnapshotReport } from "@/services/reportService";
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
    const report = await getWorkspaceSnapshotReport(context.workspace.id);
    return NextResponse.json(report);
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "reports:snapshot" }));
  }
}
