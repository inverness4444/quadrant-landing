import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, forbiddenError, internalError, respondWithApiError } from "@/services/apiError";
import { buildExecutiveReportSnapshot } from "@/services/executiveReportService";
import { requireRole } from "@/services/rbac";

const querySchema = z.object({
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin", "hr"]);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  const qs = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
  try {
    const end = qs.periodEnd ? new Date(qs.periodEnd) : new Date();
    const start = qs.periodStart ? new Date(qs.periodStart) : new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
    const snapshot = await buildExecutiveReportSnapshot({ workspaceId: context.workspace.id, periodStart: start, periodEnd: end });
    return NextResponse.json({ ok: true, snapshot });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "reports:executive" }));
  }
}
