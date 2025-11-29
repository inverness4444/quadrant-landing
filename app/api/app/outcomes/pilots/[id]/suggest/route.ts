import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, forbiddenError, internalError, respondWithApiError } from "@/services/apiError";
import { suggestPilotMetrics } from "@/services/outcomeService";
import { requireRole } from "@/services/rbac";

type Params = { params: { id: string } };

export async function GET(request: NextRequest, { params }: Params) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  try {
    const metrics = await suggestPilotMetrics({ workspaceId: context.workspace.id, pilotId: params.id });
    return NextResponse.json({ ok: true, metrics });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "outcomes:pilot:suggest" }));
  }
}
